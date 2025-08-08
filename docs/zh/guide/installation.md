# 安装

## 包管理器 (推荐)

### npm/pnpm

```bash
# 全局安装
npm install -g @1mcp/agent
# 或
pnpm add -g @1mcp/agent

# 直接使用
npx @1mcp/agent --config mcp.json
```

### Docker

```bash
# 拉取并运行
docker run -p 3050:3050 -v $(pwd)/mcp.json:/app/mcp.json ghcr.io/1mcp-app/agent:latest

# 使用 docker-compose
cat > docker-compose.yml << 'EOF'
services:
  1mcp:
    image: ghcr.io/1mcp-app/agent:latest
    ports:
      - "3050:3050"
    volumes:
      - ./mcp.json:/app/mcp.json
    environment:
      - LOG_LEVEL=info
      - ONE_MCP_CONFIG=/app/mcp.json
EOF

docker compose up -d
```

## 从源码构建

### 先决条件

- Node.js 18+
- pnpm 包管理器

### 构建步骤

```bash
# 克隆仓库
git clone https://github.com/1mcp-app/agent.git
cd agent

# 安装依赖
pnpm install

# 构建
pnpm build

# 运行
node build/index.js --config mcp.json
```

## 验证

验证安装：

```bash
npx @1mcp/agent --version
# 应输出：@1mcp/agent v0.15.0
```

## 系统要求

- **内存**：最低 512MB RAM，推荐 2GB
- **磁盘**：用于依赖和日志的空间
- **网络**：MCP 服务器的 HTTP/HTTPS 出站访问
- **操作系统**：Linux、macOS、Windows (x64/ARM64)

## 下一步

- [快速入门指南](/zh/guide/quick-start) - 5 分钟内运行
- [配置](/zh/guide/configuration) - 详细的设置选项
