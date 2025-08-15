# mcp list

Lists all configured MCP servers.

For a complete overview of server management, see the **[Server Management Guide](../../guide/essentials/server-management)**.

## Synopsis

```bash
npx -y @1mcp/agent mcp list [options]
```

## Options

- **`--tags <tags>`**
  - Filter the list to only show servers with the specified comma-separated tags.

- **`--show-disabled`**
  - Include disabled servers in the list.

- **Environment Variable `ONE_MCP_LOG_LEVEL=debug`**
  - Set `ONE_MCP_LOG_LEVEL=debug` to show detailed information, including command/URL, arguments, and environment variables.

## Examples

```bash
# List all enabled servers
npx -y @1mcp/agent mcp list

# List all servers, including disabled ones
npx -y @1mcp/agent mcp list --show-disabled

# List all servers with the "prod" tag
npx -y @1mcp/agent mcp list --tags=prod

# Show detailed information for all servers
ONE_MCP_LOG_LEVEL=debug npx -y @1mcp/agent mcp list
```

## See Also

- **[Server Management Guide](../../guide/essentials/server-management)**
