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
- [ ] HTTP metrics ingestion API endpoint
- [ ] HTTP traces ingestion API endpoint
- [ ] CLI for log streaming
- [ ] Dashboard backend
- [ ] Real-time frontend
- [ ] Client libraries
- [ ] Alerting system

## 🛠️ Integration Guide

### 1. As a Log Aggregator
Pipe any application's stdout to Pulse:
```bash
# Monitor Docker containers
docker logs -f your_container | pulse stream --service docker --env prod

# Development workflow
python app.py 2>&1 | pulse stream --service payment-api --env dev
```

### 2. Direct API Integration
Send structured data via HTTP endpoints:
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

# Send custom metric (coming soon)
curl -X POST http://localhost:8080/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "name": "api.latency",
    "value": 142.7,
    "tags": {"endpoint": "/users", "status": "200"}
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
- `POST /metrics` - Submit metrics (placeholder)
- `POST /traces` - Submit traces (placeholder)
- `POST /spans` - Submit individual spans (placeholder)

## 🧠 Architecture

Pulse follows a clean architecture pattern with:
- Core domain models in `pkg/models`
- Storage interfaces and implementations in `pkg/storage`
- API handlers in `pkg/api`
- Event processing pipeline in `pkg/processor`

### Data Flow
1. Data is ingested through HTTP API or CLI
2. Processor chain processes and enriches the data
3. Storage system persists the data
4. Dashboard and API allow querying and visualization (planned)

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License
This project is licensed under the MIT License - see the LICENSE file for details. 