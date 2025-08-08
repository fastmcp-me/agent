# app status

显示您的桌面应用程序的当前整合状态。

此命令检查应用程序是配置为直接连接到其自己的 MCP 服务器，还是连接到中央 1MCP 实例。

有关整合工作流程的完整概述，请参阅 **[应用程序整合指南](../../guide/app-consolidation)**。

## 摘要

```bash
npx -y @1mcp/agent app status [app-name] [options]
```

## 参数

- **`[app-name]`**
  - 要检查的应用程序。如果省略，它将显示所有支持的应用程序的状态。

## 选项

- **`--verbose, -v`**
  - 显示详细的配置和备份信息。

## 示例

```bash
# 显示所有应用程序的状态
npx -y @1mcp/agent app status

# 显示特定应用程序的状态
npx -y @1mcp/agent app status claude-desktop

# 显示详细的状态信息
npx -y @1mcp/agent app status --verbose
```

## 另请参阅

- **[应用程序整合指南](../../guide/app-consolidation#the-consolidation-workflow)**
