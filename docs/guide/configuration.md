# Configuration Deep Dive

The 1MCP Agent is configured using a JSON file, typically named `mcp.json`. This file allows you to define the backend MCP servers, set up authentication, and customize the agent's behavior.

## 1. Basic Structure

The root of the configuration file is a JSON object that can contain several top-level properties. The most important one is `mcpServers`.

```json
{
  "mcpServers": {
    // Server definitions go here
  }
}
```

## 2. `mcpServers`

This section is a dictionary of all the backend MCP servers you want the agent to manage. Each key is a unique identifier for the server, and the value is an object containing the server's configuration.

### Server Properties

- `command` (required): An array of strings representing the command and arguments to start the server. The first element is the executable, and subsequent elements are the arguments.
- `tags` (required): An array of strings used for routing requests. A server will only receive requests that include all the tags listed here.

### Example

```json
{
  "mcpServers": {
    "filesystem": {
      "command": ["node", "/path/to/your/filesystem-server.js"],
      "tags": ["filesystem"]
    },
    "search": {
      "command": ["python", "/app/search_server.py", "--port", "8080"],
      "tags": ["search", "web"]
    }
  }
}
```

## 3. Authentication and Security

The 1MCP Agent provides a robust set of authentication and security features that can be configured using command-line flags or environment variables. This approach allows for flexible and secure deployments.

### Command-Line Flags and Environment Variables

| Flag                         | Environment Variable               | Description                                                                                                                       |
| ---------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `--enable-auth`              | `ONE_MCP_ENABLE_AUTH`              | Enables OAuth 2.1 authentication.                                                                                                 |
| `--enable-scope-validation`  | `ONE_MCP_ENABLE_SCOPE_VALIDATION`  | Enables tag-based scope validation for OAuth 2.1.                                                                                 |
| `--enable-enhanced-security` | `ONE_MCP_ENABLE_ENHANCED_SECURITY` | Enables additional security middleware.                                                                                           |
| `--enable-async-loading`     | `ONE_MCP_ENABLE_ASYNC_LOADING`     | Enables asynchronous MCP server loading with listChanged notifications.                                                           |
| `--session-ttl`              | `ONE_MCP_SESSION_TTL`              | Sets the session expiry time in minutes.                                                                                          |
| `--session-storage-path`     | `ONE_MCP_SESSION_STORAGE_PATH`     | Specifies a custom directory for session storage.                                                                                 |
| `--rate-limit-window`        | `ONE_MCP_RATE_LIMIT_WINDOW`        | Sets the rate limit window in minutes for OAuth endpoints.                                                                        |
| `--rate-limit-max`           | `ONE_MCP_RATE_LIMIT_MAX`           | Sets the maximum number of requests per window for OAuth endpoints.                                                               |
| `--trust-proxy`              | `ONE_MCP_TRUST_PROXY`              | Configures the trust proxy settings for Express.js. See the [Trust Proxy documentation](/reference/trust-proxy) for more details. |

### Example

Here's how you might start the agent with authentication enabled:

```bash
npx -y @1mcp/agent --config mcp.json --enable-auth --session-ttl 60
```

This command starts the agent with authentication enabled and sets the session TTL to 60 minutes.

## 4. Asynchronous Loading Configuration

The 1MCP Agent supports asynchronous loading of MCP servers, which allows for faster startup times and better user experience. When enabled, the agent will start accepting connections immediately while MCP servers are being loaded in the background.

### Enabling Async Loading

Async loading is disabled by default to maintain backward compatibility. To enable it:

```bash
# Using CLI flag
npx -y @1mcp/agent --config mcp.json --enable-async-loading

# Using environment variable
export ONE_MCP_ENABLE_ASYNC_LOADING=true
npx -y @1mcp/agent --config mcp.json
```

### How It Works

When async loading is enabled:

1. **Immediate Connection**: Clients can connect to 1MCP immediately, even if no backend servers are ready yet
2. **Background Loading**: MCP servers start loading asynchronously in the background
3. **Real-Time Updates**: As servers become ready, clients receive `listChanged` notifications informing them of new capabilities
4. **Batched Notifications**: Multiple capability changes are batched together to prevent spam

### Benefits

- **Faster Startup**: No waiting for all servers to load before accepting connections
- **Progressive Discovery**: Capabilities become available as servers come online
- **Better UX**: Immediate responsiveness instead of blocking on slow servers
- **Scalable**: Works well with large numbers of MCP servers

### Legacy Mode

When async loading is disabled (default), 1MCP uses the traditional synchronous bootstrap process where all servers must be loaded before the agent becomes ready.

## 5. Hot-Reloading

The agent supports hot-reloading of the configuration file. If you make changes to `mcp.json` while the agent is running, it will automatically apply the new configuration without requiring a restart. This is useful for adding or removing backend servers on the fly.
