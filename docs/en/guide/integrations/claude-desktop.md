# Claude Desktop Integration

Learn how to integrate your 1MCP server with Claude Desktop using two different approaches: **local configuration consolidation** (recommended for simplicity) and **remote custom connectors** (for advanced use cases).

## Integration Approaches

### 1. Local Configuration Consolidation (Recommended)

The simplest approach is to consolidate your existing MCP servers into Claude Desktop's configuration using 1MCP as a local proxy. This approach:

- Uses stdio transport (no network setup required)
- Automatically configures Claude Desktop to use 1MCP
- Preserves your existing MCP server configurations
- Works entirely offline with no HTTPS/tunneling requirements

### 2. Remote Custom Connectors (Advanced)

For advanced scenarios, you can connect to a remote 1MCP server using Claude Desktop's custom connector feature with HTTP or SSE transport. This approach:

- Requires public HTTPS URL (tunneling/reverse proxy)
- Supports OAuth authentication
- Enables remote access to centralized 1MCP servers
- Useful for team/enterprise deployments

## Why Use 1MCP with Claude Desktop?

- **Direct Integration**: Connect remotely without local setup
- **Unified Access**: Access multiple MCP servers through one endpoint
- **Authentication**: Built-in OAuth 2.1 support for secure connections
- **Server Management**: Centralized management of all your MCP tools
- **Hot Reloading**: Add/remove servers without restarting Claude Desktop

## Quick paths

### Choose your approach

- **Local (Recommended)**: No networking; 1MCP runs via stdio and auto-wires Claude Desktop
- **Remote (Advanced)**: Expose 1MCP over HTTPS and add a custom connector

### Local setup (Recommended)

```bash
# Optionally add some servers first
npx -y @1mcp/agent mcp add context7 -- npx -y @upstash/context7-mcp
npx -y @1mcp/agent mcp add sequential -- npx -y @modelcontextprotocol/server-sequential-thinking

# Consolidate Claude Desktop to use 1MCP via stdio
npx -y @1mcp/agent app consolidate claude-desktop --dry-run  # Preview
npx -y @1mcp/agent app consolidate claude-desktop
```

Then restart Claude Desktop. Backups are created automatically; restore anytime:

```bash
npx -y @1mcp/agent app backups claude-desktop
npx -y @1mcp/agent app restore claude-desktop
```

## Remote custom connector (Advanced)

1. Start server

```bash
npx -y @1mcp/agent serve --transport http --port 3001 --external-url https://your-domain.com # dev
npx -y @1mcp/agent serve --transport http --port 3001 --enable-auth --external-url https://your-domain.com  # prod
```

Served paths: `/mcp` (Streamable HTTP), `/sse` + `/messages` (SSE), `/oauth` (OAuth), `/health` (health).

2. Expose server over HTTPS

- ngrok: `ngrok http 3001` → use `https://<id>.ngrok-free.app/mcp`
- Reverse proxy:
  - nginx: proxy `location /` → `http://localhost:3001` (HTTP/1.1, buffering off)
  - Caddy: `reverse_proxy localhost:3001`
  - Traefik: router for host → service `1mcp` on port 3001

3. Add connector in Claude Desktop

- Name: any (e.g., "1mcp")
- URL: your public `https://.../mcp`
- Optional: OAuth Client ID/Secret

> Note: OAuth 2.1 validates the issuer URL. Always set `--external-url` to your public origin (for example, `https://your-domain.com` or `https://abc123.ngrok-free.app`).
>
> - Use HTTPS
> - Do not include a path (no `/mcp`)
> - Match exactly what Claude Desktop uses

### Step 2: Add Custom Connector in Claude Desktop

1. **Open Claude Desktop Settings**
   - Click on your profile/settings in Claude Desktop
   - Navigate to "Connectors" or look for connector management

2. **Add Custom Connector**
   - Click "**Add custom connector**"
   - You'll see a dialog like this:

![Step 1: Add custom connector dialog](/images/claude-desktop-step1.png)

3. **Enter Connection Details**
   - **Name**: Enter a name for your connector (e.g., "1mcp")
   - **URL**: Enter your public HTTPS URL:
     - With ngrok: `https://abc123.ngrok-free.app/mcp`
     - With reverse proxy: `https://your-domain.com/mcp`
   - **OAuth Client ID** (optional): If using authentication
   - **OAuth Client Secret** (optional): If using authentication

4. **Confirm Trust**
   - Review the security warning
   - Click "**Add**" to confirm you trust this connector

### Step 3: Verify Connection

After adding the connector, you should see your 1MCP tools available:

![Step 2: Available tools from 1MCP](/images/claude-desktop-step2.png)

The tools shown will depend on which MCP servers you have configured in your 1MCP instance. Common tools include:

- Context7 library documentation tools
- Sequential thinking tools
- Playwright browser automation
- And any other MCP servers you've added

### Step 4: Use Your Tools

Once connected, your 1MCP tools will appear in Claude Desktop's interface:

![Step 3: Tools available in chat](/images/claude-desktop-step3.png)

You can now use these tools directly in your conversations with Claude.

> 💡 Tip: If any service shows "Awaiting OAuth", open your server's OAuth dashboard at `https://your-domain.com/oauth` and click Authorize for that service. Then retry in Claude Desktop.

## Server quick config

```bash
# Start
npx -y @1mcp/agent serve --transport http --port 3001 --external-url https://your-domain.com

# Enable auth (recommended for production)
npx -y @1mcp/agent serve --transport http --port 3001 --enable-auth --external-url https://your-domain.com

# Filter exposed servers by tags
npx -y @1mcp/agent serve --transport http --port 3001 --tags "context7,sequential" --external-url https://your-domain.com

# Bind to all interfaces (behind reverse proxy)
npx -y @1mcp/agent serve --transport http --port 3001 --host 0.0.0.0 --external-url https://your-domain.com
```

### Authentication

- Enable: `npx -y @1mcp/agent serve --transport http --port 3001 --enable-auth`
- Configure Client ID/Secret in Claude Desktop if needed; OAuth flow is automatic

## Troubleshooting

### Local Configuration Issues

#### Tools Not Appearing After Consolidation

**Symptoms**: Consolidation completes but tools don't appear in Claude Desktop.

**Solutions**:

1. **Restart Claude Desktop**: Ensure you've completely restarted Claude Desktop after consolidation

2. **Check Configuration**: Verify the consolidation worked correctly

   ```bash
   # Check the generated configuration
   cat "~/Library/Application Support/Claude/claude_desktop_config.json"
   ```

3. **Test 1MCP Server**: Verify 1MCP is working correctly

   ```bash
   # Check server status
   npx -y @1mcp/agent mcp status

   # Test stdio transport
   echo '{"jsonrpc": "2.0","id": 1,"method": "initialize","params": {"protocolVersion": "2025-06-18","capabilities": {},"clientInfo": {"name": "ExampleClient","title": "Example Client Display Name","version": "1.0.0"}}}' | npx -y @1mcp/agent serve --transport stdio
   ```

#### "Consolidation Failed" Error

**Symptoms**: The consolidation command fails with errors.

**Solutions**:

1. **Use Force Flag**: Skip connectivity validation

   ```bash
   npx -y @1mcp/agent app consolidate claude-desktop --force
   ```

2. **Check Permissions**: Ensure write access to Claude Desktop's config directory

   ```bash
   ls -la "~/Library/Application Support/Claude/"
   ```

3. **Manual Cleanup**: If consolidation is partially complete

   ```bash
   # Restore from backup
   npx -y @1mcp/agent app restore claude-desktop

   # Or manually reset
   npx -y @1mcp/agent app consolidate claude-desktop --force
   ```

#### "Configuration Backup Failed" Error

**Symptoms**: Unable to create backup of existing configuration.

**Solutions**:

1. **Check Disk Space**: Ensure sufficient disk space
2. **Check Permissions**: Verify write access to backup directory
3. **Use Force Mode**: Proceed without backup (use with caution)
   ```bash
   npx -y @1mcp/agent app consolidate claude-desktop --force --backup-only
   ```

### Remote Custom Connector Issues

#### "Failed to Connect" Error

**Symptoms**: Claude Desktop shows connection failed when adding the connector.

**Solutions**:

1. **Check Server Status**: Ensure your 1MCP server is running

   ```bash
   npx -y @1mcp/agent mcp status  # Check if servers are running
   ```

2. **Verify URL**: Ensure the URL is correct and accessible

   ```bash
   # Health endpoints are served at /health (not under /mcp)
   curl https://your-domain.com/health  # Test basic connectivity
   ```

3. **Check Firewall**: Ensure the port is open and accessible

#### Tools Not Appearing

**Symptoms**: Connector connects but no tools are visible.

**Solutions**:

1. **Check Server Configuration**: Verify MCP servers are properly configured

   ```bash
   npx -y @1mcp/agent mcp list  # List configured servers
   ```

2. **Restart Both**: Restart both 1MCP and Claude Desktop

#### Authentication Issues

**Symptoms**: OAuth authentication fails or keeps asking for credentials.

**Solutions**:

1. **Check OAuth Configuration**: Ensure OAuth is enabled in 1MCP
2. **Issuer match**: Set `--external-url` to your public HTTPS origin (no path) and ensure it matches Claude’s connector URL origin exactly
3. **Verify Credentials**: Double-check Client ID and Secret in Claude Desktop
4. **Clear Cache**: Try removing and re-adding the connector

### Debugging Steps

1. **Test Direct Connection**:

   ```bash
   # Test your exposed HTTPS endpoint
   curl -X POST https://your-domain.com/mcp \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc": "2.0","id": 1,"method": "initialize","params": {"protocolVersion": "2025-06-18","capabilities": {},"clientInfo": {"name": "ExampleClient","title": "Example Client Display Name","version": "1.0.0"}}}'
   ```

2. **Check Server Logs**:

   ```bash
   ONE_MCP_LOG_LEVEL=debug npx -y @1mcp/agent serve --transport http --port 3001
   ```

3. **Health Check**:
   ```bash
   # Check if server is responding through your proxy/tunnel
   curl https://your-domain.com/health
   ```

## Security Considerations

### Production Deployment

1. HTTPS via reverse proxy (nginx/Caddy/Traefik)
2. Enable OAuth in production: `--enable-auth`
3. Harden network: firewall, VPN/private networks, rate limiting at proxy, bind to localhost when proxied

### Trust and Permissions

- **Review Carefully**: Only connect to trusted 1MCP servers
- **Understand Permissions**: Review what tools will be accessible
- **Regular Audits**: Periodically review connected connectors and their permissions

## Advanced Usage

### Multiple Environments

You can add multiple 1MCP connectors for different environments:

1. **Development Environment**:
   - Name: "1MCP Dev"
   - URL: `https://dev-abc123.ngrok-free.app/mcp` (using ngrok)

2. **Production Environment**:
   - Name: "1MCP Prod"
   - URL: `https://prod-server.com/mcp`
   - OAuth credentials for production

### Server Filtering

Control which tools are available by filtering servers:

```bash
# Only expose specific capabilities
npx -y @1mcp/agent serve --transport http --port 3001 --tags "context7,sequential"
```

## Best Practices

### Local

- Discover first → `app discover`
- Preview → `--dry-run`
- Backups are automatic
- Restart Claude Desktop after consolidation
- Keep agent updated; monitor with `mcp status`

### Remote

- Start simple (no auth), then add OAuth + HTTPS for prod
- Health checks + monitoring
- Review permissions regularly; keep servers updated

## Examples

### Local (recommended)

```bash
# 1. Install 1MCP agent
npm install -g @1mcp/agent

# 2. Add some useful MCP servers
npx -y @1mcp/agent mcp add context7 -- npx -y @upstash/context7-mcp
npx -y @1mcp/agent mcp add sequential -- npx -y @modelcontextprotocol/server-sequential-thinking
npx -y @1mcp/agent mcp add playwright -- npx -y @playwright/mcp

# 3. Preview what consolidation will do
npx -y @1mcp/agent app consolidate claude-desktop --dry-run

# 4. Consolidate Claude Desktop configuration
npx -y @1mcp/agent app consolidate claude-desktop

# 5. Restart Claude Desktop

# 6. Verify tools are available in Claude Desktop
npx -y @1mcp/agent mcp status  # Check server health
```

Your Claude Desktop will now use the following configuration automatically:

```json
{
  "mcpServers": {
    "1mcp": {
      "command": "npx",
      "args": ["-y", "@1mcp/agent", "serve", "--transport", "stdio"]
    }
  }
}
```

### Remote + ngrok

For development setups where you need remote access:

```bash
# 1. Install and configure 1MCP
npm install -g @1mcp/agent
npx -y @1mcp/agent mcp add context7 -- npx -y @upstash/context7-mcp
npx -y @1mcp/agent mcp add sequential -- npx -y @modelcontextprotocol/server-sequential-thinking

# 2. Expose via ngrok
ngrok http 3001

# 3. Start server, use the URL from ngrok
npx -y @1mcp/agent serve --transport http --port 3001 --external-url https://abc123.ngrok-free.app

# 4. Add connector in Claude Desktop:
#    - Name: "My 1MCP Server"
#    - URL: "https://abc123.ngrok-free.app/mcp" (use the URL from ngrok)

# 5. Verify tools are available in Claude Desktop
```

### Production + Nginx

```bash
# 1. Start 1MCP server (bind to localhost for security)
npx -y @1mcp/agent serve --transport http --port 3001 --enable-auth --external-url https://your-domain.com

# 2. Configure nginx to proxy HTTPS to HTTP
# 3. Add connector in Claude Desktop:
#    - Name: "Production 1MCP"
#    - URL: "https://your-domain.com/mcp"
#    - Add OAuth credentials

# 4. Verify tools are available in Claude Desktop
```

## Getting Help

If you encounter issues:

1. Check the [troubleshooting section](#troubleshooting) above
2. For **local configuration issues**:
   - Try `npx -y @1mcp/agent app consolidate claude-desktop --force`
   - Check `npx -y @1mcp/agent mcp status` for server health
   - Use `npx -y @1mcp/agent app restore claude-desktop` to rollback
3. For **remote connector issues**:
   - Review Anthropic's documentation on:
     - [Custom connectors via remote MCP servers](https://support.anthropic.com/en/articles/11503834-building-custom-connectors-via-remote-mcp-servers)
     - [Browsing and connecting to tools](https://support.anthropic.com/en/articles/11724452-browsing-and-connecting-to-tools-from-the-directory)
4. Open an issue on our [GitHub repository](https://github.com/1mcp-app/agent)
5. Check the [1MCP documentation](/guide/getting-started) for server configuration help

## Which Approach Should I Use?

### Choose **Local Configuration Consolidation** if:

- ✅ You want the simplest setup
- ✅ You're using Claude Desktop on your local machine
- ✅ You don't need remote access
- ✅ You want offline functionality
- ✅ You don't want to deal with HTTPS/tunneling

### Choose **Remote Custom Connectors** if:

- ✅ You have a Claude Pro/Max/Team/Enterprise plan
- ✅ You need to access a centralized 1MCP server
- ✅ You're comfortable with networking/HTTPS setup
- ✅ You want to share MCP servers across multiple clients
- ✅ You need OAuth authentication

## Next Steps

- Learn about [authentication configuration](/guide/advanced/authentication)
- Explore [server filtering options](/guide/advanced/server-filtering)
- Set up [server management](/guide/essentials/server-management) for your MCP servers
- Configure [app consolidation](./app-consolidation) for seamless management of other apps
