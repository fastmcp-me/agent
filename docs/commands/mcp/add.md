# mcp add

Adds a new MCP server to the 1MCP configuration.

For a complete overview of server management, see the **[Server Management Guide](../../guide/server-management)**.

## Synopsis

```bash
# Standard syntax
npx -y @1mcp/agent mcp add <name> --type <type> [options]

# Quick syntax with " -- " pattern (auto-detects type as stdio)
npx -y @1mcp/agent mcp add <name> [options] -- <command> [args...]
```

## Arguments

- **`<name>`**
  - A unique name for the new server.
  - **Required**: Yes

## Options

- **`--type <type>`**
  - The transport type for the server.
  - **Required**: Yes (or auto-detected when using " -- " pattern)
  - **Values**: `stdio`, `http`

- **`--command <command>`**
  - The command to execute for `stdio` servers.
  - **Required for `stdio`**

- **`--args <args>`**
  - Comma-separated list of arguments for the `stdio` command.

- **`--url <url>`**
  - The URL for `http` servers.
  - **Required for `http`**

- **`--tags <tags>`**
  - Comma-separated list of tags for organization.

- **`--env <key=value>`**
  - Environment variables for `stdio` servers. Can be specified multiple times.

- **`--timeout <ms>`**
  - Connection timeout in milliseconds.

## Examples

### Standard Syntax

```bash
# Add a local filesystem server
npx -y @1mcp/agent mcp add files --type=stdio --command="mcp-server-fs" --args="--root,./"

# Add a remote HTTP server with tags
npx -y @1mcp/agent mcp add remote-api --type=http --url="https://api.example.com/mcp" --tags="api,prod"
```

### Quick " -- " Pattern Syntax

```bash
# Add server using " -- " pattern (type auto-detected as stdio)
npx -y @1mcp/agent mcp add airtable --env AIRTABLE_API_KEY=your_key -- npx -y airtable-mcp-server

# Add server with Windows command wrapper
npx -y @1mcp/agent mcp add my-server -- cmd /c npx -y @some/package

# Combine environment variables with " -- " pattern
npx -y @1mcp/agent mcp add context7 --env API_TOKEN=secret --tags=ai,tools -- npx -y @context7/server
```

## See Also

- **[Server Management Guide](../../guide/server-management)**
