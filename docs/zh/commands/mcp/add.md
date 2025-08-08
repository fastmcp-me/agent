# mcp add

向 1MCP 配置中添加一个新的 MCP 服务器。

有关服务器管理的完整概述，请参阅 **[服务器管理指南](../../guide/server-management)**。

## 摘要

```bash
# 标准语法
npx -y @1mcp/agent mcp add <name> --type <type> [options]

# 使用“ -- ”模式的快速语法（自动检测类型为 stdio）
npx -y @1mcp/agent mcp add <name> [options] -- <command> [args...]
```

## 参数

- **`<name>`**
  - 新服务器的唯一名称。
  - **必需**：是

## 选项

- **`--type <type>`**
  - 服务器的传输类型。
  - **必需**：是（或在使用“ -- ”模式时自动检测）
  - **值**：`stdio`、`http`

- **`--command <command>`**
  - 为 `stdio` 服务器执行的命令。
  - **`stdio` 必需**

- **`--args <args>`**
  - `stdio` 命令的逗号分隔的参数列表。

- **`--url <url>`**
  - `http` 服务器的 URL。
  - **`http` 必需**

- **`--tags <tags>`**
  - 用于组织的逗号分隔的标签列表。

- **`--env <key=value>`**
  - `stdio` 服务器的环境变量。可以多次指定。

- **`--timeout <ms>`**
  - 连接超时（以毫秒为单位）。

## 示例

### 标准语法

```bash
# 添加一个本地文件系统服务器
npx -y @1mcp/agent mcp add files --type=stdio --command="mcp-server-fs" --args="--root,./"

# 添加一个带有标签的远程 HTTP 服务器
npx -y @1mcp/agent mcp add remote-api --type=http --url="https://api.example.com/mcp" --tags="api,prod"
```

### 快速“ -- ”模式语法

```bash
# 使用“ -- ”模式添加服务器（类型自动检测为 stdio）
npx -y @1mcp/agent mcp add airtable --env AIRTABLE_API_KEY=your_key -- npx -y airtable-mcp-server

# 使用 Windows 命令包装器添加服务器
npx -y @1mcp/agent mcp add my-server -- cmd /c npx -y @some/package

# 将环境变量与“ -- ”模式结合使用
npx -y @1mcp/agent mcp add context7 --env API_TOKEN=secret --tags=ai,tools -- npx -y @context7/server
```

## 另请参阅

- **[服务器管理指南](../../guide/server-management)**
