# Installation

## Package Managers (Recommended)

### npm/pnpm

```bash
# Install globally
npm install -g @1mcp/agent
# or
pnpm add -g @1mcp/agent

# Use directly
npx @1mcp/agent --config mcp.json
```

### Docker

```bash
# Pull and run
docker run -p 3000:3000 -v $(pwd)/mcp.json:/app/mcp.json ghcr.io/1mcp-app/agent:latest

# With docker-compose
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  1mcp:
    image: ghcr.io/1mcp-app/agent:latest
    ports:
      - "3000:3000"
    volumes:
      - ./mcp.json:/app/mcp.json
    environment:
      - LOG_LEVEL=info
EOF

docker-compose up -d
```

## Build from Source

### Prerequisites

- Node.js 18+
- pnpm package manager

### Build Steps

```bash
# Clone repository
git clone https://github.com/1mcp-app/agent.git
cd agent

# Install dependencies
pnpm install

# Build
pnpm build

# Run
node build/index.js --config mcp.json
```

## Verification

Verify installation:

```bash
npx @1mcp/agent --version
# Should output: @1mcp/agent v0.15.0
```

## System Requirements

- **Memory**: 512MB RAM minimum, 2GB recommended
- **Disk**: Space for dependencies and logs
- **Network**: HTTP/HTTPS outbound access for MCP servers
- **OS**: Linux, macOS, Windows (x64/ARM64)

## Next Steps

- [Quick Start Guide](/guide/quick-start) - Get running in 5 minutes
- [Configuration](/guide/configuration) - Detailed setup options
