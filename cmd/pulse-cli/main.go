package main

import (
	"fmt"
	"os"

	"github.com/karansingh/pulse/pkg/cli"
	"github.com/spf13/cobra"
)

func main() {
	// Create the root command
	rootCmd := &cobra.Command{
		Use:   "pulse",
		Short: "Pulse - Lightweight Observability Platform",
		Long: `Pulse CLI provides tools for working with the Pulse observability platform.
It allows streaming logs, querying data, and launching the dashboard.`,
		Run: func(cmd *cobra.Command, args []string) {
			// If no subcommand is provided, show help
			cmd.Help()
		},
	}

	// Add subcommands
	rootCmd.AddCommand(cli.NewStreamCommand())
	rootCmd.AddCommand(cli.NewQueryCommand())
	rootCmd.AddCommand(cli.NewDashboardCommand())
	rootCmd.AddCommand(cli.NewConfigCommand())

	// Execute the command
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
