package cli

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"time"

	"github.com/spf13/cobra"
)

// NewDashboardCommand creates a new dashboard command
func NewDashboardCommand() *cobra.Command {
	var (
		serverURL string
		port      int
		noOpen    bool
	)

	cmd := &cobra.Command{
		Use:   "dashboard",
		Short: "Launch the Pulse dashboard UI",
		Long:  `Launch the Pulse dashboard UI in your default browser.`,
		Example: `  # Start the dashboard on the default port
  pulse dashboard

  # Start the dashboard on a custom port
  pulse dashboard --port 3000

  # Start the dashboard without opening a browser
  pulse dashboard --no-open`,
		RunE: func(cmd *cobra.Command, args []string) error {
			return runDashboard(serverURL, port, noOpen)
		},
	}

	cmd.Flags().StringVar(&serverURL, "server", "http://localhost:8080", "Pulse server URL")
	cmd.Flags().IntVar(&port, "port", 9000, "Port to serve the dashboard on")
	cmd.Flags().BoolVar(&noOpen, "no-open", false, "Don't open browser automatically")

	return cmd
}

func runDashboard(serverURL string, port int, noOpen bool) error {
	// Check if the server is accessible
	_, err := http.Get(serverURL + "/health")
	if err != nil {
		return fmt.Errorf("cannot connect to Pulse server at %s: %w", serverURL, err)
	}

	dashboardURL := fmt.Sprintf("http://localhost:%d", port)

	// Print startup message
	fmt.Printf("Starting Pulse Dashboard...\n")
	fmt.Printf("Dashboard URL: %s\n", dashboardURL)
	fmt.Printf("Connected to Pulse Server: %s\n", serverURL)
	fmt.Printf("\nPress Ctrl+C to exit\n\n")

	// Start HTTP server for dashboard in a goroutine
	go func() {
		// Configure server
		http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			http.ServeFile(w, r, "dashboard/index.html")
		})

		// Serve static files
		http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("dashboard/static"))))

		// Proxy API requests to the Pulse server
		http.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) {
			proxyRequest(w, r, serverURL)
		})

		// Serve on the specified port
		if err := http.ListenAndServe(fmt.Sprintf(":%d", port), nil); err != nil {
			fmt.Fprintf(os.Stderr, "Error starting dashboard server: %v\n", err)
			os.Exit(1)
		}
	}()

	// Open browser if requested
	if !noOpen {
		time.Sleep(500 * time.Millisecond) // Give the server a moment to start
		openBrowser(dashboardURL)
	}

	// Wait indefinitely (until Ctrl+C)
	select {}
}

// openBrowser opens the specified URL in the default browser
func openBrowser(url string) {
	var err error

	switch runtime.GOOS {
	case "linux":
		err = exec.Command("xdg-open", url).Start()
	case "windows":
		err = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	case "darwin":
		err = exec.Command("open", url).Start()
	default:
		err = fmt.Errorf("unsupported platform")
	}

	if err != nil {
		fmt.Fprintf(os.Stderr, "Error opening browser: %v\n", err)
	}
}

// proxyRequest forwards a request to the Pulse server
func proxyRequest(w http.ResponseWriter, r *http.Request, serverURL string) {
	// Create a new request to the backend
	proxyURL := serverURL + r.URL.Path
	if r.URL.RawQuery != "" {
		proxyURL += "?" + r.URL.RawQuery
	}

	// Create the request
	proxyReq, err := http.NewRequest(r.Method, proxyURL, r.Body)
	if err != nil {
		http.Error(w, "Error creating proxy request", http.StatusInternalServerError)
		return
	}

	// Copy headers
	for key, values := range r.Header {
		for _, value := range values {
			proxyReq.Header.Add(key, value)
		}
	}

	// Execute the request
	client := &http.Client{}
	resp, err := client.Do(proxyReq)
	if err != nil {
		http.Error(w, "Error proxying request: "+err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Copy response headers
	for key, values := range resp.Header {
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}

	// Set response status code
	w.WriteHeader(resp.StatusCode)

	// Copy response body
	_, err = io.Copy(w, resp.Body)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error copying response: %v\n", err)
	}
}
