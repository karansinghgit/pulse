package cli

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/olekukonko/tablewriter"
	"github.com/spf13/cobra"
)

// NewQueryCommand creates a new query command
func NewQueryCommand() *cobra.Command {
	var (
		serverURL  string
		dataType   string
		service    string
		limit      int
		format     string
		since      string
		until      string
		filter     []string
		orderBy    string
		descending bool
	)

	cmd := &cobra.Command{
		Use:   "query",
		Short: "Query data from Pulse",
		Long: `Query logs, metrics, or traces from Pulse.
Supports various filters and output formats.`,
		Example: `  # Query logs
  pulse query logs --service my-app --limit 100

  # Query metrics
  pulse query metrics --service payment-api

  # Query traces
  pulse query traces --service user-service --since 1h

  # Query with custom filters
  pulse query logs --filter "level=ERROR" --filter "message:*timeout*"`,
		RunE: func(cmd *cobra.Command, args []string) error {
			// Validate data type
			dataType = strings.ToLower(dataType)
			if dataType != "logs" && dataType != "metrics" && dataType != "traces" {
				return fmt.Errorf("invalid data type: %s. Must be one of: logs, metrics, traces", dataType)
			}

			// Validate format
			format = strings.ToLower(format)
			if format != "table" && format != "json" && format != "text" {
				return fmt.Errorf("invalid format: %s. Must be one of: table, json, text", format)
			}

			return runQuery(dataType, serverURL, service, limit, format, since, until, filter, orderBy, descending)
		},
	}

	cmd.Flags().StringVar(&serverURL, "server", "http://localhost:8080", "Pulse server URL")
	cmd.Flags().StringVar(&dataType, "type", "logs", "Data type to query: logs, metrics, or traces")
	cmd.Flags().StringVar(&service, "service", "", "Filter by service name")
	cmd.Flags().IntVar(&limit, "limit", 100, "Maximum number of results to return")
	cmd.Flags().StringVar(&format, "format", "table", "Output format: table, json, or text")
	cmd.Flags().StringVar(&since, "since", "1h", "Show data since this time (e.g. 30m, 2h, 1d)")
	cmd.Flags().StringVar(&until, "until", "", "Show data until this time (e.g. 10m, 1h)")
	cmd.Flags().StringArrayVar(&filter, "filter", []string{}, "Filter expressions (format: key=value or key:*value*)")
	cmd.Flags().StringVar(&orderBy, "order-by", "timestamp", "Field to order results by")
	cmd.Flags().BoolVar(&descending, "desc", true, "Order results in descending order")

	return cmd
}

func runQuery(dataType, serverURL, service string, limit int, format, since, until string, filter []string, orderBy string, descending bool) error {
	// Build query URL
	params := url.Values{}
	if service != "" {
		params.Add("service", service)
	}
	params.Add("limit", fmt.Sprintf("%d", limit))
	if since != "" {
		params.Add("since", since)
	}
	if until != "" {
		params.Add("until", until)
	}
	if orderBy != "" {
		params.Add("order_by", orderBy)
	}
	if descending {
		params.Add("order", "desc")
	} else {
		params.Add("order", "asc")
	}

	// Add filters
	for _, f := range filter {
		params.Add("filter", f)
	}

	// Construct URL
	queryURL := fmt.Sprintf("%s/api/%s?%s", serverURL, dataType, params.Encode())

	// Execute HTTP request
	resp, err := http.Get(queryURL)
	if err != nil {
		return fmt.Errorf("error querying data: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("server error (status %d): %s", resp.StatusCode, body)
	}

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("error reading response: %w", err)
	}

	// Process based on format
	switch format {
	case "json":
		// Pretty print JSON
		var prettyJSON bytes.Buffer
		if err := json.Indent(&prettyJSON, body, "", "  "); err != nil {
			fmt.Println(string(body))
		} else {
			fmt.Println(prettyJSON.String())
		}

	case "text":
		// Print as text
		var data []map[string]interface{}
		if err := json.Unmarshal(body, &data); err != nil {
			return fmt.Errorf("error parsing response: %w", err)
		}

		for _, item := range data {
			fmt.Println(formatItem(item, dataType))
		}

	case "table":
		// Print as table
		var data []map[string]interface{}
		if err := json.Unmarshal(body, &data); err != nil {
			return fmt.Errorf("error parsing response: %w", err)
		}

		if len(data) == 0 {
			fmt.Println("No results found.")
			return nil
		}

		// Create table
		table := tablewriter.NewWriter(os.Stdout)

		// Set headers based on data type
		switch dataType {
		case "logs":
			table.SetHeader([]string{"Timestamp", "Service", "Level", "Message"})
			for _, item := range data {
				row := []string{
					fmt.Sprintf("%v", item["timestamp"]),
					fmt.Sprintf("%v", item["service"]),
					fmt.Sprintf("%v", item["level"]),
					fmt.Sprintf("%v", item["message"]),
				}
				table.Append(row)
			}

		case "metrics":
			table.SetHeader([]string{"Timestamp", "Service", "Name", "Value", "Type"})
			for _, item := range data {
				row := []string{
					fmt.Sprintf("%v", item["timestamp"]),
					fmt.Sprintf("%v", item["service"]),
					fmt.Sprintf("%v", item["name"]),
					fmt.Sprintf("%v", item["value"]),
					fmt.Sprintf("%v", item["type"]),
				}
				table.Append(row)
			}

		case "traces":
			table.SetHeader([]string{"Timestamp", "Service", "Name", "Duration (ms)", "Status"})
			for _, item := range data {
				row := []string{
					fmt.Sprintf("%v", item["start_time"]),
					fmt.Sprintf("%v", item["service"]),
					fmt.Sprintf("%v", item["name"]),
					fmt.Sprintf("%v", item["duration_ms"]),
					fmt.Sprintf("%v", item["status"]),
				}
				table.Append(row)
			}
		}

		table.Render()
	}

	return nil
}

func formatItem(item map[string]interface{}, dataType string) string {
	switch dataType {
	case "logs":
		timestamp, _ := item["timestamp"].(string)
		service, _ := item["service"].(string)
		level, _ := item["level"].(string)
		message, _ := item["message"].(string)
		return fmt.Sprintf("[%s] %s [%s] %s", timestamp, service, level, message)

	case "metrics":
		timestamp, _ := item["timestamp"].(string)
		service, _ := item["service"].(string)
		name, _ := item["name"].(string)
		value := item["value"]
		return fmt.Sprintf("[%s] %s %s=%v", timestamp, service, name, value)

	case "traces":
		startTime, _ := item["start_time"].(string)
		service, _ := item["service"].(string)
		name, _ := item["name"].(string)
		duration, _ := item["duration_ms"].(float64)
		return fmt.Sprintf("[%s] %s %s (%.2fms)", startTime, service, name, duration)

	default:
		jsonStr, _ := json.Marshal(item)
		return string(jsonStr)
	}
}
