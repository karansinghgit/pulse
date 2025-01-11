package cli

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/karansingh/pulse/pkg/models"
	"github.com/spf13/cobra"
)

// NewStreamCommand creates a new stream command
func NewStreamCommand() *cobra.Command {
	var (
		serverURL  string
		service    string
		level      string
		format     string
		tags       []string
		follow     bool
		bufferSize int
	)

	cmd := &cobra.Command{
		Use:   "stream",
		Short: "Stream logs to Pulse",
		Long: `Stream logs from stdin or a file to Pulse.
It supports both plain text and JSON log formats.`,
		Example: `  # Stream logs from a file
  cat app.log | pulse stream --service my-app --level info

  # Stream logs from a running application
  my-app | pulse stream --service my-app --level info --follow
  
  # Stream JSON logs
  cat json-logs.log | pulse stream --format json`,
		RunE: func(cmd *cobra.Command, args []string) error {
			return runStream(cmd.InOrStdin(), serverURL, service, level, format, tags, follow, bufferSize)
		},
	}

	cmd.Flags().StringVar(&serverURL, "server", "http://localhost:8080", "Pulse server URL")
	cmd.Flags().StringVar(&service, "service", "default", "Service name to tag logs with")
	cmd.Flags().StringVar(&level, "level", "INFO", "Default log level if not provided in the log")
	cmd.Flags().StringVar(&format, "format", "text", "Log format: 'text' or 'json'")
	cmd.Flags().StringArrayVar(&tags, "tag", []string{}, "Tags to add to logs (format: key=value)")
	cmd.Flags().BoolVar(&follow, "follow", false, "Keep the connection open and follow log input")
	cmd.Flags().IntVar(&bufferSize, "buffer", 100, "Number of log lines to buffer before sending")

	return cmd
}

func runStream(input io.Reader, serverURL, service, level, format string, tags []string, follow bool, bufferSize int) error {
	// Parse tags into a map
	tagMap := make(map[string]string)
	for _, tag := range tags {
		parts := strings.SplitN(tag, "=", 2)
		if len(parts) == 2 {
			tagMap[parts[0]] = parts[1]
		}
	}

	// Convert level string to LogLevel
	logLevel := models.LogLevel(strings.ToUpper(level))

	// Create a scanner to read input
	scanner := bufio.NewScanner(input)
	buffer := make([]models.LogEntry, 0, bufferSize)
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	sendLogs := func() error {
		if len(buffer) == 0 {
			return nil
		}

		// Send logs to the server
		jsonData, err := json.Marshal(buffer)
		if err != nil {
			return fmt.Errorf("error marshaling logs: %w", err)
		}

		resp, err := http.Post(serverURL+"/logs/batch", "application/json", bytes.NewBuffer(jsonData))
		if err != nil {
			return fmt.Errorf("error sending logs: %w", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			return fmt.Errorf("server error (status %d): %s", resp.StatusCode, body)
		}

		// Clear the buffer
		buffer = buffer[:0]
		return nil
	}

	done := make(chan struct{})
	go func() {
		for {
			select {
			case <-ticker.C:
				if err := sendLogs(); err != nil {
					fmt.Fprintf(os.Stderr, "Error sending logs: %v\n", err)
				}
			case <-done:
				return
			}
		}
	}()

	// Process input
	for scanner.Scan() {
		line := scanner.Text()
		var logEntry models.LogEntry

		// Parse the log based on format
		if format == "json" {
			if err := json.Unmarshal([]byte(line), &logEntry); err != nil {
				// If parsing fails, treat it as a regular message
				logEntry = models.LogEntry{
					Message:   line,
					Level:     logLevel,
					Service:   service,
					Timestamp: time.Now().UTC(),
					Tags:      tagMap,
				}
			}
		} else {
			// Simple text format
			logEntry = models.LogEntry{
				Message:   line,
				Level:     logLevel,
				Service:   service,
				Timestamp: time.Now().UTC(),
				Tags:      tagMap,
			}
		}

		// Add to buffer
		buffer = append(buffer, logEntry)

		// If buffer is full, send logs
		if len(buffer) >= bufferSize {
			if err := sendLogs(); err != nil {
				fmt.Fprintf(os.Stderr, "Error sending logs: %v\n", err)
			}
		}
	}

	// Final flush of buffer
	close(done)
	if err := sendLogs(); err != nil {
		fmt.Fprintf(os.Stderr, "Error sending logs: %v\n", err)
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("error reading input: %w", err)
	}

	return nil
}
