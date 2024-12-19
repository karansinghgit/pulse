package api

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/karansingh/pulse/pkg/processor"
)

// Server represents the HTTP API server
type Server struct {
	server    *http.Server
	processor processor.Processor
	port      int
	routes    map[string]http.HandlerFunc
}

// NewServer creates a new HTTP API server
func NewServer(processor processor.Processor, port int) *Server {
	s := &Server{
		processor: processor,
		port:      port,
		routes:    make(map[string]http.HandlerFunc),
	}

	// Register routes
	s.setupRoutes()

	return s
}

// setupRoutes configures all the HTTP routes for the API server
func (s *Server) setupRoutes() {
	// Health check endpoint
	s.routes["/health"] = s.handleHealth()

	// Log ingestion endpoints
	s.routes["/logs"] = s.logsHandler()

	// Metric ingestion endpoints
	s.routes["/metrics"] = s.metricsHandler()

	// Trace ingestion endpoints
	s.routes["/traces"] = s.tracesHandler()
	s.routes["/spans"] = s.spansHandler()
}

// Start starts the HTTP server
func (s *Server) Start() error {
	mux := http.NewServeMux()

	// Register all routes with the mux
	for path, handler := range s.routes {
		mux.HandleFunc(path, handler)
	}

	// Create the server
	s.server = &http.Server{
		Addr:    fmt.Sprintf(":%d", s.port),
		Handler: mux,
	}

	// Start the server
	log.Printf("Starting API server on port %d", s.port)
	return s.server.ListenAndServe()
}

// Stop gracefully shuts down the HTTP server
func (s *Server) Stop(ctx context.Context) error {
	log.Printf("Shutting down API server")
	return s.server.Shutdown(ctx)
}

// handleHealth returns a health check handler
func (s *Server) handleHealth() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		response := map[string]interface{}{
			"status":  "ok",
			"time":    time.Now().UTC(),
			"version": "0.1.0",
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	}
}
