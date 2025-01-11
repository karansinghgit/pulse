package cli

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/mitchellh/go-homedir"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

const (
	// Default config file name
	defaultConfigFile = ".pulse.yaml"
)

// Configuration settings
type Config struct {
	ServerURL      string            `mapstructure:"server_url"`
	DefaultService string            `mapstructure:"default_service"`
	Tags           map[string]string `mapstructure:"tags"`
}

// NewConfigCommand creates a new config command
func NewConfigCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "config",
		Short: "Manage Pulse configuration",
		Long:  `View and modify Pulse CLI configuration settings.`,
	}

	// Add subcommands
	cmd.AddCommand(newConfigViewCommand())
	cmd.AddCommand(newConfigSetCommand())
	cmd.AddCommand(newConfigInitCommand())

	return cmd
}

// newConfigViewCommand creates a command to view config
func newConfigViewCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "view",
		Short: "View current configuration",
		Long:  `Display all configuration settings currently in use.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, err := loadConfig()
			if err != nil {
				return fmt.Errorf("error loading config: %w", err)
			}

			fmt.Println("Current Configuration:")
			fmt.Printf("Server URL: %s\n", cfg.ServerURL)
			fmt.Printf("Default Service: %s\n", cfg.DefaultService)

			fmt.Println("\nDefault Tags:")
			if len(cfg.Tags) == 0 {
				fmt.Println("  No default tags configured")
			} else {
				for k, v := range cfg.Tags {
					fmt.Printf("  %s: %s\n", k, v)
				}
			}

			configFile := viper.ConfigFileUsed()
			if configFile != "" {
				fmt.Printf("\nConfig file: %s\n", configFile)
			} else {
				fmt.Printf("\nNo config file in use. Run 'pulse config init' to create one.\n")
			}

			return nil
		},
	}
}

// newConfigSetCommand creates a command to set config values
func newConfigSetCommand() *cobra.Command {
	var key, value string

	cmd := &cobra.Command{
		Use:   "set [key] [value]",
		Short: "Set a configuration value",
		Long:  `Set a specific configuration value in the Pulse config file.`,
		Example: `  # Set server URL
  pulse config set server_url http://pulse-server:8080

  # Set default service
  pulse config set default_service my-app

  # Set a default tag
  pulse config set tags.environment production`,
		Args: cobra.ExactArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			key = args[0]
			value = args[1]

			// Load existing config
			cfg, err := loadConfig()
			if err != nil {
				return fmt.Errorf("error loading config: %w", err)
			}

			// Set the value based on the key
			if strings.HasPrefix(key, "tags.") {
				tagName := strings.TrimPrefix(key, "tags.")
				if cfg.Tags == nil {
					cfg.Tags = make(map[string]string)
				}
				cfg.Tags[tagName] = value
				viper.Set("tags", cfg.Tags)
			} else {
				viper.Set(key, value)
			}

			// Save the updated config
			configFile := viper.ConfigFileUsed()
			if configFile == "" {
				home, err := homedir.Dir()
				if err != nil {
					return fmt.Errorf("error finding home directory: %w", err)
				}
				configFile = filepath.Join(home, defaultConfigFile)
			}

			if err := viper.WriteConfigAs(configFile); err != nil {
				return fmt.Errorf("error writing config file: %w", err)
			}

			fmt.Printf("Set %s to %s in %s\n", key, value, configFile)
			return nil
		},
	}

	return cmd
}

// newConfigInitCommand creates a command to initialize a config file
func newConfigInitCommand() *cobra.Command {
	var force bool

	cmd := &cobra.Command{
		Use:   "init",
		Short: "Initialize a new config file",
		Long:  `Create a new configuration file with default settings.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			// Find home directory
			home, err := homedir.Dir()
			if err != nil {
				return fmt.Errorf("error finding home directory: %w", err)
			}

			// Set default config file path
			configFile := filepath.Join(home, defaultConfigFile)

			// Check if file already exists
			if _, err := os.Stat(configFile); err == nil && !force {
				return fmt.Errorf("config file already exists at %s (use --force to overwrite)", configFile)
			}

			// Set default values
			viper.Set("server_url", "http://localhost:8080")
			viper.Set("default_service", "default")
			viper.Set("tags", map[string]string{
				"env": "development",
			})

			// Write config file
			if err := viper.WriteConfigAs(configFile); err != nil {
				return fmt.Errorf("error creating config file: %w", err)
			}

			fmt.Printf("Created new config file at %s\n", configFile)
			return nil
		},
	}

	cmd.Flags().BoolVar(&force, "force", false, "Overwrite existing config file if it exists")

	return cmd
}

// loadConfig loads the configuration from file or defaults
func loadConfig() (*Config, error) {
	// Find home directory
	home, err := homedir.Dir()
	if err != nil {
		return nil, fmt.Errorf("error finding home directory: %w", err)
	}

	// Search for config in home directory
	viper.AddConfigPath(home)
	viper.SetConfigName(".pulse")
	viper.SetConfigType("yaml")

	// Set defaults
	viper.SetDefault("server_url", "http://localhost:8080")
	viper.SetDefault("default_service", "default")
	viper.SetDefault("tags", map[string]string{})

	// Read in config
	viper.ReadInConfig()
	// Errors are ignored on purpose - if no config file exists, we'll use defaults

	// Parse config
	var cfg Config
	if err := viper.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("error parsing config: %w", err)
	}

	return &cfg, nil
}
