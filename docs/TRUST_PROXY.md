# Trust Proxy Configuration

When running 1MCP behind a reverse proxy (nginx, Apache, Cloudflare, etc.), you need to configure trust proxy settings to ensure proper client IP detection for logging, rate limiting, and security features.

## Trust Proxy Options

| Value         | Description                                                              | Example                     |
| ------------- | ------------------------------------------------------------------------ | --------------------------- |
| `false`       | Disable trust proxy (default Express.js behavior)                        | `--trust-proxy=false`       |
| `true`        | Trust all proxies (use leftmost IP from X-Forwarded-For)                 | `--trust-proxy=true`        |
| `loopback`    | Trust loopback addresses (127.0.0.1, ::1) - **Default**                  | `--trust-proxy=loopback`    |
| `linklocal`   | Trust link-local addresses (169.254.0.0/16, fe80::/10)                   | `--trust-proxy=linklocal`   |
| `uniquelocal` | Trust unique local addresses (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) | `--trust-proxy=uniquelocal` |
| IP Address    | Trust specific IP address                                                | `--trust-proxy=192.168.1.1` |
| CIDR Range    | Trust IP range in CIDR notation                                          | `--trust-proxy=10.0.0.0/8`  |

## Common Use Cases

### Local Development (Default)

```bash
# Default - trusts loopback addresses (safe for local development)
npx -y @1mcp/agent

# Equivalent explicit setting
npx -y @1mcp/agent --trust-proxy=loopback
```

### Behind nginx/Apache

```bash
# Trust your reverse proxy server
npx -y @1mcp/agent --trust-proxy=192.168.1.100

# Or trust your entire internal network
npx -y @1mcp/agent --trust-proxy=192.168.0.0/16
```

### Behind Cloudflare/CDN

```bash
# Trust all proxies (common for CDN setups)
npx -y @1mcp/agent --trust-proxy=true
```

### Docker with Host Network

```bash
# Trust unique local addresses for container networking
docker run --network host \
  -e ONE_MCP_TRUST_PROXY=uniquelocal \
  ghcr.io/1mcp-app/agent
```

### Environment Variables

You can also use environment variables instead of CLI flags:

```bash
# Set via environment variable
export ONE_MCP_TRUST_PROXY=192.168.1.0/24
npx -y @1mcp/agent

# Docker with environment variable
docker run -p 3050:3050 \
  -e ONE_MCP_TRUST_PROXY=true \
  ghcr.io/1mcp-app/agent
```

## Security Considerations

- **Default**: `loopback` is safe for local development
- **Production**: Use specific IP addresses or CIDR ranges when possible
- **CDN**: Only use `true` when behind trusted CDN services
- **Headers**: Trust proxy settings affect `X-Forwarded-For` header processing

**⚠️ Important**: Incorrect trust proxy settings can lead to IP spoofing vulnerabilities. Only trust proxies you control.

## How Trust Proxy Works

When trust proxy is enabled, Express.js will:

1. **Parse `X-Forwarded-For` headers** to extract the original client IP
2. **Update `req.ip`** to reflect the actual client IP (not the proxy IP)
3. **Populate `req.ips`** array with all IPs in the forwarding chain
4. **Enable secure cookies** when `X-Forwarded-Proto: https` is present

### Example Headers

Without trust proxy:

```http
X-Forwarded-For: 203.0.113.1, 192.168.1.100
req.ip = "192.168.1.100"  // Proxy IP
req.ips = []
```

With trust proxy enabled:

```http
X-Forwarded-For: 203.0.113.1, 192.168.1.100
req.ip = "203.0.113.1"    // Original client IP
req.ips = ["203.0.113.1", "192.168.1.100"]
```

## Reverse Proxy Configuration Examples

### nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3050;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then configure 1MCP:

```bash
npx -y @1mcp/agent --trust-proxy=127.0.0.1
```

### Apache

```apache
<VirtualHost *:80>
    ServerName your-domain.com

    ProxyPass / http://localhost:3050/
    ProxyPassReverse / http://localhost:3050/
    ProxyPreserveHost On

    # Set forwarded headers
    ProxyAddHeaders On
</VirtualHost>
```

Then configure 1MCP:

```bash
npx -y @1mcp/agent --trust-proxy=127.0.0.1
```

## Troubleshooting

### Check Current Configuration

The server logs will show the trust proxy setting on startup:

```
Server is running on port 3050 with HTTP/SSE transport
```

### Test Client IP Detection

You can test if trust proxy is working correctly by checking the logs for incoming requests. The client IP should reflect the actual client, not the proxy.

### Common Issues

1. **Wrong client IP in logs**: Trust proxy not configured or incorrect proxy IP
2. **IP spoofing warnings**: Trust proxy is too permissive (using `true` when you should use specific IPs)
3. **Rate limiting not working**: Client IPs not detected correctly due to trust proxy misconfiguration

For more detailed troubleshooting, enable debug logging and check the request headers being processed.
