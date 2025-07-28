# Quick Start

Get 1MCP running in 5 minutes with a basic configuration.

## Prerequisites

- Node.js 18+

## Basic Setup

1.  **Create Configuration**

    ```bash
    # Create a basic config file
    cat > mcp.json << 'EOF'
    {
      "mcpServers": {
        "filesystem": {
          "command": ["npx", "-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
          "description": "File system access"
        }
      }
    }
    EOF
    ```

2.  **Start the Server**

    ```bash
    npx -y @1mcp/agent --config mcp.json --port 3000
    ```

3.  **Test Connection**

    The server is now running on port 3000. You can now connect your MCP client to this port.

That's it! Your 1MCP proxy is now running and aggregating MCP servers.

## Next Steps

- [Enable Authentication](/guide/authentication) for production use
- [Add More Servers](/guide/configuration) to expand capabilities

## Common Issues

**Server fails to start?**

- Check that Node.js 18+ is installed: `node --version`
- Verify the config file is valid JSON: `cat mcp.json | jq`

**Can't connect to MCP servers?**

- Ensure server commands are executable
- Check server logs for specific error messages
