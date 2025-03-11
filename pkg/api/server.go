package api

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/karansingh/pulse/pkg/processor"
)

// Server represents the HTTP API server
type Server struct {
	server      *http.Server
	processor   processor.Processor
	port        int
	routes      map[string]http.HandlerFunc
	wsUpgrader  websocket.Upgrader
	activeConns map[*websocket.Conn]bool
	connLock    sync.Mutex
}

// NewServer creates a new HTTP API server
func NewServer(processor processor.Processor, port int) *Server {
	s := &Server{
		processor:   processor,
		port:        port,
		routes:      make(map[string]http.HandlerFunc),
		activeConns: make(map[*websocket.Conn]bool),
		wsUpgrader: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			CheckOrigin: func(r *http.Request) bool {
				return true // Allow all origins
			},
		},
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
	s.routes["/logs/batch"] = s.logsBatchHandler()

	// Metric ingestion endpoints
	s.routes["/metrics"] = s.metricsHandler()

	// Trace ingestion endpoints
	s.routes["/traces"] = s.tracesHandler()
	s.routes["/spans"] = s.spansHandler()

	// Dashboard API endpoints
	s.routes["/api/logs"] = s.apiLogsHandler()
	s.routes["/api/metrics"] = s.apiMetricsHandler()
	s.routes["/api/traces"] = s.apiTracesHandler()
	s.routes["/api/spans"] = s.apiSpansHandler()
	s.routes["/api/services"] = s.apiServicesHandler()
	s.routes["/api/stats"] = s.apiStatsHandler()

	// Add new clear endpoint for cleaning data
	s.routes["/api/clear"] = s.clearHandler()

	// WebSocket endpoints
	s.routes["/ws/logs"] = s.wsLogsHandler()
	s.routes["/ws/metrics"] = s.wsMetricsHandler()
	s.routes["/ws/traces"] = s.wsTracesHandler()

	// Add improved static file handler for dashboard
	// This will handle both /dashboard and /dashboard/ correctly
	dashboardHandler := http.StripPrefix("/dashboard", http.FileServer(http.Dir("./dashboard")))
	s.routes["/dashboard"] = func(w http.ResponseWriter, r *http.Request) {
		// If path is exactly /dashboard, redirect to /dashboard/ to ensure relative paths work correctly
		if r.URL.Path == "/dashboard" {
			http.Redirect(w, r, "/dashboard/", http.StatusMovedPermanently)
			return
		}
		dashboardHandler.ServeHTTP(w, r)
	}

	// Handle dashboard's root path to ensure it loads index.html
	s.routes["/dashboard/"] = func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/dashboard/" {
			http.ServeFile(w, r, "./dashboard/index.html")
			return
		}
		dashboardHandler.ServeHTTP(w, r)
	}
}

// Start starts the HTTP server
func (s *Server) Start() error {
	mux := http.NewServeMux()

	// Register all routes with the mux
	for path, handler := range s.routes {
		mux.HandleFunc(path, corsMiddleware(handler))
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

// corsMiddleware adds CORS headers to responses
func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// Handle preflight requests
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		// Call the next handler
		next(w, r)
	}
}

// Stop gracefully shuts down the HTTP server
func (s *Server) Stop(ctx context.Context) error {
	log.Printf("Shutting down API server")

	// Close all WebSocket connections
	s.connLock.Lock()
	for conn := range s.activeConns {
		conn.Close()
	}
	s.connLock.Unlock()

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
