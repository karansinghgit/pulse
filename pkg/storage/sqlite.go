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
