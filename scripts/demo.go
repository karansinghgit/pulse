package main

import (
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"runtime"
	"sync"
	"syscall"
	"time"

	"github.com/karansingh/pulse/pkg/models"
)

// Service names for simulation
var services = []string{"web", "api", "auth", "database", "cache", "worker"}

// URL for the Pulse server
var pulseServerURL = "http://localhost:8080"

// URL for the dashboard
var dashboardURL = "http://localhost:8081/overview"

// Endpoints we'll simulate
var endpoints = []string{
	"/api/users",
	"/api/products",
	"/api/orders",
	"/api/payments",
	"/api/auth/login",
}

// Generate a random duration between min and max milliseconds
func randomDuration(min, max int) time.Duration {
	return time.Duration(min+rand.Intn(max-min)) * time.Millisecond
}

// Generate a random HTTP status code (mostly 200s, some 400s, few 500s)
func randomStatusCode() int {
	r := rand.Intn(100)
	if r < 85 {
		return 200
	} else if r < 95 {
		return 400 + rand.Intn(5)
	} else {
		return 500 + rand.Intn(5)
	}
}

// Send a metric to the Pulse server
func sendMetric(metric *models.Metric) error {
	// Instead of print, increment the counter above
	// fmt.Printf("Sending metric: %s[%s] = %v\n", metric.Name, metric.Type, metric.Value)

	// Convert Metric to the expected request format
	metricRequest := struct {
		Name      string            `json:"name"`
		Value     float64           `json:"value"`
		Type      string            `json:"type"`
		Service   string            `json:"service"`
		Tags      map[string]string `json:"tags,omitempty"`
		Timestamp string            `json:"timestamp,omitempty"`
	}{
		Name:      metric.Name,
		Value:     metric.Value,
		Type:      string(metric.Type),
		Service:   metric.Service,
		Tags:      metric.Tags,
		Timestamp: metric.Timestamp.Format(time.RFC3339),
	}

	// Serialize the metric request to JSON
	jsonData, err := json.Marshal(metricRequest)
	if err != nil {
		return fmt.Errorf("error serializing metric: %v", err)
	}

	// Send to server
	resp, err := http.Post(pulseServerURL+"/metrics", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("error sending metric: %v", err)
	}
	defer resp.Body.Close()

	// Check for error response
	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("server returned error for metric: %d - %s", resp.StatusCode, string(body))
	}

	return nil
}

// Send a trace to the Pulse server
func sendTrace(trace *models.Trace) error {
	// Instead of print, increment the counter above
	// fmt.Printf("Sending trace: %s (service: %s)\n", trace.ID, trace.Service)

	// Create a simplified trace request from the trace model
	// Convert directly to json as the model matches the API format
	jsonData, err := json.Marshal(trace)
	if err != nil {
		return fmt.Errorf("error serializing trace: %v", err)
	}

	// Send to server
	resp, err := http.Post(pulseServerURL+"/traces", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("error sending trace: %v", err)
	}
	defer resp.Body.Close()

	// Check for error response
	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("server returned error for trace: %d - %s", resp.StatusCode, string(body))
	}

	return nil
}

// Send a log entry to the Pulse server
func sendLog(logEntry *models.LogEntry) error {
	// Instead of print, increment the counter above
	// fmt.Printf("Sending log: [%s] %s\n", logEntry.Level, logEntry.Message)

	// Convert LogEntry to the expected LogRequest format
	logRequest := struct {
		Message   string            `json:"message"`
		Level     string            `json:"level"`
		Service   string            `json:"service"`
		Timestamp string            `json:"timestamp,omitempty"`
		Tags      map[string]string `json:"tags,omitempty"`
		TraceID   string            `json:"trace_id,omitempty"`
		SpanID    string            `json:"span_id,omitempty"`
		Env       string            `json:"env,omitempty"`
		Host      string            `json:"host,omitempty"`
		Source    string            `json:"source,omitempty"`
	}{
		Message:   logEntry.Message,
		Level:     string(logEntry.Level),
		Service:   logEntry.Service,
		Timestamp: logEntry.Timestamp.Format(time.RFC3339),
		Tags:      logEntry.Tags,
		TraceID:   logEntry.TraceID,
		SpanID:    logEntry.SpanID,
		Env:       logEntry.Env,
		Host:      logEntry.Host,
		Source:    logEntry.Source,
	}

	// Serialize the log request to JSON
	jsonData, err := json.Marshal(logRequest)
	if err != nil {
		return fmt.Errorf("error serializing log: %v", err)
	}

	// Send to server
	resp, err := http.Post(pulseServerURL+"/logs", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("error sending log: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("server returned error: %d - %s", resp.StatusCode, string(body))
	}

	return nil
}

// Simulate an HTTP request with tracing, metrics, and logs
// Returns the count of logs, metrics, and traces generated
func simulateRequest() (int, int, int) {
	// Metrics counter to track actual metrics generated
	var logCount int
	var metricCount int
	var traceCount int

	// Pick a random service and endpoint
	service := services[rand.Intn(len(services))]
	endpoint := endpoints[rand.Intn(len(endpoints))]

	// Create a trace for this request
	trace, rootSpan := models.NewTrace("http_request", service)
	rootSpan.AddTag("endpoint", endpoint)

	// Add some common tags
	rootSpan.AddTag("http.method", "GET")
	rootSpan.AddTag("http.url", endpoint)

	// Simulate the request duration
	requestDuration := randomDuration(50, 500)
	time.Sleep(requestDuration)

	// Create a status code and determine if it's an error
	statusCode := randomStatusCode()
	isError := statusCode >= 400

	// Set the status based on the status code
	if isError {
		rootSpan.SetStatus(models.SpanStatusError)
	} else {
		rootSpan.SetStatus(models.SpanStatusOK)
	}

	// Add the status code as a tag
	rootSpan.AddTag("http.status_code", fmt.Sprintf("%d", statusCode))

	// Randomly add more subspans (not just for product-service)
	addSubSpans := rand.Float32() < 0.7 // 70% chance to add subspans

	if addSubSpans {
		// Random number of subspans (1-3)
		numSubSpans := rand.Intn(3) + 1

		for i := 0; i < numSubSpans; i++ {
			spanType := "database_query"
			if i > 0 && rand.Float32() < 0.5 {
				// Add different span types sometimes
				spanTypes := []string{"cache_lookup", "external_api_call", "auth_check", "data_processing"}
				spanType = spanTypes[rand.Intn(len(spanTypes))]
			}

			subSpan := models.NewSpan(spanType, service, trace.ID)
			subSpan.SetParent(rootSpan.ID)

			// Add span-specific tags
			switch spanType {
			case "database_query":
				subSpan.AddTag("db.type", "postgres")
				subSpan.AddTag("db.statement", "SELECT * FROM products WHERE id = $1")
			case "cache_lookup":
				subSpan.AddTag("cache.type", "redis")
				subSpan.AddTag("cache.operation", "GET")
			case "external_api_call":
				subSpan.AddTag("http.method", "POST")
				subSpan.AddTag("http.url", "https://api.example.com/data")
			case "auth_check":
				subSpan.AddTag("auth.type", "jwt")
				subSpan.AddTag("auth.user_id", fmt.Sprintf("user-%d", rand.Intn(1000)))
			case "data_processing":
				subSpan.AddTag("processor.type", "json")
				subSpan.AddTag("processor.records", fmt.Sprintf("%d", rand.Intn(100)+1))
			}

			// Random duration for the subspan
			subDuration := randomDuration(5, 100)
			time.Sleep(subDuration)

			// Randomly add an error to the span
			if rand.Float32() < 0.2 { // 20% chance of error
				subSpan.SetStatus(models.SpanStatusError)
				subSpan.AddTag("error.message", "Operation failed")
			} else {
				subSpan.SetStatus(models.SpanStatusOK)
			}

			// Finish the span
			subSpan.Finish()

			// Add the span to the trace
			trace.AddSpan(subSpan)

			// Create a timing metric for this operation
			if rand.Float32() < 0.8 { // 80% chance to add a metric
				opMetric := models.NewMetric(fmt.Sprintf("%s.duration", spanType), float64(subDuration.Milliseconds()), models.MetricTypeGauge, service)
				opMetric.AddTag("operation", spanType)
				sendMetric(opMetric)
				metricCount++
			}
		}
	}

	// Finish the root span
	rootSpan.Finish()

	// Create metrics for this request (always present)
	requestMetric := models.NewMetric("http.request.duration", float64(requestDuration.Milliseconds()), models.MetricTypeGauge, service)
	requestMetric.AddTag("endpoint", endpoint)
	requestMetric.AddTag("status_code", fmt.Sprintf("%d", statusCode))
	sendMetric(requestMetric)
	metricCount++

	// Increment request counter (always present)
	requestCounter := models.NewMetric("http.requests.total", 1, models.MetricTypeCounter, service)
	requestCounter.AddTag("endpoint", endpoint)
	requestCounter.AddTag("status_code", fmt.Sprintf("%d", statusCode))
	sendMetric(requestCounter)
	metricCount++

	// Create a histogram for request durations (70% chance)
	if rand.Float32() < 0.7 {
		histogramBuckets := []float64{10, 50, 100, 200, 500, 1000}
		histogramMetric := models.NewHistogramMetric("http.request.duration.histogram", service, histogramBuckets)
		histogramMetric.Observe(float64(requestDuration.Milliseconds()))
		metricCount++
	}

	// Create a log entry (main log - always present)
	logLevel := models.LogLevelInfo
	logMessage := fmt.Sprintf("Processed request to %s in %d ms", endpoint, requestDuration.Milliseconds())

	if isError {
		logLevel = models.LogLevelError
		logMessage = fmt.Sprintf("Error processing request to %s: status code %d", endpoint, statusCode)
	}

	logEntry := models.NewLogEntry(service, logMessage, logLevel)
	logEntry.AddTag("endpoint", endpoint)
	logEntry.AddTag("status_code", fmt.Sprintf("%d", statusCode))
	logEntry.WithTrace(trace.ID, rootSpan.ID)
	sendLog(logEntry)
	logCount++

	// Random chance to add additional debug or warning logs (50% chance)
	if rand.Float32() < 0.5 {
		extraLogCount := rand.Intn(2) + 1 // 1-2 extra logs

		for i := 0; i < extraLogCount; i++ {
			var extraLevel models.LogLevel
			var extraMessage string

			if rand.Float32() < 0.7 {
				extraLevel = models.LogLevelDebug
				var cacheStatus string
				if rand.Float32() < 0.5 {
					cacheStatus = "hit"
				} else {
					cacheStatus = "miss"
				}

				debugMessages := []string{
					fmt.Sprintf("Request parameters for %s: {\"id\": \"%d\"}", endpoint, rand.Intn(1000)),
					fmt.Sprintf("Cache %s for request to %s", cacheStatus, endpoint),
					fmt.Sprintf("Authentication successful for user-%d", rand.Intn(1000)),
					fmt.Sprintf("Response payload size: %d bytes", rand.Intn(10000)+100),
				}
				extraMessage = debugMessages[rand.Intn(len(debugMessages))]
			} else {
				extraLevel = models.LogLevelWarning
				warnMessages := []string{
					fmt.Sprintf("Slow database query detected (%d ms)", rand.Intn(500)+300),
					fmt.Sprintf("Rate limit approaching for endpoint %s", endpoint),
					fmt.Sprintf("Deprecated API version used for %s", endpoint),
					fmt.Sprintf("High memory usage detected during request processing: %d MB", rand.Intn(500)+200),
				}
				extraMessage = warnMessages[rand.Intn(len(warnMessages))]
			}

			extraLog := models.NewLogEntry(service, extraMessage, extraLevel)
			extraLog.AddTag("endpoint", endpoint)
			extraLog.WithTrace(trace.ID, rootSpan.ID)
			sendLog(extraLog)
			logCount++
		}
	}

	// Send the trace
	sendTrace(trace)
	traceCount++

	// Return the actual counts
	return logCount, metricCount, traceCount
}

func startPulseServer() (*exec.Cmd, error) {
	fmt.Println("Starting Pulse server...")
	// Extract port from the pulseServerURL
	var port = 8080
	_, err := fmt.Sscanf(pulseServerURL, "http://localhost:%d", &port)
	if err != nil {
		fmt.Printf("Using default port 8080 due to parsing error: %v\n", err)
	}

	// Pass the port explicitly to ensure consistency
	cmd := exec.Command("go", "run", "cmd/pulse/main.go", "-port", fmt.Sprintf("%d", port))
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("failed to start Pulse server: %v", err)
	}

	// Wait for the server to start
	fmt.Printf("Waiting for Pulse server to start on port %d...\n", port)
	time.Sleep(2 * time.Second)

	// Set a timeout for server health check
	client := &http.Client{
		Timeout: 5 * time.Second,
	}

	// Check if the server is running
	resp, err := client.Get(pulseServerURL + "/health")
	if err != nil {
		cmd.Process.Kill()
		cmd.Wait() // Wait for the process to exit
		return nil, fmt.Errorf("server not responding: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		cmd.Process.Kill()
		cmd.Wait() // Wait for the process to exit
		return nil, fmt.Errorf("server returned non-OK status: %d", resp.StatusCode)
	}

	fmt.Println("Pulse server started successfully!")
	return cmd, nil
}

func openDashboard() error {
	fmt.Printf("Opening dashboard at %s\n", dashboardURL)
	var cmd *exec.Cmd

	// Detect OS and use appropriate command to open browser
	switch os := runtime.GOOS; os {
	case "darwin":
		cmd = exec.Command("open", dashboardURL)
	case "windows":
		cmd = exec.Command("cmd", "/c", "start", dashboardURL)
	default: // Linux and others
		cmd = exec.Command("xdg-open", dashboardURL)
	}

	return cmd.Start()
}

// clearOldLogs clears any old logs in the system to start fresh
func clearOldLogs() error {
	// We don't have direct access to the database, so we'll make an API call
	fmt.Println("Clearing old logs and data...")

	// First, check if the server is reachable
	client := &http.Client{
		Timeout: 5 * time.Second,
	}

	resp, err := client.Get(pulseServerURL + "/health")
	if err != nil {
		return fmt.Errorf("server not reachable: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("server returned non-OK status: %d", resp.StatusCode)
	}

	// Call a clearing endpoint (this would need to be implemented on the server)
	req, err := http.NewRequest("DELETE", pulseServerURL+"/api/clear", nil)
	if err != nil {
		return fmt.Errorf("failed to create clear request: %v", err)
	}

	// Make multiple attempts to clear data to ensure it works
	for i := 0; i < 3; i++ {
		clearResp, err := client.Do(req)
		if err != nil {
			return fmt.Errorf("failed to send clear request: %v", err)
		}

		if clearResp.StatusCode == http.StatusOK {
			clearResp.Body.Close()
			fmt.Println("Successfully cleared old data")
			return nil
		}

		// If it didn't succeed, close the body and try again
		clearResp.Body.Close()
		time.Sleep(500 * time.Millisecond)
	}

	return fmt.Errorf("failed to clear data after multiple attempts")
}

func main() {
	// Parse command line flags
	var port int
	var openBrowser bool
	flag.IntVar(&port, "port", 8080, "Port to run the Pulse server on")
	flag.BoolVar(&openBrowser, "open", true, "Automatically open the dashboard in a browser")
	flag.Parse()

	// Set server URL based on port
	pulseServerURL = fmt.Sprintf("http://localhost:%d", port)

	// Create a context that can be canceled
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Set up signal handling - MUST be done before starting the server
	signalChan := make(chan os.Signal, 1)
	signal.Notify(signalChan, os.Interrupt, syscall.SIGTERM)

	// Create a WaitGroup to track all goroutines
	var wg sync.WaitGroup

	// Handle signals in a separate goroutine
	go func() {
		sig := <-signalChan
		fmt.Printf("\nReceived signal: %v\n", sig)
		fmt.Println("Shutting down gracefully...")
		cancel() // Cancel context to notify all goroutines
	}()

	// Start the Pulse server
	var pulseCmd *exec.Cmd
	var err error
	pulseCmd, err = startPulseServer()
	if err != nil {
		log.Fatalf("Failed to start Pulse server: %v", err)
	}

	// Ensure server is killed on exit
	defer func() {
		if pulseCmd != nil && pulseCmd.Process != nil {
			fmt.Println("Killing Pulse server...")
			pulseCmd.Process.Kill()
			// Wait for the process to exit to ensure port is released
			pulseCmd.Wait()
			fmt.Println("Pulse server terminated")
		}
	}()

	// Wait for the server to start
	log.Println("Waiting for Pulse server to start...")
	time.Sleep(2 * time.Second)

	// Clear any old logs before we start
	if err := clearOldLogs(); err != nil {
		log.Printf("Warning: Failed to clear old logs: %v", err)
		log.Println("You may see 'ghost logs' from previous runs")
	}

	// Open dashboard in browser if requested
	if openBrowser {
		if err := openDashboard(); err != nil {
			log.Printf("Failed to open dashboard: %v", err)
		}
	}

	// Track metrics for summary logging
	var logCount, metricCount, traceCount int

	// Set up a ticker to display summary logs every second
	summaryTicker := time.NewTicker(1 * time.Second)
	defer summaryTicker.Stop()

	// Start a goroutine to print summary logs
	wg.Add(1)
	go func() {
		defer wg.Done()
		for {
			select {
			case <-summaryTicker.C:
				if logCount > 0 || metricCount > 0 || traceCount > 0 {
					log.Printf("Demo client summary: Sent %d logs, %d metrics, %d traces in the last second",
						logCount, metricCount, traceCount)
					logCount = 0
					metricCount = 0
					traceCount = 0
				}
			case <-ctx.Done():
				return
			}
		}
	}()

	// Update the simulation section to use a random interval
	wg.Add(1)
	go func() {
		defer wg.Done()

		// Create a ticker with random intervals between 200ms and 1000ms
		ticker := time.NewTicker(500 * time.Millisecond)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				// Generate a random request and get counts
				logCounter, metricCounter, traceCounter := simulateRequest()

				// Update the ticker duration randomly to create varied traffic patterns
				newInterval := time.Duration(rand.Intn(800)+200) * time.Millisecond
				ticker.Reset(newInterval)

				// Update summary counters
				logCount += logCounter
				metricCount += metricCounter
				traceCount += traceCounter

			case <-ctx.Done():
				return
			}
		}
	}()

	// Wait for context cancellation
	<-ctx.Done()

	// Wait for all goroutines to finish
	wg.Wait()

	fmt.Println("Shutdown complete")
}
