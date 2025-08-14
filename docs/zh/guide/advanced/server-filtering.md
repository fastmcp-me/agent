# 按标签筛选服务器

1MCP 代理提供基于标签的服务器筛选功能，允许您根据分配给后端 MCP 服务器的标签将其请求定向到特定的后端 MCP 服务器。此功能有助于按其功能组织和控制对不同 MCP 服务器的访问。

## 工作原理

连接到 1MCP 代理时，您可以指定标签以筛选可用的后端服务器。代理将仅连接到并路由请求到具有指定标签的服务器。

例如，如果您有两台服务器——一台带有 `filesystem` 标签，另一台带有 `search` 标签——您可以通过在连接中包含适当的标签来控制哪些服务器可用。

## 配置

要启用服务器筛选，您需要在 `mcp.json` 配置文件中为后端服务器分配标签。

```json
{
  "mcpServers": {
    "file_server": {
      "command": ["npx", "-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
      "tags": ["filesystem", "read-only"]
    },
    "search_server": {
      "command": ["uvx", "mcp-server-fetch"],
      "tags": ["search", "web"]
    }
  }
}
```

在此示例中：

- `file_server` 标记为 `filesystem` 和 `read-only`。
- `search_server` 标记为 `search` 和 `web`。

## 用法

连接到 1MCP 代理时，您可以指定标签以筛选哪些服务器可用：

```bash
# 仅连接到带有“filesystem”标签的服务器
npx -y @1mcp/agent --transport stdio --tags "filesystem"

# 连接到带有“filesystem”或“web”标签的服务器
npx -y @1mcp/agent --transport stdio --tags "filesystem,web"
```

对于带有标签筛选的 HTTP 连接，请在请求标头或身份验证范围（启用 OAuth 时）中指定标签。

如果指定了多个标签，则服务器必须具有所有指定的标签才能被包括在内。
