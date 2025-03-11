#!/bin/bash

# Start the Pulse server
echo "Starting Pulse server..."
go run cmd/pulse/main.go &
PULSE_PID=$!

# Wait for the server to start
sleep 2

# Run the metrics-focused demo
echo "Starting metrics data generator..."
go run scripts/demo.go -rate=20 -duration=3600 -metrics-focus &
DEMO_PID=$!

# Trap SIGINT and SIGTERM
trap "kill $DEMO_PID 2>/dev/null; kill $PULSE_PID 2>/dev/null; exit 0" INT TERM

echo "Demo is running. Press Ctrl+C to stop."
echo "Access the metrics dashboard at http://localhost:8081/metrics"

# Keep script running until user presses Ctrl+C
wait $DEMO_PID
wait $PULSE_PID
