# 1MCP - One MCP Server for All

A unified Model Context Protocol server implementation that aggregates multiple MCP servers into one.

## Overview

1MCP (One MCP) is designed to simplify the way you work with AI coding assistants. Instead of configuring multiple MCP servers for different clients (Cursor, Roo Code, Claude, etc.), 1MCP provides a single, unified server that:

- Aggregates multiple MCP servers into one unified interface
- Reduces system resource usage by eliminating redundant server instances
- Simplifies configuration management across different AI coding assistants
- Provides a standardized way for AI models to interact with external tools and resources

The implementation includes:

- Express-based HTTP server with SSE (Server-Sent Events) support
- Winston-based logging system with MCP protocol integration
- Support for MCP capabilities and notifications
- Smart request routing and capability aggregation

## Server Implementation

The server is implemented using:

- Express.js for HTTP handling
- Server-Sent Events (SSE) for real-time communication
- MCP SDK for protocol implementation

### Server Configuration

The server runs on port 3050 by default and exposes the following endpoints:

- `/sse` - SSE endpoint for establishing connections
- `/messages` - Endpoint for receiving messages from clients

## MCP Logging Implementation

This project includes a Winston transport for the Model Context Protocol (MCP) logging protocol. The implementation allows logs from the agent to be sent to MCP clients using the standard MCP logging notification format.

### Features

- Seamless integration with Winston logger
- Automatic mapping of Winston log levels to MCP log levels
- Support for structured logging data
- Configurable logger name
- Connection-aware logging (only sends logs when clients are connected)
- Sensitive data sanitization

## Usage

You can run the server directly using `npx`:

```bash
# Run with HTTP/SSE transport (default)
npx -y @1mcp/agent

# Run with stdio transport
npx -y @1mcp/agent --transport stdio

# Show help
npx -y @1mcp/agent --help
```

Available options:
- `--transport, -t`: Transport type to use (choices: "stdio", "http", default: "http")
- `--help, -h`: Show help

## Development

Install dependencies:
```bash
pnpm install
```

Build the server:
```bash
pnpm build
```

For development with auto-rebuild:
```bash
pnpm watch
```

Run the server:
```bash
pnpm dev
```

## Installation

To use with Claude Desktop, add the server config:

On MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
On Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "agent": {
      "command": "/path/to/agent/build/index.js"
    }
  }
}
```

### Debugging

Since MCP servers communicate over stdio, debugging can be challenging. We recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector), which is available as a package script:

```bash
pnpm run inspector
```

The Inspector will provide a URL to access debugging tools in your browser.
