# MCP Agent

A Model Context Protocol server implementation.

## Overview

This project implements a server for the Model Context Protocol (MCP), providing a standardized way for AI models to interact with external tools and resources. The implementation includes:

- Express-based HTTP server with SSE (Server-Sent Events) support
- Winston-based logging system with MCP protocol integration
- Support for MCP capabilities and notifications

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

### How It Works

The implementation consists of three main components:

1. **MCPTransport**: A custom Winston transport that converts Winston log entries to MCP logging notifications and sends them to connected clients.

2. **Logger Configuration**: The Winston logger is configured with standard console and file transports, plus the MCP transport when a server is available.

3. **Server Integration**: The MCP transport is added to the logger when the server is initialized and enabled/disabled based on client connection status.

### Log Levels

Winston log levels are mapped to MCP log levels as follows:

| Winston Level | MCP Level |
|---------------|-----------|
| error         | error     |
| warn          | warning   |
| info          | info      |
| verbose       | debug     |
| debug         | debug     |
| silly         | debug     |

### Usage

The logger is used throughout the codebase with standard Winston methods:

```typescript
import logger from './logger';

// Log at different levels
logger.error('Error message');
logger.warn('Warning message');
logger.info('Info message');
logger.debug('Debug message');

// Log with metadata
logger.info('User action', { userId: 123, action: 'login' });
```

### Security Considerations

The implementation includes:

- Sanitization of potentially sensitive data fields (passwords, tokens, etc.)
- Connection-aware logging to prevent sending logs when no clients are connected

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
