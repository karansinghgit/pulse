package models

import (
	"time"
)

// QueryParams represents the parameters for querying data
type QueryParams struct {
	Service   string            // Service name to filter by
	Level     string            // Log level to filter by (for logs)
	TraceID   string            // Trace ID to filter by
	Search    string            // Free text search query
	Limit     int               // Maximum number of results
	Since     time.Time         // Start time for the query
	Until     time.Time         // End time for the query
	Filters   map[string]string // Additional filters
	OrderBy   string            // Field to order by
	OrderDesc bool              // True for descending order
	Offset    int               // For pagination
}
