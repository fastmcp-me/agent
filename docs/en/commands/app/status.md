# app status

Shows the current consolidation status of your desktop applications.

This command checks whether an application is configured to connect directly to its own MCP servers or to a central 1MCP instance.

For a complete overview of the consolidation workflow, see the **[App Consolidation Guide](../../guide/app-consolidation)**.

## Synopsis

```bash
npx -y @1mcp/agent app status [app-name] [options]
```

## Arguments

- **`[app-name]`**
  - The application to check. If omitted, it will show the status for all supported apps.

## Options

- **Environment Variable `LOG_LEVEL=debug`**
  - Set `LOG_LEVEL=debug` to show detailed configuration and backup information.

## Examples

```bash
# Show the status of all applications
npx -y @1mcp/agent app status

# Show the status for a specific app
npx -y @1mcp/agent app status claude-desktop

# Show detailed status information
LOG_LEVEL=debug npx -y @1mcp/agent app status
```

## See Also

- **[App Consolidation Guide](../../guide/app-consolidation#the-consolidation-workflow)**
