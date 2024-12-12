package main

import (
	"context"
	"flag"
	"log"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/karansingh/pulse/pkg/api"
	"github.com/karansingh/pulse/pkg/processor"
	"github.com/karansingh/pulse/pkg/storage"
)

var (
	// Command-line flags
	port          = flag.Int("port", 8080, "HTTP server port")
	dbPath        = flag.String("db", "./pulse.db", "Path to SQLite database file")
	dataDirectory = flag.String("data-dir", "./data", "Directory to store data files")
)

func main() {
	// Parse command-line flags
	flag.Parse()

	// Create data directory if it doesn't exist
	if err := os.MkdirAll(*dataDirectory, 0755); err != nil {
		log.Fatalf("Failed to create data directory: %v", err)
	}

	// Initialize storage
	dbFilePath := filepath.Join(*dataDirectory, filepath.Base(*dbPath))
	st, err := storage.NewSQLiteStorage(dbFilePath)
	if err != nil {
		log.Fatalf("Failed to initialize storage: %v", err)
	}
	defer st.Close()
	log.Printf("Storage initialized at %s", dbFilePath)

	// Initialize processor chain
	proc := processor.NewStorageProcessor(st)
	log.Printf("Processor initialized")

	// Initialize API server
	server := api.NewServer(proc, *port)
	log.Printf("API server initialized on port %d", *port)

	// Set up signal handling for graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Channel to receive errors from the server
	serverErrors := make(chan error, 1)

	// Start the server in a goroutine
	go func() {
		serverErrors <- server.Start()
	}()

	// Handle signals
	signals := make(chan os.Signal, 1)
	signal.Notify(signals, syscall.SIGINT, syscall.SIGTERM)

	// Wait for interrupt signal or server error
	select {
	case err := <-serverErrors:
		log.Printf("Server error: %v", err)
	case sig := <-signals:
		log.Printf("Received signal: %v", sig)
	}

	// Create a timeout context for the graceful shutdown
	shutdownCtx, shutdownCancel := context.WithTimeout(ctx, 10*time.Second)
	defer shutdownCancel()

	// Gracefully shutdown the server
	if err := server.Stop(shutdownCtx); err != nil {
		log.Printf("Error during server shutdown: %v", err)
	}

	log.Printf("Server shutdown complete")
}
