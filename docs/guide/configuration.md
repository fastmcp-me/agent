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

## 4. Hot-Reloading

The agent supports hot-reloading of the configuration file. If you make changes to `mcp.json` while the agent is running, it will automatically apply the new configuration without requiring a restart. This is useful for adding or removing backend servers on the fly.
