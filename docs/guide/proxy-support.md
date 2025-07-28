# Proxy Support

1MCP supports trust proxy configuration for deployment behind load balancers and reverse proxies.

## Overview

When 1MCP runs behind a proxy, it needs to understand the real client IP addresses and protocol information for security and logging purposes.

## Configuration

### Basic Trust Proxy

```json
{
  "server": {
    "trustProxy": true
  }
}
```

### Specific Proxy IPs

```json
{
  "server": {
    "trustProxy": ["127.0.0.1", "10.0.0.0/8"]
  }
}
```

### Advanced Configuration

```json
{
  "server": {
    "trustProxy": {
      "enabled": true,
      "proxies": ["127.0.0.1", "::1"],
      "headers": {
        "clientIp": "X-Forwarded-For",
        "protocol": "X-Forwarded-Proto",
        "host": "X-Forwarded-Host"
      }
    }
  }
}
```

## Common Proxy Setups

### nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

1MCP configuration:

```json
{
  "server": {
    "trustProxy": true,
    "port": 3000
  }
}
```

### Apache

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
    ProxyPreserveHost On
    ProxyAddHeaders On
</VirtualHost>
```

### Cloudflare

For Cloudflare, trust their IP ranges:

```json
{
  "server": {
    "trustProxy": [
      "173.245.48.0/20",
      "103.21.244.0/22",
      "103.22.200.0/22",
      "103.31.4.0/22",
      "141.101.64.0/18",
      "108.162.192.0/18",
      "190.93.240.0/20"
    ]
  }
}
```

### Docker Compose with nginx

```yaml
version: '3.8'
services:
  nginx:
    image: nginx:alpine
    ports:
      - '80:80'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - 1mcp

  1mcp:
    image: ghcr.io/1mcp-app/agent:latest
    environment:
      - TRUST_PROXY=true
    volumes:
      - ./mcp.json:/app/mcp.json
```

## Security Considerations

1. **Only trust known proxies** - Never use `trustProxy: true` in production without specifying exact IPs
2. **Validate headers** - Ensure proxy correctly sets forwarded headers
3. **Monitor for spoofing** - Log and alert on suspicious IP patterns

## Troubleshooting

**Real IPs not detected?**

- Check proxy configuration sets `X-Forwarded-For` header
- Verify proxy IP is in trust list
- Review logs for header values

**SSL termination issues?**

- Ensure proxy sets `X-Forwarded-Proto: https`
- Check redirect loops in proxy config

For detailed configuration, see [Trust Proxy Reference](/reference/trust-proxy).
