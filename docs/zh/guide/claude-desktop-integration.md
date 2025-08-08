# Claude Desktop 集成

了解如何使用两种不同的方法将您的 1MCP 服务器与 Claude Desktop 集成：**本地配置整合**（为简单起见，建议使用）和**远程自定义连接器**（用于高级用例）。

## 集成方法

### 1. 本地配置整合（推荐）

最简单的方法是使用 1MCP 作为本地代理，将您现有的 MCP 服务器整合到 Claude Desktop 的配置中。此方法：

- 使用 stdio 传输（无需网络设置）
- 自动配置 Claude Desktop 以使用 1MCP
- 保留您现有的 MCP 服务器配置
- 完全脱机工作，无需 HTTPS/隧道要求

### 2. 远程自定义连接器（高级）

对于高级场景，您可以使用 Claude Desktop 的自定义连接器功能和 HTTP 或 SSE 传输连接到远程 1MCP 服务器。此方法：

- 需要公共 HTTPS URL（隧道/反向代理）
- 支持 OAuth 身份验证
- 启用对集中式 1MCP 服务器的远程访问
- 对团队/企业部署很有用

## 为什么将 1MCP 与 Claude Desktop 一起使用？

- **直接集成**：无需本地设置即可远程连接
- **统一访问**：通过一个端点访问多个 MCP 服务器
- **身份验证**：内置 OAuth 2.1 支持安全连接
- **服务器管理**：集中管理所有 MCP 工具
- **热重载**：无需重新启动 Claude Desktop 即可添加/删除服务器

## 方法 1：本地配置整合（推荐）

这是将 1MCP 与 Claude Desktop 集成的最简单方法。它会自动配置 Claude Desktop 以通过 stdio 传输将 1MCP 用作本地代理。

### 先决条件

- **Claude Desktop**：从 [claude.ai](https://claude.ai/desktop) 下载并安装
- **1MCP 代理**：在本地安装 1MCP 代理
- **现有 MCP 服务器**：可选择配置其他 MCP 服务器

### 步骤 1：安装 1MCP 代理

```bash
npm install -g @1mcp/agent
```

### 步骤 2：配置您的 MCP 服务器（可选）

如果您有现有的 MCP 服务器，请先将它们添加到 1MCP：

```bash
# 使用“ -- ”模式添加一些流行的 MCP 服务器（自动检测类型为 stdio）
npx -y @1mcp/agent mcp add context7 -- npx -y @upstash/context7-mcp
npx -y @1mcp/agent mcp add sequential -- npx -y @modelcontextprotocol/server-sequential-thinking
npx -y @1mcp/agent mcp add playwright -- npx -y @playwright/mcp

# 或者，如果您已配置，则从其他应用程序添加服务器
npx -y @1mcp/agent app discover  # 查看可用于整合的内容
```

### 步骤 3：整合 Claude Desktop 配置

使用整合命令自动配置 Claude Desktop：

```bash
# 整合 Claude Desktop 配置
npx -y @1mcp/agent app consolidate claude-desktop

# 或使用其他选项
npx -y @1mcp/agent app consolidate claude-desktop --dry-run  # 首先预览更改
npx -y @1mcp/agent app consolidate claude-desktop --force    # 跳过连接性检查
```

此命令将：

1. **发现**您现有的 Claude Desktop 配置
2. **将**任何现有的 MCP 服务器从 Claude Desktop 导入到 1MCP
3. **替换** Claude Desktop 配置以通过 stdio 传输使用 1MCP
4. **创建**原始配置的备份

### 步骤 4：重新启动 Claude Desktop

整合后，重新启动 Claude Desktop 以加载新配置。您的工具现在应该可以通过 1MCP 使用。

### 步骤 5：验证集成

1. **检查可用工具**：在 Claude Desktop 中，您整合的 MCP 工具应该会出现
2. **测试功能**：尝试使用您的一个工具以确认其正常工作
3. **查看日志**（如果需要）：

   ```bash
   # 检查 1MCP 服务器状态
   npx -y @1mcp/agent mcp status

   # 查看服务器日志以进行调试
   npx -y @1mcp/agent serve --transport stdio --verbose
   ```

### 生成的配置

整合过程会在 Claude Desktop 中创建如下配置：

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

### 备份和还原

您的原始配置会自动备份：

```bash
# 列出可用的备份
npx -y @1mcp/agent app backups claude-desktop

# 如果需要，还原原始配置
npx -y @1mcp/agent app restore claude-desktop
```

## 方法 2：远程自定义连接器（高级）

对于需要远程访问集中式 1MCP 服务器的高级用例。

### 先决条件

- **Claude Desktop**：从 [claude.ai](https://claude.ai/desktop) 下载并安装
- **付费计划**：自定义连接器需要 Claude Pro、Max、Team 或 Enterprise 计划
- **1MCP 服务器**：可通过 HTTP/HTTPS 访问的正在运行的 1MCP 服务器实例

### 分步远程集成指南

### 步骤 1：启动您的 1MCP 服务器

首先，使用 HTTP 传输启动您的 1MCP 服务器：

```bash
# 基本 HTTP 服务器（开发）
npx -y @1mcp/agent serve --transport http --port 3001

# 使用身份验证（生产）
npx -y @1mcp/agent serve --transport http --port 3001 --enable-auth

# 或使用 SSE（服务器发送事件）
npx -y @1mcp/agent serve --transport sse --port 3001
```

您的服务器将在 `http://localhost:3001` 上本地运行，但 **Claude Desktop 需要一个公共 HTTPS URL**，因此您需要使用隧道服务或反向代理。

### 步骤 1.1：公开您的服务器（Claude Desktop 必需）

由于 1MCP 没有内置的 HTTPS 支持，您有几个选择：

#### 选项 A：使用 ngrok（用于测试/演示）

1. **安装 ngrok**：[从 ngrok.com 下载](https://ngrok.com)

2. **公开您的本地服务器**：

   ```bash
   # 启动 1MCP 服务器
   npx -y @1mcp/agent serve --transport http --port 3001

   # 在另一个终端中，通过 ngrok 公开
   ngrok http 3001
   ```

3. **使用 HTTPS URL**：ngrok 将提供一个 HTTPS URL，例如：
   ```
   https://abc123.ngrok-free.app/mcp
   ```

#### 选项 B：使用负载均衡器/反向代理（用于生产）

**使用 Nginx**：

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

**使用 Caddy**：

```caddy
your-domain.com {
    reverse_proxy /mcp/* localhost:3001
}
```

**使用 Traefik** (docker-compose.yml)：

```yaml
services:
  traefik:
    image: traefik:v2.10
    command:
      - '--providers.docker=true'
      - '--entrypoints.web.address=:80'
      - '--entrypoints.websecure.address=:443'
      - '--certificatesresolvers.myresolver.acme.httpchallenge=true'
      - '--certificatesresolvers.myresolver.acme.httpchallenge.entrypoint=web'
      - '--certificatesresolvers.myresolver.acme.email=your-email@domain.com'
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./data:/data

  1mcp:
    image: ghcr.io/1mcp-app/agent:latest
    command: serve --transport http --port 3001
    labels:
      - 'traefik.enable=true'
      - 'traefik.http.routers.1mcp.rule=Host(`your-domain.com`)'
      - 'traefik.http.routers.1mcp.entrypoints=websecure'
      - 'traefik.http.routers.1mcp.tls.certresolver=myresolver'
```

### 步骤 2：在 Claude Desktop 中添加自定义连接器

1. **打开 Claude Desktop 设置**
   - 在 Claude Desktop 中单击您的个人资料/设置
   - 导航到“连接器”或查找连接器管理

2. **添加自定义连接器**
   - 单击“**添加自定义连接器**”
   - 您将看到如下对话框：

！[步骤 1：添加自定义连接器对话框](/images/claude-desktop-step1.png)

3. **输入连接详细信息**
   - **名称**：为您的连接器输入一个名称（例如，“1mcp”）
   - **URL**：输入您的公共 HTTPS URL：
     - 使用 ngrok：`https://abc123.ngrok-free.app/mcp`
     - 使用反向代理：`https://your-domain.com/mcp`
   - **OAuth 客户端 ID**（可选）：如果使用身份验证
   - **OAuth 客户端密钥**（可选）：如果使用身份验证

4. **确认信任**
   - 查看安全警告
   - 单击“**添加**”以确认您信任此连接器

### 步骤 3：验证连接

添加连接器后，您应该会看到可用的 1MCP 工具：

！[步骤 2：1MCP 提供的可用工具](/images/claude-desktop-step2.png)

显示的工具将取决于您在 1MCP 实例中配置的 MCP 服务器。常用工具包括：

- Context7 库文档工具
- 顺序思维工具
- Playwright 浏览器自动化
- 以及您添加的任何其他 MCP 服务器

### 步骤 4：使用您的工具

连接后，您的 1MCP 工具将出现在 Claude Desktop 的界面中：

！[步骤 3：聊天中可用的工具](/images/claude-desktop-step3.png)

您现在可以在与 Claude 的对话中直接使用这些工具。

## 服务器配置

### 1MCP 服务器设置

为 Claude Desktop 集成配置您的 1MCP 服务器：

````bash
# 开发设置（HTTP，无身份验证）
npx -y @1mcp/agent serve --transport http --port 3001

```bash
# 生产设置（使用身份验证的 HTTP，使用反向代理处理 HTTPS）
npx -y @1mcp/agent serve --transport http --port 3001 --enable-auth
```

# 使用特定的服务器筛选

npx -y @1mcp/agent serve --transport http --port 3001 --tags "context7,sequential,playwright"

# 用于 ngrok 或反向代理

npx -y @1mcp/agent serve --transport http --port 3001 --host 0.0.0.0

````

### 身份验证设置

如果您想使用 OAuth 身份验证：

1. **启用身份验证**：

   ```bash
   1mcp serve --transport http --port 3001 --enable-auth
   ```

````

2. **配置 OAuth 客户端**：
   - 您的 1MCP 服务器将提供 OAuth 端点
   - 在 Claude Desktop 的连接器设置中使用客户端 ID 和密钥
   - 身份验证流程将由 Claude Desktop 自动处理

3. **服务器到服务器身份验证**：
   对于高级设置，您可以在 1MCP 服务器配置中配置 API 密钥或其他身份验证方法。

## 故障排除

### 本地配置问题

#### 整合后工具未出现

**症状**：整合完成，但工具未出现在 Claude Desktop 中。

**解决方案**：

1. **重新启动 Claude Desktop**：确保在整合后完全重新启动 Claude Desktop

2. **检查配置**：验证整合是否正确工作

   ```bash
   # 检查生成的配置
   cat "~/Library/Application Support/Claude/claude_desktop_config.json"
````

3. **测试 1MCP 服务器**：验证 1MCP 是否正常工作

   ```bash
   # 检查服务器状态
   npx -y @1mcp/agent mcp status

   # 测试 stdio 传输
   echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{}}}' | npx -y @1mcp/agent serve --transport stdio
   ```

#### “整合失败”错误

**症状**：整合命令失败并出现错误。

**解决方案**：

1. **使用强制标志**：跳过连接性验证

   ```bash
   npx -y @1mcp/agent app consolidate claude-desktop --force
   ```

2. **检查权限**：确保对 Claude Desktop 的配置目录具有写访问权限

   ```bash
   ls -la "~/Library/Application Support/Claude/"
   ```

3. **手动清理**：如果整合部分完成

   ```bash
   # 从备份还原
   npx -y @1mcp/agent app restore claude-desktop

   # 或手动重置
   npx -y @1mcp/agent app consolidate claude-desktop --force
   ```

#### “配置备份失败”错误

**症状**：无法创建现有配置的备份。

**解决方案**：

1. **检查磁盘空间**：确保有足够的磁盘空间
2. **检查权限**：验证对备份目录的写访问权限
3. **使用强制模式**：在没有备份的情况下继续（谨慎使用）
   ```bash
   npx -y @1mcp/agent app consolidate claude-desktop --force --backup-only
   ```

### 远程自定义连接器问题

#### “连接失败”错误

**症状**：添加连接器时 Claude Desktop 显示连接失败。

**解决方案**：

1. **检查服务器状态**：确保您的 1MCP 服务器正在运行

   ```bash
   npx -y @1mcp/agent mcp status  # 检查服务器是否正在运行
   ```

2. **验证 URL**：确保 URL 正确且可访问

   ```bash
   curl https://your-domain.com/mcp/health  # 测试基本连接性
   ```

3. **检查防火墙**：确保端口已打开且可访问

#### 工具未出现

**症状**：连接器已连接，但看不到任何工具。

**解决方案**：

1. **检查服务器配置**：验证 MCP 服务器是否已正确配置

   ```bash
   npx -y @1mcp/agent mcp list  # 列出已配置的服务器
   ```

2. **重新启动两者**：重新启动 1MCP 和 Claude Desktop

#### 身份验证问题

**症状**：OAuth 身份验证失败或不断要求输入凭据。

**解决方案**：

1. **检查 OAuth 配置**：确保在 1MCP 中正确配置了 OAuth
2. **验证凭据**：仔细检查 Claude Desktop 中的客户端 ID 和密钥
3. **清除缓存**：尝试删除并重新添加连接器

### 调试步骤

1. **测试直接连接**：

   ```bash
   # 测试您公开的 HTTPS 端点
   curl -X POST https://your-domain.com/mcp \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{"roots":{"listChanged":true}}}}'
   ```

2. **检查服务器日志**：

   ```bash
   npx -y @1mcp/agent serve --transport http --port 3001 --verbose
   ```

3. **健康检查**：
   ```bash
   # 检查服务器是否通过您的代理/隧道响应
   curl https://your-domain.com/health
   ```

## 安全注意事项

### 生产部署

为 Claude Desktop 集成部署 1MCP 时：

1. **使用 HTTPS**：始终在生产中通过反向代理使用 HTTPS

   ```bash
   # 在 HTTP 上启动 1MCP（反向代理处理 HTTPS）
   npx -y @1mcp/agent serve --transport http --port 3001 --host 0.0.0.0

   # 配置您的反向代理（nginx/caddy/traefik）以处理 HTTPS
   ```

2. **启用身份验证**：使用 OAuth 进行安全访问

   ```bash
   1mcp serve --transport http --port 3001 --enable-auth
   ```

3. **网络安全**：
   - 使用适当的防火墙规则
   - 考虑为敏感环境使用 VPN 或专用网络
   - 在反向代理级别实施速率限制和 DDoS 保护
   - 如果在同一台服务器上使用反向代理，则将 1MCP 绑定到 localhost

### 信任和权限

- **仔细审查**：仅连接到受信任的 1MCP 服务器
- **了解权限**：查看哪些工具将可访问
- **定期审核**：定期审查连接的连接器及其权限

## 高级用法

### 多个环境

您可以为不同的环境添加多个 1MCP 连接器：

1. **开发环境**：
   - 名称：“1MCP Dev”
   - URL：`https://dev-abc123.ngrok-free.app/mcp`（使用 ngrok）

2. **生产环境**：
   - 名称：“生产 1MCP”
   - URL：`https://prod-server.com/mcp`
   - 生产的 OAuth 凭据

### 服务器筛选

通过筛选服务器来控制哪些工具可用：

```bash
# 仅公开特定的功能
npx -y @1mcp/agent serve --transport http --port 3001 --tags "context7,sequential"
```

## 最佳实践

### 对于本地配置整合

1. **从发现开始**：在整合之前使用 `app discover` 查看可用的内容
2. **预览更改**：始终首先使用 `--dry-run` 预览将要发生的事情
3. **首先备份**：整合会自动创建备份，但要验证它们是否存在
4. **重新启动后测试**：整合后始终重新启动 Claude Desktop 并测试一个工具
5. **保持 1MCP 更新**：定期更新 1MCP 代理：`npm update -g @1mcp/agent`
6. **监控服务器健康状况**：使用 `mcp status` 定期检查服务器健康状况

### 对于远程自定义连接器

1. **从简单开始**：从 HTTP 和无身份验证开始，然后添加安全功能
2. **使用 HTTPS**：始终在生产环境中使用 HTTPS/SSL
3. **监控健康状况**：为您的 1MCP 服务器实施健康检查和监控
4. **定期更新**：保持您的 1MCP 服务器和 MCP 服务器为最新
5. **安全审查**：定期审查连接的工具及其权限
6. **备份配置**：保留您的 1MCP 服务器配置的备份
7. **测试连接**：在向 Claude Desktop 添加连接器之前验证连接性

## 完整设置示例

### 示例 1：本地配置（推荐给大多数用户）

```bash
# 1. 安装 1MCP 代理
npm install -g @1mcp/agent

# 2. 添加一些有用的 MCP 服务器
npx -y @1mcp/agent mcp add context7 -- npx -y @upstash/context7-mcp
npx -y @1mcp/agent mcp add sequential -- npx -y @modelcontextprotocol/server-sequential-thinking
npx -y @1mcp/agent mcp add playwright -- npx -y @playwright/mcp

# 3. 预览整合将做什么
npx -y @1mcp/agent app consolidate claude-desktop --dry-run

# 4. 整合 Claude Desktop 配置
npx -y @1mcp/agent app consolidate claude-desktop

# 5. 重新启动 Claude Desktop

# 6. 验证工具在 Claude Desktop 中是否可用
npx -y @1mcp/agent mcp status  # 检查服务器健康状况
```

您的 Claude Desktop 现在将自动使用以下配置：

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

### 示例 2：使用 ngrok 进行远程开发

对于需要远程访问的开发设置：

```bash
# 1. 安装和配置 1MCP
npm install -g @1mcp/agent
npx -y @1mcp/agent mcp add context7 -- npx -y @upstash/context7-mcp
npx -y @1mcp/agent mcp add sequential -- npx -y @modelcontextprotocol/server-sequential-thinking

# 2. 启动服务器
npx -y @1mcp/agent serve --transport http --port 3001

# 3. 在另一个终端中，通过 ngrok 公开
ngrok http 3001

# 4. 在 Claude Desktop 中添加连接器：
#    - 名称：“我的 1MCP 服务器”
#    - URL：“https://abc123.ngrok-free.app/mcp”（使用 ngrok 提供的 URL）

# 5. 验证工具在 Claude Desktop 中是否可用
```

### 示例 3：使用 Nginx 的生产环境

```bash
# 1. 启动 1MCP 服务器（为安全起见，绑定到 localhost）
npx -y @1mcp/agent serve --transport http --port 3001 --enable-auth

# 2. 配置 nginx 以将 HTTPS 代理到 HTTP
# 3. 在 Claude Desktop 中添加连接器：
#    - 名称：“生产 1MCP”
#    - URL：“https://your-domain.com/mcp”
#    - 添加 OAuth 凭据

# 4. 验证工具在 Claude Desktop 中是否可用
```

## 获取帮助

如果您遇到问题：

1. 查看上面的[故障排除部分](#故障排除)
2. 对于**本地配置问题**：
   - 尝试 `npx -y @1mcp/agent app consolidate claude-desktop --force`
   - 检查 `npx -y @1mcp/agent mcp status` 以了解服务器健康状况
   - 使用 `npx -y @1mcp/agent app restore claude-desktop` 回滚
3. 对于**远程连接器问题**：
   - 查看 Anthropic 的文档：
     - [通过远程 MCP 服务器构建自定义连接器](https://support.anthropic.com/en/articles/11503834-building-custom-connectors-via-remote-mcp-servers)
     - [从目录中浏览和连接到工具](https://support.anthropic.com/en/articles/11724452-browsing-and-connecting-to-tools-from-the-directory)
4. 在我们的 [GitHub 存储库](https://github.com/1mcp-app/agent)上打开一个问题
5. 查看 [1MCP 文档](./getting-started)以获取服务器配置帮助

## 我应该使用哪种方法？

### 如果您选择**本地配置整合**：

- ✅ 您想要最简单的设置
- ✅ 您正在本地计算机上使用 Claude Desktop
- ✅ 您不需要远程访问
- ✅ 您想要脱机功能
- ✅ 您不想处理 HTTPS/隧道

### 如果您选择**远程自定义连接器**：

- ✅ 您有 Claude Pro/Max/Team/Enterprise 计划
- ✅ 您需要访问集中式 1MCP 服务器
- ✅ 您对网络/HTTPS 设置感到满意
- ✅ 您想在多个客户端之间共享 MCP 服务器
- ✅ 您需要 OAuth 身份验证

## 后续步骤

- 了解[身份验证配置](./authentication)
- 探索[服务器筛选选项](./server-filtering)
- 为您的 MCP 服务器设置[服务器管理](./server-management)
- 配置[应用程序整合](./app-consolidation)以实现对其他应用程序的无缝管理
