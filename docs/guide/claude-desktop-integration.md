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

## Method 1: Local Configuration Consolidation (Recommended)

This is the simplest way to integrate 1MCP with Claude Desktop. It automatically configures Claude Desktop to use 1MCP as a local proxy via stdio transport.

### Prerequisites

- **Claude Desktop**: Download and install from [claude.ai](https://claude.ai/desktop)
- **1MCP Agent**: Install the 1MCP agent locally
- **Existing MCP Servers**: Optionally have other MCP servers configured

### Step 1: Install 1MCP Agent

```bash
npm install -g @1mcp/agent
```

### Step 2: Configure Your MCP Servers (Optional)

If you have existing MCP servers, add them to 1MCP first:

```bash
# Add some popular MCP servers using " -- " pattern (auto-detects type as stdio)
npx -y @1mcp/agent mcp add context7 -- npx -y @upstash/context7-mcp
npx -y @1mcp/agent mcp add sequential -- npx -y @modelcontextprotocol/server-sequential-thinking
npx -y @1mcp/agent mcp add playwright -- npx -y @playwright/mcp

# Or add servers from other apps if you have them configured
npx -y @1mcp/agent app discover  # See what's available to consolidate
```

### Step 3: Consolidate Claude Desktop Configuration

Use the consolidation command to automatically configure Claude Desktop:

```bash
# Consolidate Claude Desktop configuration
npx -y @1mcp/agent app consolidate claude-desktop

# Or with additional options
npx -y @1mcp/agent app consolidate claude-desktop --dry-run  # Preview changes first
npx -y @1mcp/agent app consolidate claude-desktop --force    # Skip connectivity checks
```

This command will:

1. **Discover** your existing Claude Desktop configuration
2. **Import** any existing MCP servers from Claude Desktop into 1MCP
3. **Replace** the Claude Desktop configuration to use 1MCP via stdio transport
4. **Create** a backup of your original configuration

### Step 4: Restart Claude Desktop

After consolidation, restart Claude Desktop to load the new configuration. Your tools should now be available through 1MCP.

### Step 5: Verify Integration

1. **Check Available Tools**: In Claude Desktop, your consolidated MCP tools should appear
2. **Test Functionality**: Try using one of your tools to confirm it's working
3. **View Logs** (if needed):

   ```bash
   # Check 1MCP server status
   npx -y @1mcp/agent mcp status

   # View server logs for debugging
   npx -y @1mcp/agent serve --transport stdio --verbose
   ```

### Generated Configuration

The consolidation process creates a configuration like this in Claude Desktop:

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

### Backup and Restore

Your original configuration is automatically backed up:

```bash
# List available backups
npx -y @1mcp/agent app backups claude-desktop

# Restore original configuration if needed
npx -y @1mcp/agent app restore claude-desktop
```

## Method 2: Remote Custom Connectors (Advanced)

For advanced use cases where you need remote access to a centralized 1MCP server.

### Prerequisites

- **Claude Desktop**: Download and install from [claude.ai](https://claude.ai/desktop)
- **Paid Plan**: Custom connectors require Claude Pro, Max, Team, or Enterprise plan
- **1MCP Server**: A running 1MCP server instance accessible via HTTP/HTTPS

### Step-by-Step Remote Integration Guide

### Step 1: Start Your 1MCP Server

First, start your 1MCP server with HTTP transport:

```bash
# Basic HTTP server (development)
npx -y @1mcp/agent serve --transport http --port 3001

# With authentication (production)
npx -y @1mcp/agent serve --transport http --port 3001 --enable-auth

# Or using SSE (Server-Sent Events)
npx -y @1mcp/agent serve --transport sse --port 3001
```

Your server will run locally on `http://localhost:3001/mcp`, but **Claude Desktop requires a public HTTPS URL**, so you'll need to use a tunneling service or reverse proxy.

### Step 1.1: Expose Your Server (Required for Claude Desktop)

Since 1MCP doesn't have built-in HTTPS support, you have several options:

#### Option A: Using ngrok (for testing/demo)

1. **Install ngrok**: [Download from ngrok.com](https://ngrok.com)

2. **Expose your local server**:

   ```bash
   # Start 1MCP server
   npx -y @1mcp/agent serve --transport http --port 3001

   # In another terminal, expose via ngrok
   ngrok http 3001
   ```

3. **Use the HTTPS URL**: ngrok will provide an HTTPS URL like:
   ```
   https://abc123.ngrok-free.app/mcp
   ```

#### Option B: Using a Load Balancer/Reverse Proxy (for production)

**With Nginx**:

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /mcp {
        proxy_pass http://localhost:3001/mcp;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**With Caddy**:

```
your-domain.com {
    reverse_proxy /mcp/* localhost:3001
}
```

**With Traefik** (docker-compose.yml):

```yaml
services:
  traefik:
    image: traefik:v2.10
    command:
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.myresolver.acme.httpchallenge=true"
      - "--certificatesresolvers.myresolver.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.myresolver.acme.email=your-email@domain.com"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./data:/data

  1mcp:
    image: docker pull ghcr.io/1mcp-app/agent:latest
    command: serve --transport http --port 3001
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.1mcp.rule=Host(`your-domain.com`)
      - "traefik.http.routers.1mcp.entrypoints=websecure"
      - "traefik.http.routers.1mcp.tls.certresolver=myresolver"
```

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

## Server Configuration

### 1MCP Server Settings

Configure your 1MCP server for Claude Desktop integration:

````bash
# Development setup (HTTP, no auth)
npx -y @1mcp/agent serve --transport http --port 3001

```bash
# Production setup (HTTP with auth, use reverse proxy for HTTPS)
npx -y @1mcp/agent serve --transport http --port 3001 --enable-auth
````

# With specific server filtering

npx -y @1mcp/agent serve --transport http --port 3001 --tags "context7,sequential,playwright"

# For use with ngrok or reverse proxy

npx -y @1mcp/agent serve --transport http --port 3001 --host 0.0.0.0

````

### Authentication Setup

If you want to use OAuth authentication:

1. **Enable Authentication**:

   ```bash
   1mcp serve --transport http --port 3001 --enable-auth
````

2. **Configure OAuth Client**:
   - Your 1MCP server will provide OAuth endpoints
   - Use the Client ID and Secret in Claude Desktop's connector settings
   - The auth flow will be handled automatically by Claude Desktop

3. **Server-to-Server Authentication**:
   For advanced setups, you can configure API keys or other auth methods in your 1MCP server configuration.

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
   echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{}}}' | npx -y @1mcp/agent serve --transport stdio
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
   curl https://your-domain.com/mcp/health  # Test basic connectivity
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

1. **Check OAuth Configuration**: Ensure OAuth is properly configured in 1MCP
2. **Verify Credentials**: Double-check Client ID and Secret in Claude Desktop
3. **Clear Cache**: Try removing and re-adding the connector

### Debugging Steps

1. **Test Direct Connection**:

   ```bash
   # Test your exposed HTTPS endpoint
   curl -X POST https://your-domain.com/mcp \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{"roots":{"listChanged":true}}}}'
   ```

2. **Check Server Logs**:

   ```bash
   npx -y @1mcp/agent serve --transport http --port 3001 --verbose
   ```

3. **Health Check**:
   ```bash
   # Check if server is responding through your proxy/tunnel
   curl https://your-domain.com/health
   ```

## Security Considerations

### Production Deployment

When deploying 1MCP for Claude Desktop integration:

1. **Use HTTPS**: Always use HTTPS in production via reverse proxy

   ```bash
   # Start 1MCP on HTTP (reverse proxy handles HTTPS)
   npx -y @1mcp/agent serve --transport http --port 3001 --host 0.0.0.0

   # Configure your reverse proxy (nginx/caddy/traefik) to handle HTTPS
   ```

2. **Enable Authentication**: Use OAuth for secure access

   ```bash
   1mcp serve --transport http --port 3001 --enable-auth
   ```

3. **Network Security**:
   - Use proper firewall rules
   - Consider VPN or private networks for sensitive environments
   - Implement rate limiting and DDoS protection at the reverse proxy level
   - Bind 1MCP to localhost if using a reverse proxy on the same server

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

### For Local Configuration Consolidation

1. **Start with Discovery**: Use `app discover` to see what's available before consolidating
2. **Preview Changes**: Always use `--dry-run` first to preview what will happen
3. **Backup First**: The consolidation automatically creates backups, but verify they exist
4. **Test After Restart**: Always restart Claude Desktop and test a tool after consolidation
5. **Keep 1MCP Updated**: Regularly update 1MCP agent: `npm update -g @1mcp/agent`
6. **Monitor Server Health**: Use `mcp status` to check server health periodically

### For Remote Custom Connectors

1. **Start Simple**: Begin with HTTP and no authentication, then add security features
2. **Use HTTPS**: Always use HTTPS/SSL in production environments
3. **Monitor Health**: Implement health checks and monitoring for your 1MCP server
4. **Regular Updates**: Keep your 1MCP server and MCP servers up to date
5. **Security Review**: Regularly review connected tools and their permissions
6. **Backup Configuration**: Keep backups of your 1MCP server configuration
7. **Test Connections**: Verify connectivity before adding connectors to Claude Desktop

## Complete Setup Examples

### Example 1: Local Configuration (Recommended for Most Users)

```bash
# 1. Install 1MCP agent
npm install -g @1mcp/agent

# 2. Add some useful MCP servers
npx -y @1mcp/agent mcp add context7 https://github.com/1mcp-app/context7
npx -y @1mcp/agent mcp add sequential https://github.com/1mcp-app/sequential-thinking
npx -y @1mcp/agent mcp add playwright https://github.com/1mcp-app/playwright

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

### Example 2: Remote Development with ngrok

For development setups where you need remote access:

```bash
# 1. Install and configure 1MCP
npm install -g @1mcp/agent
npx -y @1mcp/agent mcp add context7 https://github.com/1mcp-app/context7
npx -y @1mcp/agent mcp add sequential https://github.com/1mcp-app/sequential-thinking

# 2. Start server
npx -y @1mcp/agent serve --transport http --port 3001

# 3. In another terminal, expose via ngrok
ngrok http 3001

# 4. Add connector in Claude Desktop:
#    - Name: "My 1MCP Server"
#    - URL: "https://abc123.ngrok-free.app/mcp" (use the URL from ngrok)

# 5. Verify tools are available in Claude Desktop
```

### Example 3: Production with Nginx

```bash
# 1. Start 1MCP server (bind to localhost for security)
npx -y @1mcp/agent serve --transport http --port 3001 --enable-auth

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
5. Check the [1MCP documentation](./getting-started) for server configuration help

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

- Learn about [authentication configuration](./authentication)
- Explore [server filtering options](./server-filtering)
- Set up [server management](./server-management) for your MCP servers
- Configure [app consolidation](./app-consolidation) for seamless management of other apps
