package main

import (
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"runtime"
	"syscall"
	"time"

	"github.com/karansingh/pulse/pkg/models"
)

const (
	pulseServerURL  = "http://localhost:8080"
	metricsEndpoint = "/api/v1/metrics"
	tracesEndpoint  = "/api/v1/traces"
	logsEndpoint    = "/api/v1/logs"
	dashboardURL    = "http://localhost:8080/dashboard"
)

// Services we'll simulate
var services = []string{
	"api-gateway",
	"auth-service",
	"user-service",
	"product-service",
	"payment-service",
}

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
	// In a real implementation, this would serialize the metric and send it to the server
	// For demo purposes, we'll just print it
	fmt.Printf("Sending metric: %s = %.2f (%s)\n", metric.Name, metric.Value, metric.Type)
	return nil
}

// Send a trace to the Pulse server
func sendTrace(trace *models.Trace) error {
	// In a real implementation, this would serialize the trace and send it to the server
	// For demo purposes, we'll just print it
	fmt.Printf("Sending trace: %s with %d spans\n", trace.ID, len(trace.Spans))
	return nil
}

// Send a log entry to the Pulse server
func sendLog(logEntry *models.LogEntry) error {
	// In a real implementation, this would serialize the log and send it to the server
	// For demo purposes, we'll just print it
	fmt.Printf("Sending log: [%s] %s\n", logEntry.Level, logEntry.Message)
	return nil
}

// Simulate an HTTP request with tracing, metrics, and logs
func simulateRequest() {
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

	// If this is a product service call, add a database span
	if service == "product-service" {
		dbSpan := models.NewSpan("database_query", service, trace.ID)
		dbSpan.SetParent(rootSpan.ID)
		dbSpan.AddTag("db.type", "postgres")
		dbSpan.AddTag("db.statement", "SELECT * FROM products")

		// Simulate database query time
		dbDuration := randomDuration(10, 100)
		time.Sleep(dbDuration)

		// Finish the database span
		dbSpan.Finish()

		// Add the database span to the trace
		trace.AddSpan(dbSpan)

		// Create a database timing metric
		dbMetric := models.NewMetric("database.query.duration", float64(dbDuration.Milliseconds()), models.MetricTypeGauge, service)
		dbMetric.AddTag("db.type", "postgres")
		dbMetric.AddTag("query.type", "select")
		sendMetric(dbMetric)
	}

	// Finish the root span
	rootSpan.Finish()

	// Create metrics for this request
	requestMetric := models.NewMetric("http.request.duration", float64(requestDuration.Milliseconds()), models.MetricTypeGauge, service)
	requestMetric.AddTag("endpoint", endpoint)
	requestMetric.AddTag("status_code", fmt.Sprintf("%d", statusCode))
	sendMetric(requestMetric)

	// Increment request counter
	requestCounter := models.NewMetric("http.requests.total", 1, models.MetricTypeCounter, service)
	requestCounter.AddTag("endpoint", endpoint)
	requestCounter.AddTag("status_code", fmt.Sprintf("%d", statusCode))
	sendMetric(requestCounter)

	// Create a histogram for request durations
	histogramBuckets := []float64{10, 50, 100, 200, 500, 1000}
	histogramMetric := models.NewHistogramMetric("http.request.duration.histogram", service, histogramBuckets)
	histogramMetric.Observe(float64(requestDuration.Milliseconds()))

	// Create a log entry
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

	// Send the trace
	sendTrace(trace)
}

func startPulseServer() (*exec.Cmd, error) {
	fmt.Println("Starting Pulse server...")
	cmd := exec.Command("go", "run", "cmd/pulse/main.go")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("failed to start Pulse server: %v", err)
	}

	// Wait for the server to start
	time.Sleep(2 * time.Second)

	// Check if the server is running
	resp, err := http.Get(pulseServerURL + "/health")
	if err != nil {
		cmd.Process.Kill()
		return nil, fmt.Errorf("server not responding: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		cmd.Process.Kill()
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

func main() {
	// Initialize random number generator
	rand.New(rand.NewSource(time.Now().UnixNano()))

	// Start the Pulse server
	serverCmd, err := startPulseServer()
	if err != nil {
		log.Fatalf("Error starting server: %v", err)
	}
	defer serverCmd.Process.Kill()

	// Open the dashboard in a browser
	if err := openDashboard(); err != nil {
		fmt.Printf("Failed to open dashboard: %v\n", err)
		fmt.Printf("Please manually open %s in your browser\n", dashboardURL)
	}

	fmt.Println("Generating sample data...")
	fmt.Println("Press Ctrl+C to stop")

	// Generate sample data every second
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	// Handle Ctrl+C
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	// Generate data until interrupted
	for {
		select {
		case <-ticker.C:
			// Simulate 1-5 requests per tick
			numRequests := 1 + rand.Intn(5)
			for i := 0; i < numRequests; i++ {
				simulateRequest()
			}
		case <-sigChan:
			fmt.Println("\nShutting down...")
			return
		}
	}
}
