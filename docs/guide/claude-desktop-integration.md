# Claude Desktop Integration

Learn how to connect your 1MCP server directly with Claude Desktop using the built-in custom connector feature.

## Overview

Claude Desktop supports connecting to remote MCP servers through its **custom connector** feature. This allows you to connect directly to your 1MCP server running with HTTP or SSE transport without needing local configuration files or bridge scripts.

## Why Use 1MCP with Claude Desktop?

- **Direct Integration**: Connect remotely without local setup
- **Unified Access**: Access multiple MCP servers through one endpoint
- **Authentication**: Built-in OAuth 2.1 support for secure connections
- **Server Management**: Centralized management of all your MCP tools
- **Hot Reloading**: Add/remove servers without restarting Claude Desktop

## Prerequisites

- **Claude Desktop**: Download and install from [claude.ai](https://claude.ai/desktop)
- **Paid Plan**: Custom connectors require Claude Pro, Max, Team, or Enterprise plan
- **1MCP Server**: A running 1MCP server instance accessible via HTTP/HTTPS

## Step-by-Step Integration Guide

### Step 1: Start Your 1MCP Server

First, start your 1MCP server with HTTP transport:

```bash
# Basic HTTP server (development)
1mcp serve --transport http --port 3001

# With authentication (production)
1mcp serve --transport http --port 3001 --enable-auth

# Or using SSE (Server-Sent Events)
1mcp serve --transport sse --port 3001
```

Your server will run locally on `http://localhost:3001/mcp`, but **Claude Desktop requires a public HTTPS URL**, so you'll need to use a tunneling service or reverse proxy.

### Step 1.1: Expose Your Server (Required for Claude Desktop)

Since 1MCP doesn't have built-in HTTPS support, you have several options:

#### Option A: Using ngrok (for testing/demo)

1. **Install ngrok**: [Download from ngrok.com](https://ngrok.com)

2. **Expose your local server**:

   ```bash
   # Start 1MCP server
   1mcp serve --transport http --port 3001

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

```bash
# Development setup (HTTP, no auth)
1mcp serve --transport http --port 3001

# Production setup (HTTP with auth, use reverse proxy for HTTPS)
1mcp serve --transport http --port 3001 --enable-auth

# With specific server filtering
1mcp serve --transport http --port 3001 --tags "context7,sequential,playwright"

# For use with ngrok or reverse proxy
1mcp serve --transport http --port 3001 --host 0.0.0.0
```

### Authentication Setup

If you want to use OAuth authentication:

1. **Enable Authentication**:

   ```bash
   1mcp serve --transport http --port 3001 --enable-auth
   ```

2. **Configure OAuth Client**:
   - Your 1MCP server will provide OAuth endpoints
   - Use the Client ID and Secret in Claude Desktop's connector settings
   - The auth flow will be handled automatically by Claude Desktop

3. **Server-to-Server Authentication**:
   For advanced setups, you can configure API keys or other auth methods in your 1MCP server configuration.

## Troubleshooting

### Common Issues

#### "Failed to Connect" Error

**Symptoms**: Claude Desktop shows connection failed when adding the connector.

**Solutions**:

1. **Check Server Status**: Ensure your 1MCP server is running

   ```bash
   1mcp mcp status  # Check if servers are running
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
   1mcp mcp list  # List configured servers
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
   1mcp serve --transport http --port 3001 --verbose
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
   1mcp serve --transport http --port 3001 --host 0.0.0.0

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
1mcp serve --transport http --port 3001 --tags "context7,sequential"
```

## Best Practices

1. **Start Simple**: Begin with HTTP and no authentication, then add security features
2. **Use HTTPS**: Always use HTTPS/SSL in production environments
3. **Monitor Health**: Implement health checks and monitoring for your 1MCP server
4. **Regular Updates**: Keep your 1MCP server and MCP servers up to date
5. **Security Review**: Regularly review connected tools and their permissions
6. **Backup Configuration**: Keep backups of your 1MCP server configuration
7. **Test Connections**: Verify connectivity before adding connectors to Claude Desktop

## Example: Complete Setup

Here's a complete example of setting up 1MCP for Claude Desktop:

### Development with ngrok

```bash
# 1. Install and configure 1MCP
npm install -g @1mcp/agent
1mcp mcp add context7 https://github.com/1mcp-app/context7
1mcp mcp add sequential https://github.com/1mcp-app/sequential-thinking

# 2. Start server
1mcp serve --transport http --port 3001

# 3. In another terminal, expose via ngrok
ngrok http 3001

# 4. Add connector in Claude Desktop:
#    - Name: "My 1MCP Server"
#    - URL: "https://abc123.ngrok-free.app/mcp" (use the URL from ngrok)

# 5. Verify tools are available in Claude Desktop
```

### Production with Nginx

```bash
# 1. Start 1MCP server (bind to localhost for security)
1mcp serve --transport http --port 3001 --enable-auth

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
2. Review Anthropic's documentation on:
   - [Custom connectors via remote MCP servers](https://support.anthropic.com/en/articles/11503834-building-custom-connectors-via-remote-mcp-servers)
   - [Browsing and connecting to tools](https://support.anthropic.com/en/articles/11724452-browsing-and-connecting-to-tools-from-the-directory)
3. Open an issue on our [GitHub repository](https://github.com/1mcp-app/agent)
4. Check the [1MCP documentation](../getting-started.md) for server configuration help

## Next Steps

- Learn about [authentication configuration](./authentication.md)
- Explore [server filtering options](./server-filtering.md)
- Set up [server management](./server-management.md) for your MCP servers
- Configure [app consolidation](./app-consolidation.md) for seamless management
