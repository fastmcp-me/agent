# 配置深入探讨

1MCP 代理是高度可配置的，允许您根据从本地开发到生产部署的各种情况调整其行为。可以通过 JSON 文件、命令行参数和环境变量来管理配置，这些配置按此优先顺序应用。

## 配置方法

1.  **JSON 文件**：定义服务器和全局设置的主要方法。
2.  **命令行标志**：用于在运行时覆盖特定设置。
3.  **环境变量**：对容器化部署和 CI/CD 非常有用。

---

## 1. JSON 配置文件

代理使用 JSON 文件（例如 `mcp.json`）来定义后端服务器和全局设置。

### 默认位置

- **macOS**：`~/Library/Application Support/1mcp/config.json`
- **Linux**：`~/.config/1mcp/config.json`
- **Windows**：`%APPDATA%\1mcp\config.json`

您可以使用 `--config` 标志覆盖路径。

### 顶级结构

```json
{
  "mcpServers": {
    // 服务器定义
  }
}
```

### `mcpServers` 部分

这是代理将管理的所有后端 MCP 服务器的字典。

- **键**：服务器的唯一、人类可读的名称（例如 `my-filesystem`）。
- **值**：服务器配置对象。

#### 服务器属性

- `command`（字符串，`stdio` 必需）：要执行的命令。
- `args`（字符串数组，可选）：命令的参数。
- `url`（字符串，`http` 必需）：远程 MCP 服务器的 URL。
- `transport`（字符串，可选）：`stdio` 或 `http`。如果存在 `command`，则默认为 `stdio`；如果存在 `url`，则默认为 `http`。
- `tags`（字符串数组，必需）：用于路由和访问控制的标签。
- `env`（对象，可选）：`stdio` 服务器的环境变量。
- `timeout`（数字，可选）：连接超时（以毫秒为单位）。
- `enabled`（布尔值，可选）：设置为 `false` 以禁用服务器。默认为 `true`。

#### `mcpServers` 示例

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "mcp-server-filesystem",
      "args": ["--root", "/data"],
      "tags": ["files", "local-data"]
    },
    "remote-api": {
      "transport": "http",
      "url": "https://api.example.com/mcp",
      "tags": ["api", "prod"],
      "timeout": 15000
    }
  }
}
```

---

## 2. 命令行标志

标志会覆盖 JSON 配置文件中的设置。

### 传输选项

- `--transport, -t <type>`：传输类型（`stdio`、`http`）。`sse` 已弃用。

### HTTP 传输选项

- `--port, -P <port>`：HTTP 端口。默认值：`3051`。
- `--host, -H <host>`：HTTP 主机。默认值：`localhost`。
- `--external-url <url>`：服务器的面向公众的 URL。

### 配置选项

- `--config, -c <path>`：配置文件的路径。
- `--config-watch`：启用/禁用配置文件监视。默认值：`true`。

### 日志记录选项

- `--log-level <level>`：`error`、`warn`、`info`、`debug`。
- `--log-file <path>`：日志文件的路径。

### 安全选项

- `--auth`：启用 OAuth 2.1 身份验证。默认值：`false`。
- `--client-id <id>`：OAuth 客户端 ID。
- `--client-secret <secret>`：OAuth 客户端密钥。
- `--scope-validation`：启用基于范围的授权。默认值：`false`。
- `--enhanced-security`：启用额外的安全功能。默认值：`false`。

### 网络选项

- `--trust-proxy <config>`：信任代理配置。请参阅[信任代理指南](../reference/trust-proxy)。默认值：`loopback`。

### 健康检查选项

- `--health-info-level <level>`：`full`、`basic`、`minimal`。默认值：`minimal`。

### 异步加载

- `--enable-async-loading`：启用异步 MCP 服务器加载。

---

## 3. 环境变量

环境变量以 `ONE_MCP_` 为前缀，对容器化环境非常有用。它们会覆盖 JSON 和 CLI 设置。

- `ONE_MCP_PORT`
- `ONE_MCP_HOST`
- `ONE_MCP_EXTERNAL_URL`
- `ONE_MCP_CONFIG_PATH`
- `ONE_MCP_CONFIG_WATCH`
- `ONE_MCP_LOG_LEVEL`
- `ONE_MCP_LOG_FILE`
- `ONE_MCP_AUTH`
- `ONE_MCP_CLIENT_ID`
- `ONE_MCP_CLIENT_SECRET`
- `ONE_MCP_SCOPE_VALIDATION`
- `ONE_MCP_ENHANCED_SECURITY`
- `ONE_MCP_TRUST_PROXY`
- `ONE_MCP_HEALTH_INFO_LEVEL`
- `ONE_E_MCP_ENABLE_ASYNC_LOADING`
- `ONE_MCP_SESSION_TTL`
- `ONE_MCP_SESSION_STORAGE_PATH`
- `ONE_MCP_RATE_LIMIT_WINDOW`
- `ONE_MCP_RATE_LIMIT_MAX`

---

## 热重载

代理支持配置文件的热重载。如果您在代理运行时修改 JSON 文件，它将自动应用新配置，而无需重新启动。
