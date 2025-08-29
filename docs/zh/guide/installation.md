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

我们提供两种 Docker 镜像变体：

- **`latest`**: 包含额外工具 (uv, bun) 的全功能镜像
- **`lite`**: 仅包含基本 Node.js 包管理器的轻量级镜像

```bash
# 拉取并运行 (全功能镜像) - 重要：设置主机为 0.0.0.0 以支持 Docker 网络
docker run -p 3050:3050 \
  -e ONE_MCP_HOST=0.0.0.0 \
  -e ONE_MCP_PORT=3050 \
  -e ONE_MCP_EXTERNAL_URL=http://127.0.0.1:3050 \
  -v $(pwd)/mcp.json:/app/mcp.json \
  ghcr.io/1mcp-app/agent:latest

# 拉取并运行 (轻量级镜像) 带正确的网络配置
docker run -p 3050:3050 \
  -e ONE_MCP_HOST=0.0.0.0 \
  -e ONE_MCP_PORT=3050 \
  -e ONE_MCP_EXTERNAL_URL=http://127.0.0.1:3050 \
  -v $(pwd)/mcp.json:/app/mcp.json \
  ghcr.io/1mcp-app/agent:lite

# 中国用户 - 更快的包安装速度
docker run -p 3050:3050 \
  -e ONE_MCP_HOST=0.0.0.0 \
  -e ONE_MCP_PORT=3050 \
  -e ONE_MCP_EXTERNAL_URL=http://127.0.0.1:3050 \
  -e npm_config_registry=https://registry.npmmirror.com \
  -e UV_INDEX=http://mirrors.aliyun.com/pypi/simple \
  -e UV_DEFAULT_INDEX=http://mirrors.aliyun.com/pypi/simple \
  -v $(pwd)/mcp.json:/app/mcp.json \
  ghcr.io/1mcp-app/agent:latest

# 使用 docker-compose (推荐)
cat > docker-compose.yml << 'EOF'
services:
  1mcp:
    image: ghcr.io/1mcp-app/agent:latest
    ports:
      - "3050:3050"
    volumes:
      - ./mcp.json:/app/mcp.json
    environment:
      - ONE_MCP_HOST=0.0.0.0
      - ONE_MCP_PORT=3050
      - ONE_MCP_EXTERNAL_URL=http://127.0.0.1:3050
      - ONE_MCP_LOG_LEVEL=info
      - ONE_MCP_CONFIG=/app/mcp.json
      # 可选：中国大陆用户加速
      # - npm_config_registry=https://registry.npmmirror.com
      # - UV_INDEX=http://mirrors.aliyun.com/pypi/simple
      # - UV_DEFAULT_INDEX=http://mirrors.aliyun.com/pypi/simple
      # 可选：企业代理环境
      # - https_proxy=${https_proxy}
      # - http_proxy=${http_proxy}
EOF

docker compose up -d
```

#### 可用标签

**全功能镜像:**

- `latest`, `vX.Y.Z`, `vX.Y`, `vX`, `sha-<commit>`

**轻量级镜像:**

- `lite`, `vX.Y.Z-lite`, `vX.Y-lite`, `vX-lite`, `sha-<commit>-lite`

## 从源码构建

### 先决条件

- Node.js (来自 `.node-version` 的版本 - 目前为 22)
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
- [配置](/zh/guide/essentials/configuration) - 详细的设置选项
