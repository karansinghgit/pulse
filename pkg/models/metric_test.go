package models

import (
	"testing"
	"time"
)

func TestNewMetric(t *testing.T) {
	// Test cases
	testCases := []struct {
		name       string
		metricName string
		value      float64
		metricType MetricType
		service    string
		expectType MetricType
	}{
		{
			name:       "Counter metric",
			metricName: "http_requests_total",
			value:      42,
			metricType: MetricTypeCounter,
			service:    "api-gateway",
			expectType: MetricTypeCounter,
		},
		{
			name:       "Gauge metric",
			metricName: "cpu_usage",
			value:      87.5,
			metricType: MetricTypeGauge,
			service:    "backend-service",
			expectType: MetricTypeGauge,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			metric := NewMetric(tc.metricName, tc.value, tc.metricType, tc.service)

			if metric.Name != tc.metricName {
				t.Errorf("expected name %s, got %s", tc.metricName, metric.Name)
			}

			if metric.Value != tc.value {
				t.Errorf("expected value %f, got %f", tc.value, metric.Value)
			}

			if metric.Type != tc.expectType {
				t.Errorf("expected type %s, got %s", tc.expectType, metric.Type)
			}

			if metric.Service != tc.service {
				t.Errorf("expected service %s, got %s", tc.service, metric.Service)
			}

			// Check if timestamp is recent
			now := time.Now().UTC()
			diff := now.Sub(metric.Timestamp)
			if diff > 5*time.Second || diff < 0 {
				t.Errorf("timestamp is not recent: expected around %v, got %v", now, metric.Timestamp)
			}
		})
	}
}

func TestMetric_AddTag(t *testing.T) {
	metric := NewMetric("test_metric", 100, MetricTypeGauge, "test-service")

	// Add a tag
	metric.AddTag("key1", "value1")

	// Verify tag was added
	if val, exists := metric.Tags["key1"]; !exists || val != "value1" {
		t.Errorf("expected tag with key1=value1, got %v", metric.Tags)
	}

	// Test chaining
	metric.AddTag("key2", "value2").AddTag("key3", "value3")

	// Verify both tags were added
	if val, exists := metric.Tags["key2"]; !exists || val != "value2" {
		t.Errorf("expected tag with key2=value2, got %v", metric.Tags)
	}

	if val, exists := metric.Tags["key3"]; !exists || val != "value3" {
		t.Errorf("expected tag with key3=value3, got %v", metric.Tags)
	}
}

func TestHistogramMetric(t *testing.T) {
	name := "http_request_duration"
	service := "web-service"
	buckets := []float64{0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0}

	// Create a histogram metric
	metric := NewHistogramMetric(name, service, buckets)

	// Test buckets
	if len(metric.Buckets) != len(buckets) {
		t.Errorf("expected %d buckets, got %d", len(buckets), len(metric.Buckets))
	}

	// Verify each bucket has correct upper bound
	for i, bound := range buckets {
		if metric.Buckets[i].UpperBound != bound {
			t.Errorf("expected bucket[%d] to have upper bound %f, got %f", i, bound, metric.Buckets[i].UpperBound)
		}
	}

	// Observe some values
	metric.Observe(0.003) // Falls into first bucket (0.005)
	metric.Observe(0.075) // Falls into fifth bucket (0.1)
	metric.Observe(0.2)   // Falls into sixth bucket (0.25)

	// Count should be 3
	if metric.Count != 3 {
		t.Errorf("expected count of 3, got %d", metric.Count)
	}

	// Sum should be 0.278
	expectedSum := 0.003 + 0.075 + 0.2
	if metric.Sum != expectedSum {
		t.Errorf("expected sum of %f, got %f", expectedSum, metric.Sum)
	}

	// Check correct bucket counts
	// Each bucket should reflect cumulative count of observations <= its upper bound
	expectedCounts := []uint64{1, 1, 1, 1, 2, 3, 3, 3, 3, 3, 3}
	for i, expectedCount := range expectedCounts {
		if metric.Buckets[i].Count != expectedCount {
			t.Errorf("expected bucket with upper bound %f to have count %d, got %d",
				metric.Buckets[i].UpperBound, expectedCount, metric.Buckets[i].Count)
		}
	}
}
