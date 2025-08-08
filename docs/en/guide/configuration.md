# Configuration Deep Dive

The 1MCP Agent is highly configurable, allowing you to tailor its behavior for everything from local development to production deployments. Configuration can be managed through a JSON file, command-line arguments, and environment variables, which are applied in that order of precedence.

## Configuration Methods

1.  **JSON File**: The primary method for defining servers and settings.
2.  **Command-Line Flags**: For overriding specific settings at runtime.
3.  **Environment Variables**: Useful for containerized deployments and CI/CD.

---

## 1. JSON Configuration File

The agent uses a JSON file (e.g., `mcp.json`) to define backend servers and global settings.

### Default Locations

- **macOS**: `~/Library/Application Support/1mcp/config.json`
- **Linux**: `~/.config/1mcp/config.json`
- **Windows**: `%APPDATA%\1mcp\config.json`

You can override the path using the `--config` flag.

### Top-Level Structure

```json
{
  "mcpServers": {
    // Server definitions
  }
}
```

### `mcpServers` Section

This is a dictionary of all the backend MCP servers the agent will manage.

- **Key**: A unique, human-readable name for the server (e.g., `my-filesystem`).
- **Value**: A server configuration object.

#### Server Properties

- `command` (string, required for `stdio`): The command to execute.
- `args` (array of strings, optional): Arguments for the command.
- `url` (string, required for `http`): The URL for the remote MCP server.
- `transport` (string, optional): `stdio` or `http`. Defaults to `stdio` if `command` is present, `http` if `url` is present.
- `tags` (array of strings, required): Tags for routing and access control.
- `env` (object, optional): Environment variables for `stdio` servers.
- `timeout` (number, optional): Connection timeout in milliseconds.
- `enabled` (boolean, optional): Set to `false` to disable the server. Defaults to `true`.

#### Example `mcpServers`

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "mcp-server-filesystem",
      "args": ["--root", "/data"],
      "tags": ["files", "local-data"]
    },
    "remote-api": {
      "transport": "http",
      "url": "https://api.example.com/mcp",
      "tags": ["api", "prod"],
      "timeout": 15000
    }
  }
}
```

---

## 2. Command-Line Flags

Flags override settings from the JSON configuration file.

### Transport Options

- `--transport, -t <type>`: Transport type (`stdio`, `http`). `sse` is deprecated.

### HTTP Transport Options

- `--port, -P <port>`: HTTP port. Default: `3051`.
- `--host, -H <host>`: HTTP host. Default: `localhost`.
- `--external-url <url>`: Public-facing URL for the server.

### Configuration Options

- `--config, -c <path>`: Path to configuration file.
- `--config-watch`: Enable/disable configuration file watching. Default: `true`.

### Logging Options

- `--log-level <level>`: `error`, `warn`, `info`, `debug`.
- `--log-file <path>`: Path to log file.

### Security Options

- `--auth`: Enable OAuth 2.1 authentication. Default: `false`.
- `--client-id <id>`: OAuth client ID.
- `--client-secret <secret>`: OAuth client secret.
- `--scope-validation`: Enable scope-based authorization. Default: `false`.
- `--enhanced-security`: Enable extra security features. Default: `false`.

### Network Options

- `--trust-proxy <config>`: Trust proxy configuration. See [Trust Proxy Guide](../reference/trust-proxy). Default: `loopback`.

### Health Check Options

- `--health-info-level <level>`: `full`, `basic`, `minimal`. Default: `minimal`.

### Async Loading

- `--enable-async-loading`: Enables asynchronous MCP server loading.

---

## 3. Environment Variables

Environment variables are prefixed with `ONE_MCP_` and are useful for containerized environments. They override both JSON and CLI settings.

- `ONE_MCP_PORT`
- `ONE_MCP_HOST`
- `ONE_MCP_EXTERNAL_URL`
- `ONE_MCP_CONFIG_PATH`
- `ONE_MCP_CONFIG_WATCH`
- `ONE_MCP_LOG_LEVEL`
- `ONE_MCP_LOG_FILE`
- `ONE_MCP_AUTH`
- `ONE_MCP_CLIENT_ID`
- `ONE_MCP_CLIENT_SECRET`
- `ONE_MCP_SCOPE_VALIDATION`
- `ONE_MCP_ENHANCED_SECURITY`
- `ONE_MCP_TRUST_PROXY`
- `ONE_MCP_HEALTH_INFO_LEVEL`
- `ONE_E_MCP_ENABLE_ASYNC_LOADING`
- `ONE_MCP_SESSION_TTL`
- `ONE_MCP_SESSION_STORAGE_PATH`
- `ONE_MCP_RATE_LIMIT_WINDOW`
- `ONE_MCP_RATE_LIMIT_MAX`

---

## Hot-Reloading

The agent supports hot-reloading of the configuration file. If you modify the JSON file while the agent is running, it will automatically apply the new configuration without a restart.
