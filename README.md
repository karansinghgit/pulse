# Pulse 🔍
**Lightweight Observability Bridge for Modern Applications**  
*Unify logs, metrics, and traces without the cloud vendor lock-in*

## 🚀 Features
- **Unified Ingestion API** - Accepts logs (Syslog/JSON), metrics (Prometheus-style), traces (OpenTelemetry-compatible)
- **Real-time Dashboard** - WebSocket-powered live tailing and visualization
- **Embedded Storage** - SQLite with automatic WAL mode optimization
- **CLI First Design** - Pipe-friendly interface for Unix-style workflows
- **Extensible Core** - Pluggable architecture for storage backends and processors

## 🚧 Project Status
This project is under active development. Currently implemented:
- [x] Project structure and foundation
- [x] Core data models for logs, metrics, and traces
- [x] SQLite storage with WAL mode
- [x] Basic HTTP server framework
- [x] Processor interface
- [x] HTTP logs ingestion API endpoint
- [x] HTTP metrics ingestion API endpoint (with Prometheus support)
- [x] HTTP traces/spans ingestion API endpoints
- [x] CLI for log streaming
- [x] Dashboard backend
- [x] Dashboard frontend (not real-time yet)
- [x] Demo script for visualization
- [ ] Client libraries
- [ ] Alerting system

## 🎮 Demo
To see Pulse in action with simulated data, run the demo script:

```bash
# Run the demo
./scripts/run_demo.sh
```

This will:
1. Start the Pulse server
2. Open the dashboard in your browser
3. Generate sample metrics, traces, and logs from simulated services
4. Display the data in real-time on the dashboard

Press Ctrl+C to stop the demo.

## 🛠️ Integration Guide

### 1. Logging Integration
Send structured log entries via HTTP:
```bash
# Send log entry
curl -X POST http://localhost:8080/logs \
  -H "Content-Type: application/json" \
  -d '{
    "message": "User login successful",
    "level": "INFO",
    "service": "auth-service",
    "timestamp": "2023-06-15T14:23:10Z",
    "tags": {"user_id": "12345", "method": "oauth"}
  }'
```

### 2. Metrics Integration

#### JSON Format
```bash
# Send custom metric
curl -X POST http://localhost:8080/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "name": "api.latency",
    "value": 142.7,
    "type": "gauge",
    "service": "payment-api",
    "tags": {"endpoint": "/users", "status": "200"}
  }'

# Send histogram metric
curl -X POST http://localhost:8080/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "name": "api.request_duration",
    "value": 0.237,
    "type": "histogram",
    "service": "payment-api",
    "buckets": [0.01, 0.05, 0.1, 0.5, 1.0, 5.0],
    "tags": {"endpoint": "/transactions"}
  }'
```

#### Prometheus Format
```bash
# Send metrics in Prometheus text format
curl -X POST http://localhost:8080/metrics \
  -H "Content-Type: text/plain" \
  -d '# HELP http_requests_total The total number of HTTP requests.
# TYPE http_requests_total counter
http_requests_total{method="post",code="200",service="api-server"} 1027
http_requests_total{method="get",code="200",service="api-server"} 9836

# HELP http_request_duration_seconds The HTTP request latencies in seconds.
# TYPE http_request_duration_seconds gauge
http_request_duration_seconds{path="/api/users",service="user-service"} 0.043'
```

#### Scrape Prometheus Metrics
```bash
# Scrape metrics in Prometheus format
curl -X GET http://localhost:8080/metrics
```

### 3. Distributed Tracing Integration

#### Send Individual Span
```bash
# Send an individual span
curl -X POST http://localhost:8080/spans \
  -H "Content-Type: application/json" \
  -d '{
    "name": "process_payment",
    "service": "payment-service",
    "start_time": "2023-06-15T14:23:10Z",
    "duration_ms": 127,
    "status": "OK",
    "tags": {
      "user_id": "12345",
      "payment_id": "pay_78932"
    }
  }'
```

#### Send Complete Trace
```bash
# Send a complete trace with multiple spans
curl -X POST http://localhost:8080/traces \
  -H "Content-Type: application/json" \
  -d '{
    "spans": [
      {
        "name": "http_request",
        "service": "api-gateway",
        "start_time": "2023-06-15T14:23:10Z",
        "duration_ms": 254,
        "status": "OK",
        "tags": {
          "http.method": "POST",
          "http.url": "/api/checkout"
        }
      },
      {
        "name": "validate_cart",
        "service": "cart-service",
        "parent_id": "span-1",
        "start_time": "2023-06-15T14:23:10.050Z",
        "duration_ms": 15,
        "status": "OK",
        "tags": {
          "cart_id": "cart_12345"
        }
      },
      {
        "name": "process_payment",
        "service": "payment-service",
        "parent_id": "span-1",
        "start_time": "2023-06-15T14:23:10.070Z",
        "duration_ms": 127,
        "status": "OK",
        "tags": {
          "payment_id": "pay_78932"
        }
      }
    ]
  }'
```

## 📋 Getting Started

### Prerequisites
- Go 1.19 or later
- SQLite 3.x

### Installation
```bash
# Clone the repository
git clone https://github.com/karansingh/pulse.git
cd pulse

# Install dependencies
go mod download

# Build the application
go build -o pulse ./cmd/pulse

# Run the server
./pulse --port 8080 --db pulse.db --data-dir ./data
```

### API Endpoints

Currently implemented:
- `GET /health` - Health check endpoint
- `POST /logs` - Submit log entries
- `POST /logs/batch` - Submit multiple log entries
- `POST /metrics` - Submit metrics (JSON or Prometheus format)
- `GET /metrics` - Scrape metrics in Prometheus format
- `POST /traces` - Submit complete traces
- `POST /spans` - Submit individual spans

Dashboard API:
- `GET /api/logs` - Query logs with filtering
- `GET /api/metrics` - Query metrics with filtering
- `GET /api/traces` - Query traces with filtering
- `GET /api/spans` - Query spans with filtering
- `GET /api/services` - Get list of available services
- `GET /api/stats` - Get summary statistics

WebSocket endpoints:
- `WS /ws/logs` - Real-time log streaming
- `WS /ws/metrics` - Real-time metrics streaming
- `WS /ws/traces` - Real-time traces streaming

## 🧠 Architecture

Pulse follows a clean architecture pattern with:
- Core domain models in `pkg/models`
- Storage interfaces and implementations in `pkg/storage`
- API handlers in `pkg/api`
- Event processing pipeline in `pkg/processor`

### Data Flow
1. Data is ingested through HTTP API endpoints
2. Processor chain processes and enriches the data
3. Storage system persists the data
4. Metrics and traces can be queried and visualized through APIs

### Observability Data Types

#### Logs
- **Structure**: Timestamped entries with a message, level, and optional metadata
- **Storage**: SQLite `logs` table with efficient indexing
- **Usage**: Debugging, event tracking, audit trails

#### Metrics
- **Types**: Counter, Gauge, Histogram, Summary
- **Storage**: SQLite `metrics` and `histogram_metrics` tables
- **Formats**: JSON and Prometheus exposition format
- **Aggregation**: Sum, Average, Min, Max, Percentiles (for histograms)

#### Traces
- **Structure**: Collection of spans forming a request execution path
- **Correlation**: Trace IDs, Span IDs, and Parent IDs for relationship tracking
- **Context Propagation**: Via HTTP headers or explicit IDs
- **Storage**: SQLite `spans` and `traces` tables

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License
This project is licensed under the MIT License - see the LICENSE file for details. 