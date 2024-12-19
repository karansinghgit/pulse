package storage

import (
	"fmt"
	"time"

	"github.com/karansingh/pulse/pkg/models"
)

// MetricQuery defines the parameters for querying metrics
type MetricQuery struct {
	Name          string            // Metric name
	Service       string            // Service name
	Tags          map[string]string // Tags to filter by
	From          time.Time         // Start time
	To            time.Time         // End time
	Resolution    string            // Time resolution for aggregation (e.g., "1m", "5m", "1h")
	Aggregation   string            // Aggregation function (e.g., "avg", "sum", "min", "max", "count", "p50", "p90", "p99")
	IncludeLabels []string          // Labels to include in results (for grouping)
}

// MetricAggregation holds aggregated metric data
type MetricAggregation struct {
	Name       string                  // Metric name
	Type       models.MetricType       // Metric type
	TimeSeries []MetricTimeSeriesPoint // Time series data
	Labels     map[string]string       // Labels (for grouped results)
}

// MetricTimeSeriesPoint represents a single point in a time series
type MetricTimeSeriesPoint struct {
	Timestamp time.Time // Timestamp of the data point
	Value     float64   // Aggregated value
	Count     int       // Number of data points in this aggregation (useful for average calculations)
}

// AggregateMetrics retrieves and aggregates metrics based on query parameters
func (s *SQLiteStorage) AggregateMetrics(query MetricQuery) ([]MetricAggregation, error) {
	// Placeholder implementation - in a real system, this would query the database
	// and perform the requested aggregation

	// Validate time range
	if query.From.IsZero() {
		query.From = time.Now().Add(-1 * time.Hour) // Default to last hour
	}

	if query.To.IsZero() {
		query.To = time.Now()
	}

	// Validate resolution
	resolution := 60 * time.Second // Default to 1 minute
	switch query.Resolution {
	case "10s":
		resolution = 10 * time.Second
	case "30s":
		resolution = 30 * time.Second
	case "1m":
		resolution = time.Minute
	case "5m":
		resolution = 5 * time.Minute
	case "15m":
		resolution = 15 * time.Minute
	case "1h":
		resolution = time.Hour
	case "6h":
		resolution = 6 * time.Hour
	case "1d":
		resolution = 24 * time.Hour
	}

	// Placeholder for SQL query - this would be the actual database query in a real implementation
	/*
		sql := `
		SELECT
		    strftime('%Y-%m-%d %H:%M:%S', datetime(timestamp / $resolution * $resolution, 'unixepoch')) as period,
		    $aggregation_function(value) as value,
		    count(*) as count
		FROM
		    metrics
		WHERE
		    name = $name
		    AND service = $service
		    AND timestamp >= $from
		    AND timestamp <= $to
		    $tag_filters
		GROUP BY
		    period
		    $label_grouping
		ORDER BY
		    period
		`
	*/

	// Generate a sample metric aggregation
	points := make([]MetricTimeSeriesPoint, 0)
	currentTime := query.From

	for currentTime.Before(query.To) {
		point := MetricTimeSeriesPoint{
			Timestamp: currentTime,
			Value:     float64(currentTime.Unix() % 100), // Generate some pattern
			Count:     int(currentTime.Unix()%10) + 1,
		}
		points = append(points, point)
		currentTime = currentTime.Add(resolution)
	}

	aggregation := MetricAggregation{
		Name:       query.Name,
		Type:       models.MetricTypeGauge,
		TimeSeries: points,
		Labels:     query.Tags,
	}

	return []MetricAggregation{aggregation}, nil
}

// CalculatePercentile calculates the percentile value from a histogram metric
func CalculatePercentile(histogram *models.HistogramMetric, percentile float64) float64 {
	if percentile < 0 || percentile > 100 {
		return 0
	}

	// Check if we've pre-calculated this percentile
	if val, ok := histogram.Percentile[percentile]; ok {
		return val
	}

	if len(histogram.Buckets) == 0 || histogram.Count == 0 {
		return 0
	}

	// Convert percentile to a fraction (0-1)
	p := percentile / 100.0

	// Find the target count for this percentile
	targetCount := uint64(float64(histogram.Count) * p)

	// Find the bucket that contains this percentile
	var cumulativeCount uint64
	for _, bucket := range histogram.Buckets {
		cumulativeCount += bucket.Count
		if cumulativeCount >= targetCount {
			// For simplicity, we'll return the bucket's upper bound
			// A more accurate implementation would interpolate within the bucket
			return bucket.UpperBound
		}
	}

	// If we get here, return the highest bucket upper bound
	return histogram.Buckets[len(histogram.Buckets)-1].UpperBound
}

// CalculateMetricsRate calculates the rate of change for a counter metric
func CalculateMetricsRate(points []MetricTimeSeriesPoint) []MetricTimeSeriesPoint {
	if len(points) < 2 {
		return []MetricTimeSeriesPoint{}
	}

	rates := make([]MetricTimeSeriesPoint, len(points)-1)

	for i := 1; i < len(points); i++ {
		current := points[i]
		previous := points[i-1]

		timeDiff := current.Timestamp.Sub(previous.Timestamp).Seconds()
		if timeDiff <= 0 {
			continue
		}

		valueDiff := current.Value - previous.Value
		if valueDiff < 0 {
			// Counter reset, assume it was reset to 0
			valueDiff = current.Value
		}

		rates[i-1] = MetricTimeSeriesPoint{
			Timestamp: current.Timestamp,
			Value:     valueDiff / timeDiff,
			Count:     1,
		}
	}

	return rates
}

// ExportPrometheusFormat exports metrics in Prometheus format
func ExportPrometheusFormat(aggregations []MetricAggregation) string {
	var result string

	for _, agg := range aggregations {
		// Add metric help and type
		result += fmt.Sprintf("# HELP %s Pulse metric\n", agg.Name)
		result += fmt.Sprintf("# TYPE %s %s\n", agg.Name, agg.Type)

		// Add data points
		for _, point := range agg.TimeSeries {
			// Format labels
			labelStr := "{"
			for k, v := range agg.Labels {
				if labelStr != "{" {
					labelStr += ","
				}
				labelStr += fmt.Sprintf("%s=\"%s\"", k, v)
			}
			labelStr += "}"

			// Add timestamp if not empty
			tsStr := ""
			if !point.Timestamp.IsZero() {
				tsStr = fmt.Sprintf(" %d", point.Timestamp.UnixNano()/1000000)
			}

			// Add the data point
			result += fmt.Sprintf("%s%s %g%s\n", agg.Name, labelStr, point.Value, tsStr)
		}

		result += "\n"
	}

	return result
}
