# Server Filtering by Tags

The 1MCP Agent provides tag-based server filtering, allowing you to direct requests to specific backend MCP servers based on their assigned tags. This feature helps organize and control access to different MCP servers by their capabilities.

## How It Works

When connecting to the 1MCP Agent, you can specify tags to filter which backend servers are available. The agent will only connect to and route requests to servers that have the specified tags.

For example, if you have two servers—one with the `filesystem` tag and another with the `search` tag—you can control which servers are available by including the appropriate tags in your connection.

## Configuration

To enable server filtering, you need to assign tags to your backend servers in your `mcp.json` configuration file.

```json
{
  "mcpServers": {
    "file_server": {
      "command": ["npx", "-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
      "tags": ["filesystem", "read-only"]
    },
    "search_server": {
      "command": ["uvx", "mcp-server-fetch"],
      "tags": ["search", "web"]
    }
  }
}
```

In this example:

- The `file_server` is tagged with `filesystem` and `read-only`.
- The `search_server` is tagged with `search` and `web`.

## Usage

When connecting to the 1MCP agent, you can specify tags to filter which servers are available:

```bash
# Only connect to servers with "filesystem" tag
npx -y @1mcp/agent --transport stdio --tags "filesystem"

# Connect to servers with either "filesystem" or "web" tags
npx -y @1mcp/agent --transport stdio --tags "filesystem,web"
```

For HTTP connections with tag filtering, specify tags in the request headers or authentication scope (when OAuth is enabled).

If multiple tags are specified, servers must have ALL the specified tags to be included.
