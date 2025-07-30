# Health Check API Reference

The 1MCP Agent provides comprehensive health check endpoints for monitoring system status, server connectivity, and operational metrics.

## Overview

Health check endpoints are designed for:

- **Monitoring Systems**: Prometheus, Grafana, DataDog
- **Load Balancers**: HAProxy, nginx, AWS ALB
- **Container Orchestration**: Kubernetes, Docker Swarm
- **CI/CD Pipelines**: Deployment validation
- **Manual Debugging**: System status inspection

## Endpoints

### `GET /health`

**Description**: Complete health status with detailed system metrics and server information.

**Authentication**: None required

**Response Codes**:

- `200` - Healthy or degraded but functional
- `503` - Unhealthy, critical issues
- `500` - Internal server error

**Response Headers**:

```http
Content-Type: application/json
Cache-Control: no-cache, no-store, must-revalidate
X-Health-Status: healthy|degraded|unhealthy
X-Service-Version: 0.15.0
X-Uptime-Seconds: 3600
```

**Response Schema**:

```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2025-01-30T12:00:00.000Z",
  "version": "0.15.0",
  "system": {
    "uptime": 3600,
    "memory": {
      "used": 50.5,
      "total": 100.0,
      "percentage": 50.5
    },
    "process": {
      "pid": 12345,
      "nodeVersion": "v20.0.0",
      "platform": "linux",
      "arch": "x64"
    }
  },
  "servers": {
    "total": 3,
    "healthy": 2,
    "unhealthy": 1,
    "details": [
      {
        "name": "filesystem-server",
        "status": "connected|error|disconnected|awaiting_oauth",
        "healthy": true,
        "lastConnected": "2025-01-30T11:30:00.000Z",
        "lastError": "Connection timeout",
        "tags": ["filesystem", "local"]
      }
    ]
  },
  "configuration": {
    "loaded": true,
    "serverCount": 3,
    "enabledCount": 2,
    "disabledCount": 1,
    "authEnabled": true,
    "transport": "http"
  }
}
```

**Field Descriptions**:

- **`status`**: Overall health status
  - `healthy` - All systems operational
  - `degraded` - Some issues but still functional
  - `unhealthy` - Critical issues affecting functionality

- **`system.uptime`**: Server uptime in seconds
- **`system.memory.used`**: Heap memory used in MB
- **`system.memory.total`**: Total heap memory in MB
- **`system.memory.percentage`**: Memory usage percentage

- **`servers.details[].status`**: Individual server status
  - `connected` - Server is connected and operational
  - `error` - Server has connection or runtime errors
  - `disconnected` - Server is not connected
  - `awaiting_oauth` - Server requires OAuth authentication

### `GET /health/live`

**Description**: Simple liveness probe for basic availability checking.

**Authentication**: None required

**Response Codes**:

- `200` - Server is running (always returns 200 if reachable)

**Response Schema**:

```json
{
  "status": "alive",
  "timestamp": "2025-01-30T12:00:00.000Z"
}
```

**Use Cases**:

- Kubernetes liveness probes
- Load balancer basic health checks
- Service discovery health checks

### `GET /health/ready`

**Description**: Readiness probe to determine if the service is ready to accept requests.

**Authentication**: None required

**Response Codes**:

- `200` - Service is ready (configuration loaded)
- `503` - Service is not ready

**Response Schema**:

```json
{
  "status": "ready|not_ready",
  "timestamp": "2025-01-30T12:00:00.000Z",
  "configuration": {
    "loaded": true,
    "serverCount": 3,
    "enabledCount": 2,
    "disabledCount": 1,
    "authEnabled": true,
    "transport": "http"
  }
}
```

**Use Cases**:

- Kubernetes readiness probes
- Load balancer ready checks
- Deployment validation

## Health Status Logic

### Overall Status Determination

The overall health status is determined by:

1. **Configuration Status**: Must be loaded for `healthy` or `degraded`
2. **Server Health Ratio**:
   - All servers healthy → `healthy`
   - No servers configured → `degraded`
   - > 50% servers healthy → `degraded`
   - ≤50% servers healthy → `unhealthy`

### Server Health Classification

Individual servers are considered healthy if:

- Status is `connected`
- No recent critical errors
- Responding to health checks

## Rate Limiting

Health endpoints have relaxed rate limiting:

- **Window**: 5 minutes
- **Limit**: 200 requests per IP
- **Headers**: Standard rate limit headers included

## Monitoring Integration Examples

### Kubernetes Health Probes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: 1mcp-agent
spec:
  template:
    spec:
      containers:
        - name: 1mcp
          image: ghcr.io/1mcp-app/agent:latest
          ports:
            - containerPort: 3050
          livenessProbe:
            httpGet:
              path: /health/live
              port: 3050
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3050
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
```

### Docker Compose Health Check

```yaml
version: '3.8'
services:
  1mcp:
    image: ghcr.io/1mcp-app/agent:latest
    ports:
      - '3050:3050'
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3050/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
```

### HAProxy Backend Health Check

```
backend 1mcp_servers
    balance roundrobin
    option httpchk GET /health/ready
    http-check expect status 200
    server 1mcp-1 1mcp-1:3050 check inter 30s
    server 1mcp-2 1mcp-2:3050 check inter 30s
```

### Prometheus Monitoring

```yaml
# prometheus.yml
scrape_configs:
  - job_name: '1mcp-health'
    static_configs:
      - targets: ['1mcp:3050']
    metrics_path: /health
    scrape_interval: 30s
    scrape_timeout: 10s
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        replacement: '1mcp-agent'
```

### Script-Based Monitoring

```bash
#!/bin/bash
# Simple health check script

HEALTH_URL="http://localhost:3050/health"
RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/health.json "$HEALTH_URL")
HTTP_CODE="${RESPONSE: -3}"

if [ "$HTTP_CODE" -eq 200 ]; then
    STATUS=$(jq -r '.status' /tmp/health.json)
    UNHEALTHY=$(jq -r '.servers.unhealthy' /tmp/health.json)

    echo "1MCP Health: $STATUS (Unhealthy servers: $UNHEALTHY)"

    if [ "$STATUS" = "unhealthy" ]; then
        exit 1
    fi
else
    echo "1MCP Health Check Failed: HTTP $HTTP_CODE"
    exit 1
fi
```

## Error Responses

### Service Unavailable (503)

```json
{
  "status": "unhealthy",
  "timestamp": "2025-01-30T12:00:00.000Z",
  "version": "0.15.0",
  "system": {
    /* system info */
  },
  "servers": {
    "total": 3,
    "healthy": 0,
    "unhealthy": 3,
    "details": [
      /* server details */
    ]
  },
  "configuration": {
    "loaded": false,
    "serverCount": 0,
    "enabledCount": 0,
    "disabledCount": 0,
    "authEnabled": false,
    "transport": "http"
  }
}
```

### Internal Server Error (500)

```json
{
  "status": "unhealthy",
  "timestamp": "2025-01-30T12:00:00.000Z",
  "error": "Health check failed",
  "message": "Configuration service unavailable"
}
```

## Best Practices

### Monitoring Setup

1. **Use Multiple Endpoints**: Combine `/health`, `/health/live`, and `/health/ready` for comprehensive monitoring
2. **Set Appropriate Timeouts**: Health checks should complete within 5-10 seconds
3. **Configure Retry Logic**: Allow 2-3 retries with exponential backoff
4. **Monitor Trends**: Track health status changes over time

### Alert Configuration

```yaml
# Example Prometheus alerting rules
groups:
  - name: 1mcp-health
    rules:
      - alert: 1MCP_Unhealthy
        expr: 1mcp_health_status != 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: '1MCP service is unhealthy'
          description: '1MCP has been unhealthy for more than 2 minutes'

      - alert: 1MCP_Degraded
        expr: 1mcp_health_status == 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: '1MCP service is degraded'
          description: '1MCP has been degraded for more than 5 minutes'
```

### Development Testing

```bash
# Test all health endpoints
curl -v http://localhost:3050/health
curl -v http://localhost:3050/health/live
curl -v http://localhost:3050/health/ready

# Check response headers
curl -I http://localhost:3050/health

# Monitor health status
watch -n 5 'curl -s http://localhost:3050/health | jq ".status, .servers.healthy, .servers.unhealthy"'
```
