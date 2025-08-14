# mcp update

Updates the configuration of an existing MCP server.

For a complete overview of server management, see the **[Server Management Guide](../../guide/essentials/server-management)**.

## Synopsis

```bash
# Standard syntax
npx -y @1mcp/agent mcp update <name> [options]

# Quick syntax with " -- " pattern (updates command and args)
npx -y @1mcp/agent mcp update <name> [options] -- <command> [args...]
```

## Arguments

- **`<name>`**
  - The name of the server to update.
  - **Required**: Yes

## Options

- **`--tags <tags>`**
  - A new comma-separated list of tags. This will overwrite the existing tags.

- **`--env <key=value>`**
  - Add or update an environment variable. Can be specified multiple times.

- **`--timeout <ms>`**
  - A new connection timeout in milliseconds.

- **`--command <command>`**, **`--args <args>`**, **`--url <url>`**
  - You can also update the core properties of the server.

## Examples

### Standard Syntax

```bash
# Update the tags for a server
npx -y @1mcp/agent mcp update my-server --tags="new-tag,another-tag"

# Update an environment variable
npx -y @1mcp/agent mcp update my-stdio-server --env="NODE_ENV=production"

# Change the URL of an HTTP server
npx -y @1mcp/agent mcp update my-http-server --url="https://new.api.com/mcp"
```

### Quick " -- " Pattern Syntax

```bash
# Update server command using " -- " pattern
npx -y @1mcp/agent mcp update my-server -- npx -y updated-package

# Update command while preserving environment variables and tags
npx -y @1mcp/agent mcp update airtable -- npx -y @airtable/mcp-server-v2

# Update with additional options
npx -y @1mcp/agent mcp update my-server --timeout=10000 -- node updated-server.js
```

## See Also

- **[Server Management Guide](../../guide/essentials/server-management)**
