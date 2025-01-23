# Pulse Documentation

Welcome to the Pulse documentation. Pulse is a lightweight observability platform designed to unify logs, metrics, and traces without vendor lock-in.

## Introduction

Pulse provides a unified, open-source solution for collecting, storing, and visualizing observability data. It is designed to be lightweight, easy to integrate, and to support modern observability patterns without tying you to a specific vendor.

## Key Features

- **Unified Data Model**: Collect logs, metrics, and traces with a consistent API
- **Embedded Storage**: SQLite-based storage with WAL mode for performance and durability
- **Real-Time Dashboard**: Visualize your observability data in real-time via WebSockets
- **CLI-First Design**: Pipe-friendly interface for Unix-style workflows
- **Language-Agnostic**: Simple HTTP APIs make integration with any language or framework easy
- **Extensible Core**: Pluggable architecture for storage backends and processors

## Getting Started

* [Installation](installation.md)
* [Quick Start Guide](quickstart.md)
* [Configuration](configuration.md)

## Integration Guides

* [Log Integration](integration/logs.md)
* [Metrics Integration](integration/metrics.md)
* [Traces Integration](integration/traces.md)

## API Reference

* [HTTP API](api/http.md)
* [WebSocket API](api/websocket.md)
* [Command Line Interface](api/cli.md)

## Architecture

* [System Design](architecture/design.md)
* [Data Models](architecture/data-models.md)
* [Storage Engine](architecture/storage.md)
* [Processor Pipeline](architecture/processor.md)

## Development

* [Contributing Guidelines](development/contributing.md)
* [Building from Source](development/building.md)
* [Testing Guide](development/testing.md)
* [Extension Development](development/extensions.md)

## Support & Community

* [Troubleshooting](support/troubleshooting.md)
* [FAQ](support/faq.md)
* [Getting Help](support/help.md)

## Release Notes

* [Version History](releases/history.md)
* [Roadmap](releases/roadmap.md) 