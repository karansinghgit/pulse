package storage

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/karansingh/pulse/pkg/models"
	_ "github.com/mattn/go-sqlite3" // SQLite driver
)

// SQLiteStorage implements the Storage interface using SQLite
type SQLiteStorage struct {
	db *sql.DB
}

// NewSQLiteStorage creates a new SQLite storage with the given path and initializes tables
func NewSQLiteStorage(dbPath string) (*SQLiteStorage, error) {
	// Open database with WAL mode enabled
	db, err := sql.Open("sqlite3", dbPath+"?_journal=WAL&_timeout=5000")
	if err != nil {
		return nil, fmt.Errorf("failed to open SQLite database: %w", err)
	}

	// Test connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to connect to SQLite database: %w", err)
	}

	storage := &SQLiteStorage{db: db}

	// Initialize database schema
	if err := storage.initializeSchema(); err != nil {
		return nil, fmt.Errorf("failed to initialize database schema: %w", err)
	}

	return storage, nil
}

// initializeSchema creates the necessary tables if they don't exist
func (s *SQLiteStorage) initializeSchema() error {
	// Create logs table
	_, err := s.db.Exec(`
	CREATE TABLE IF NOT EXISTS logs (
		id TEXT PRIMARY KEY,
		timestamp DATETIME NOT NULL,
		service TEXT NOT NULL,
		level TEXT NOT NULL,
		message TEXT NOT NULL,
		tags TEXT,
		trace_id TEXT,
		span_id TEXT,
		env TEXT,
		host TEXT,
		source TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	)`)
	if err != nil {
		return fmt.Errorf("failed to create logs table: %w", err)
	}

	// Create metrics table
	_, err = s.db.Exec(`
	CREATE TABLE IF NOT EXISTS metrics (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		value REAL NOT NULL,
		timestamp DATETIME NOT NULL,
		type TEXT NOT NULL,
		service TEXT NOT NULL,
		tags TEXT,
		trace_id TEXT,
		env TEXT,
		host TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	)`)
	if err != nil {
		return fmt.Errorf("failed to create metrics table: %w", err)
	}

	// Create histogram_metrics table for histogram data
	_, err = s.db.Exec(`
	CREATE TABLE IF NOT EXISTS histogram_metrics (
		id TEXT PRIMARY KEY,
		metric_id TEXT NOT NULL,
		buckets TEXT NOT NULL, -- JSON array of {upper_bound, count}
		sum REAL NOT NULL,
		count INTEGER NOT NULL,
		percentiles TEXT, -- JSON object of percentile -> value
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (metric_id) REFERENCES metrics(id)
	)`)
	if err != nil {
		return fmt.Errorf("failed to create histogram_metrics table: %w", err)
	}

	// Create spans table
	_, err = s.db.Exec(`
	CREATE TABLE IF NOT EXISTS spans (
		id TEXT PRIMARY KEY,
		trace_id TEXT NOT NULL,
		parent_id TEXT,
		name TEXT NOT NULL,
		service TEXT NOT NULL,
		start_time DATETIME NOT NULL,
		end_time DATETIME,
		duration INTEGER,
		status TEXT,
		tags TEXT,
		logs TEXT, -- JSON array of {timestamp, fields}
		env TEXT,
		host TEXT,
		is_finished BOOLEAN DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	)`)
	if err != nil {
		return fmt.Errorf("failed to create spans table: %w", err)
	}

	// Create traces table
	_, err = s.db.Exec(`
	CREATE TABLE IF NOT EXISTS traces (
		id TEXT PRIMARY KEY,
		root_span_id TEXT NOT NULL,
		status TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (root_span_id) REFERENCES spans(id)
	)`)
	if err != nil {
		return fmt.Errorf("failed to create traces table: %w", err)
	}

	// Create indexes
	_, err = s.db.Exec(`
	CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
	CREATE INDEX IF NOT EXISTS idx_logs_service ON logs(service);
	CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
	CREATE INDEX IF NOT EXISTS idx_logs_trace_id ON logs(trace_id);
	
	CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp);
	CREATE INDEX IF NOT EXISTS idx_metrics_name ON metrics(name);
	CREATE INDEX IF NOT EXISTS idx_metrics_service ON metrics(service);
	
	CREATE INDEX IF NOT EXISTS idx_spans_trace_id ON spans(trace_id);
	CREATE INDEX IF NOT EXISTS idx_spans_service ON spans(service);
	CREATE INDEX IF NOT EXISTS idx_spans_start_time ON spans(start_time);
	`)
	if err != nil {
		return fmt.Errorf("failed to create indexes: %w", err)
	}

	return nil
}

// Close closes the database connection
func (s *SQLiteStorage) Close() error {
	return s.db.Close()
}

// SaveLog saves a log entry to the database
func (s *SQLiteStorage) SaveLog(log *models.LogEntry) error {
	// Convert tags to JSON
	tagsJSON, err := json.Marshal(log.Tags)
	if err != nil {
		return fmt.Errorf("failed to marshal tags: %w", err)
	}

	// Generate ID if not provided
	if log.ID == "" {
		log.ID = fmt.Sprintf("log-%d", time.Now().UnixNano())
	}

	// Insert into database
	_, err = s.db.Exec(`
		INSERT INTO logs (id, timestamp, service, level, message, tags, trace_id, span_id, env, host, source)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		log.ID, log.Timestamp, log.Service, log.Level, log.Message, tagsJSON, log.TraceID, log.SpanID, log.Env, log.Host, log.Source)

	if err != nil {
		return fmt.Errorf("failed to insert log: %w", err)
	}

	return nil
}

// QueryLogs queries logs from the database based on the given parameters
func (s *SQLiteStorage) QueryLogs(query *models.QueryParams) (map[string]interface{}, error) {
	// Build the SQL query to count total items
	countQuery := `
		SELECT COUNT(*) as total
		FROM logs
		WHERE 1=1`

	// Create args slice for parameterized query
	countArgs := []interface{}{}

	// Add filters for count query
	if query.Service != "" {
		countQuery += " AND service = ?"
		countArgs = append(countArgs, query.Service)
	}

	if query.Level != "" {
		countQuery += " AND level = ?"
		countArgs = append(countArgs, query.Level)
	}

	if query.Since.IsZero() == false {
		countQuery += " AND timestamp >= ?"
		countArgs = append(countArgs, query.Since)
	}

	if query.Until.IsZero() == false {
		countQuery += " AND timestamp <= ?"
		countArgs = append(countArgs, query.Until)
	}

	if query.TraceID != "" {
		countQuery += " AND trace_id = ?"
		countArgs = append(countArgs, query.TraceID)
	}

	// Add search filter if provided
	if query.Search != "" {
		countQuery += " AND (message LIKE ? OR service LIKE ?)"
		searchTerm := "%" + query.Search + "%"
		countArgs = append(countArgs, searchTerm, searchTerm)
	}

	// Execute the count query
	var totalItems int
	err := s.db.QueryRow(countQuery, countArgs...).Scan(&totalItems)
	if err != nil {
		return nil, fmt.Errorf("failed to count logs: %w", err)
	}

	// Build the SQL query for data
	sqlQuery := `
		SELECT id, timestamp, service, level, message, tags, trace_id, span_id, env, host, source
		FROM logs
		WHERE 1=1`

	// Create args slice for parameterized query
	args := []interface{}{}

	// Add filters based on query parameters
	if query.Service != "" {
		sqlQuery += " AND service = ?"
		args = append(args, query.Service)
	}

	if query.Level != "" {
		sqlQuery += " AND level = ?"
		args = append(args, query.Level)
	}

	if query.Since.IsZero() == false {
		sqlQuery += " AND timestamp >= ?"
		args = append(args, query.Since)
	}

	if query.Until.IsZero() == false {
		sqlQuery += " AND timestamp <= ?"
		args = append(args, query.Until)
	}

	if query.TraceID != "" {
		sqlQuery += " AND trace_id = ?"
		args = append(args, query.TraceID)
	}

	// Add search filter if provided
	if query.Search != "" {
		sqlQuery += " AND (message LIKE ? OR service LIKE ?)"
		searchTerm := "%" + query.Search + "%"
		args = append(args, searchTerm, searchTerm)
	}

	// Add order by
	if query.OrderBy != "" {
		sqlQuery += fmt.Sprintf(" ORDER BY %s", query.OrderBy)
		if query.OrderDesc {
			sqlQuery += " DESC"
		} else {
			sqlQuery += " ASC"
		}
	} else {
		sqlQuery += " ORDER BY timestamp DESC"
	}

	// Add offset for pagination
	if query.Offset > 0 {
		sqlQuery += " OFFSET ?"
		args = append(args, query.Offset)
	}

	// Add limit
	if query.Limit > 0 {
		sqlQuery += " LIMIT ?"
		args = append(args, query.Limit)
	} else {
		// Default limit to prevent massive result sets
		sqlQuery += " LIMIT 100"
	}

	// Execute the query
	rows, err := s.db.Query(sqlQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query logs: %w", err)
	}
	defer rows.Close()

	// Process the results
	logs := []map[string]interface{}{}
	for rows.Next() {
		var (
			id        string
			timestamp time.Time
			service   string
			level     string
			message   string
			tagsJSON  string
			traceID   sql.NullString
			spanID    sql.NullString
			env       sql.NullString
			host      sql.NullString
			source    sql.NullString
		)

		if err := rows.Scan(&id, &timestamp, &service, &level, &message, &tagsJSON, &traceID, &spanID, &env, &host, &source); err != nil {
			return nil, fmt.Errorf("failed to scan log row: %w", err)
		}

		// Parse the tags
		var tags map[string]string
		if tagsJSON != "" {
			if err := json.Unmarshal([]byte(tagsJSON), &tags); err != nil {
				return nil, fmt.Errorf("failed to unmarshal tags: %w", err)
			}
		}

		// Create the log map
		logMap := map[string]interface{}{
			"id":        id,
			"timestamp": timestamp.Format(time.RFC3339),
			"service":   service,
			"level":     level,
			"message":   message,
		}

		// Add optional fields if present
		if tags != nil && len(tags) > 0 {
			logMap["tags"] = tags
		}

		if traceID.Valid {
			logMap["trace_id"] = traceID.String
		}

		if spanID.Valid {
			logMap["span_id"] = spanID.String
		}

		if env.Valid {
			logMap["env"] = env.String
		}

		if host.Valid {
			logMap["host"] = host.String
		}

		if source.Valid {
			logMap["source"] = source.String
		}

		logs = append(logs, logMap)
	}

	// Check for errors after iteration
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating log rows: %w", err)
	}

	// Calculate pagination information
	pageSize := query.Limit
	if pageSize <= 0 {
		pageSize = 100 // Default limit
	}

	totalPages := (totalItems + pageSize - 1) / pageSize

	// Return results with pagination info
	return map[string]interface{}{
		"logs": logs,
		"pagination": map[string]interface{}{
			"total_items": totalItems,
			"total_pages": totalPages,
			"page_size":   pageSize,
			"offset":      query.Offset,
		},
	}, nil
}

// SaveMetric saves a metric to the database
func (s *SQLiteStorage) SaveMetric(metric *models.Metric) error {
	// Convert tags to JSON
	tagsJSON, err := json.Marshal(metric.Tags)
	if err != nil {
		return fmt.Errorf("failed to marshal tags: %w", err)
	}

	// Generate ID if not provided
	if metric.ID == "" {
		metric.ID = fmt.Sprintf("metric-%d", time.Now().UnixNano())
	}

	// Begin transaction
	tx, err := s.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Insert into metrics table
	_, err = tx.Exec(`
		INSERT INTO metrics (id, name, value, timestamp, type, service, tags, trace_id, env, host)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		metric.ID, metric.Name, metric.Value, metric.Timestamp, metric.Type, metric.Service,
		tagsJSON, metric.TraceID, metric.Env, metric.Host)

	if err != nil {
		return fmt.Errorf("failed to insert metric: %w", err)
	}

	// If this is a histogram metric, save the histogram data
	if histogram, ok := interface{}(metric).(*models.HistogramMetric); ok {
		bucketsJSON, err := json.Marshal(histogram.Buckets)
		if err != nil {
			return fmt.Errorf("failed to marshal buckets: %w", err)
		}

		percentilesJSON, err := json.Marshal(histogram.Percentile)
		if err != nil {
			return fmt.Errorf("failed to marshal percentiles: %w", err)
		}

		// Insert into histogram_metrics table
		_, err = tx.Exec(`
			INSERT INTO histogram_metrics (id, metric_id, buckets, sum, count, percentiles)
			VALUES (?, ?, ?, ?, ?, ?)`,
			fmt.Sprintf("hist-%d", time.Now().UnixNano()), metric.ID, bucketsJSON,
			histogram.Sum, histogram.Count, percentilesJSON)

		if err != nil {
			return fmt.Errorf("failed to insert histogram data: %w", err)
		}
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// SaveSpan saves a span to the database
func (s *SQLiteStorage) SaveSpan(span *models.Span) error {
	// Convert tags and logs to JSON
	tagsJSON, err := json.Marshal(span.Tags)
	if err != nil {
		return fmt.Errorf("failed to marshal tags: %w", err)
	}

	logsJSON, err := json.Marshal(span.Logs)
	if err != nil {
		return fmt.Errorf("failed to marshal logs: %w", err)
	}

	// Insert into database
	_, err = s.db.Exec(`
		INSERT OR REPLACE INTO spans (
			id, trace_id, parent_id, name, service, start_time, end_time, 
			duration, status, tags, logs, env, host, is_finished
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		span.ID, span.TraceID, span.ParentID, span.Name, span.Service,
		span.StartTime, span.EndTime, span.Duration, span.Status,
		tagsJSON, logsJSON, span.Env, span.Host, span.IsFinished)

	if err != nil {
		return fmt.Errorf("failed to insert span: %w", err)
	}

	return nil
}

// SaveTrace saves a trace to the database
func (s *SQLiteStorage) SaveTrace(trace *models.Trace) error {
	// Begin transaction
	tx, err := s.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Save all spans in the trace
	for _, span := range trace.Spans {
		// Convert tags and logs to JSON
		tagsJSON, err := json.Marshal(span.Tags)
		if err != nil {
			return fmt.Errorf("failed to marshal tags: %w", err)
		}

		logsJSON, err := json.Marshal(span.Logs)
		if err != nil {
			return fmt.Errorf("failed to marshal logs: %w", err)
		}

		// Insert span
		_, err = tx.Exec(`
			INSERT OR REPLACE INTO spans (
				id, trace_id, parent_id, name, service, start_time, end_time, 
				duration, status, tags, logs, env, host, is_finished
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			span.ID, span.TraceID, span.ParentID, span.Name, span.Service,
			span.StartTime, span.EndTime, span.Duration, span.Status,
			tagsJSON, logsJSON, span.Env, span.Host, span.IsFinished)

		if err != nil {
			return fmt.Errorf("failed to insert span: %w", err)
		}
	}

	// Insert trace record
	_, err = tx.Exec(`
		INSERT OR REPLACE INTO traces (id, root_span_id, status)
		VALUES (?, ?, ?)`,
		trace.ID, trace.Root.ID, trace.Status)

	if err != nil {
		return fmt.Errorf("failed to insert trace: %w", err)
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// QueryMetrics queries metrics from storage
func (s *SQLiteStorage) QueryMetrics(query *models.QueryParams) ([]map[string]interface{}, error) {
	// Build the SQL query
	sqlQuery := `
		SELECT id, timestamp, service, name, value, type, tags
		FROM metrics
		WHERE 1=1`

	// Create args slice for parameterized query
	args := []interface{}{}

	// Add filters based on query parameters
	if query.Service != "" {
		sqlQuery += " AND service = ?"
		args = append(args, query.Service)
	}

	if query.Since.IsZero() == false {
		sqlQuery += " AND timestamp >= ?"
		args = append(args, query.Since)
	}

	if query.Until.IsZero() == false {
		sqlQuery += " AND timestamp <= ?"
		args = append(args, query.Until)
	}

	// Add search filter if provided
	if query.Search != "" {
		sqlQuery += " AND (name LIKE ? OR service LIKE ?)"
		searchTerm := "%" + query.Search + "%"
		args = append(args, searchTerm, searchTerm)
	}

	// Add order by
	sqlQuery += " ORDER BY timestamp DESC"

	// Add limit
	if query.Limit > 0 {
		sqlQuery += " LIMIT ?"
		args = append(args, query.Limit)
	} else {
		// Default limit to prevent massive result sets
		sqlQuery += " LIMIT 100"
	}

	// Execute the query
	rows, err := s.db.Query(sqlQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query metrics: %w", err)
	}
	defer rows.Close()

	// Process the results
	metrics := []map[string]interface{}{}
	for rows.Next() {
		var (
			id         string
			timestamp  time.Time
			service    string
			name       string
			value      float64
			metricType string
			tagsJSON   string
		)

		if err := rows.Scan(&id, &timestamp, &service, &name, &value, &metricType, &tagsJSON); err != nil {
			return nil, fmt.Errorf("failed to scan metric row: %w", err)
		}

		// Parse the tags
		var tags map[string]string
		if tagsJSON != "" {
			if err := json.Unmarshal([]byte(tagsJSON), &tags); err != nil {
				return nil, fmt.Errorf("failed to unmarshal tags: %w", err)
			}
		}

		// Create the metric map
		metricMap := map[string]interface{}{
			"id":        id,
			"timestamp": timestamp.Format(time.RFC3339),
			"service":   service,
			"name":      name,
			"value":     value,
			"type":      metricType,
		}

		// Add optional fields if present
		if tags != nil && len(tags) > 0 {
			metricMap["tags"] = tags
		}

		metrics = append(metrics, metricMap)
	}

	// Check for errors after iteration
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating metric rows: %w", err)
	}

	return metrics, nil
}

// QueryTraces queries traces from the database based on the given parameters
func (s *SQLiteStorage) QueryTraces(query *models.QueryParams) ([]map[string]interface{}, error) {
	// Since traces are collections of spans, we'll query spans and group by trace_id
	sqlQuery := `
		SELECT id, trace_id, parent_id, service, name, start_time, duration, status, tags
		FROM spans
		WHERE 1=1`

	// Create args slice for parameterized query
	args := []interface{}{}

	// Add filters based on query parameters
	if query.Service != "" {
		sqlQuery += " AND service = ?"
		args = append(args, query.Service)
	}

	if query.Since.IsZero() == false {
		sqlQuery += " AND start_time >= ?"
		args = append(args, query.Since)
	}

	if query.Until.IsZero() == false {
		sqlQuery += " AND start_time <= ?"
		args = append(args, query.Until)
	}

	if query.TraceID != "" {
		sqlQuery += " AND trace_id = ?"
		args = append(args, query.TraceID)
	}

	// Add search filter if provided
	if query.Search != "" {
		sqlQuery += " AND (name LIKE ? OR service LIKE ?)"
		searchTerm := "%" + query.Search + "%"
		args = append(args, searchTerm, searchTerm)
	}

	// Add order by
	sqlQuery += " ORDER BY start_time DESC"

	// Execute the query
	rows, err := s.db.Query(sqlQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query spans: %w", err)
	}
	defer rows.Close()

	// Group spans by trace ID
	traceMap := make(map[string]map[string]interface{})
	for rows.Next() {
		var (
			id        string
			traceID   string
			parentID  sql.NullString
			service   string
			name      string
			startTime time.Time
			duration  int64
			status    string
			tagsJSON  string
		)

		if err := rows.Scan(&id, &traceID, &parentID, &service, &name, &startTime, &duration, &status, &tagsJSON); err != nil {
			return nil, fmt.Errorf("failed to scan span row: %w", err)
		}

		// Parse the tags
		var tags map[string]string
		if tagsJSON != "" {
			if err := json.Unmarshal([]byte(tagsJSON), &tags); err != nil {
				return nil, fmt.Errorf("failed to unmarshal tags: %w", err)
			}
		}

		// If this is a root span (no parent), create a trace entry
		if !parentID.Valid || parentID.String == "" {
			traceMap[traceID] = map[string]interface{}{
				"id":          traceID,
				"start_time":  startTime.Format(time.RFC3339),
				"service":     service,
				"name":        name,
				"duration_ms": duration,
				"status":      status,
			}

			// Add tags to the trace
			if tags != nil && len(tags) > 0 {
				traceMap[traceID]["tags"] = tags
			}
		}
	}

	// Convert map to array
	traces := make([]map[string]interface{}, 0, len(traceMap))
	for _, trace := range traceMap {
		traces = append(traces, trace)
	}

	// Apply limit
	if query.Limit > 0 && len(traces) > query.Limit {
		traces = traces[:query.Limit]
	}

	return traces, nil
}

// QuerySpans queries spans from the database based on the given parameters
func (s *SQLiteStorage) QuerySpans(query *models.QueryParams) ([]map[string]interface{}, error) {
	// Build the SQL query
	sqlQuery := `
		SELECT id, trace_id, parent_id, service, name, start_time, duration, status, tags
		FROM spans
		WHERE 1=1`

	// Create args slice for parameterized query
	args := []interface{}{}

	// Add filters based on query parameters
	if query.Service != "" {
		sqlQuery += " AND service = ?"
		args = append(args, query.Service)
	}

	if query.Since.IsZero() == false {
		sqlQuery += " AND start_time >= ?"
		args = append(args, query.Since)
	}

	if query.Until.IsZero() == false {
		sqlQuery += " AND start_time <= ?"
		args = append(args, query.Until)
	}

	if query.TraceID != "" {
		sqlQuery += " AND trace_id = ?"
		args = append(args, query.TraceID)
	}

	// Add search filter if provided
	if query.Search != "" {
		sqlQuery += " AND (name LIKE ? OR service LIKE ?)"
		searchTerm := "%" + query.Search + "%"
		args = append(args, searchTerm, searchTerm)
	}

	// Add order by
	sqlQuery += " ORDER BY start_time DESC"

	// Add limit
	if query.Limit > 0 {
		sqlQuery += " LIMIT ?"
		args = append(args, query.Limit)
	} else {
		// Default limit to prevent massive result sets
		sqlQuery += " LIMIT 100"
	}

	// Execute the query
	rows, err := s.db.Query(sqlQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query spans: %w", err)
	}
	defer rows.Close()

	// Process the results
	spans := []map[string]interface{}{}
	for rows.Next() {
		var (
			id        string
			traceID   string
			parentID  sql.NullString
			service   string
			name      string
			startTime time.Time
			duration  int64
			status    string
			tagsJSON  string
		)

		if err := rows.Scan(&id, &traceID, &parentID, &service, &name, &startTime, &duration, &status, &tagsJSON); err != nil {
			return nil, fmt.Errorf("failed to scan span row: %w", err)
		}

		// Parse the tags
		var tags map[string]string
		if tagsJSON != "" {
			if err := json.Unmarshal([]byte(tagsJSON), &tags); err != nil {
				return nil, fmt.Errorf("failed to unmarshal tags: %w", err)
			}
		}

		// Create the span map
		spanMap := map[string]interface{}{
			"id":          id,
			"trace_id":    traceID,
			"start_time":  startTime.Format(time.RFC3339),
			"service":     service,
			"name":        name,
			"duration_ms": duration,
			"status":      status,
		}

		// Add optional fields if present
		if parentID.Valid {
			spanMap["parent_id"] = parentID.String
		}

		if tags != nil && len(tags) > 0 {
			spanMap["tags"] = tags
		}

		spans = append(spans, spanMap)
	}

	// Check for errors after iteration
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating span rows: %w", err)
	}

	return spans, nil
}

// GetServices returns a list of all unique service names
func (s *SQLiteStorage) GetServices() ([]string, error) {
	// Query unique services from logs, metrics, and spans
	sqlQuery := `
		SELECT DISTINCT service FROM (
			SELECT service FROM logs
			UNION
			SELECT service FROM metrics
			UNION
			SELECT service FROM spans
		) ORDER BY service
	`

	rows, err := s.db.Query(sqlQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to query services: %w", err)
	}
	defer rows.Close()

	// Process the results
	services := []string{}
	for rows.Next() {
		var service string
		if err := rows.Scan(&service); err != nil {
			return nil, fmt.Errorf("failed to scan service row: %w", err)
		}
		services = append(services, service)
	}

	// Check for errors after iteration
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating service rows: %w", err)
	}

	return services, nil
}
