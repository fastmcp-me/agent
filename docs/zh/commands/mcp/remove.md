# mcp remove

从 1MCP 配置中删除 MCP 服务器。

有关服务器管理的完整概述，请参阅 **[服务器管理指南](../../guide/server-management)**。

## 摘要

```bash
npx -y @1mcp/agent mcp remove <name> [options]
```

## 参数

- **`<name>`**
  - 要删除的服务器的名称。
  - **必需**：是

## 选项

- **`--yes, -y`**
  - 跳过确认提示。

## 示例

```bash
# 删除服务器
npx -y @1mcp/agent mcp remove my-server

# 删除服务器而不提示确认
npx -y @1mcp/agent mcp remove old-server --yes
```

## 另请参阅

- **[服务器管理指南](../../guide/server-management)**
