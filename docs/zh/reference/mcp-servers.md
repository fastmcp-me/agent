# MCP 服务器配置参考

本文档提供了在 1MCP 代理中配置 MCP (Model Context Protocol) 服务器的全面参考文档。

## 概述

1MCP 代理通过 JSON 配置文件管理多个后端 MCP 服务器。每个服务器都在 `mcpServers` 部分中定义，具有控制其行为、传输方法和环境的特定属性。

---

## 配置文件结构

### JSON 文件结构

代理使用 JSON 文件（例如 `mcp.json`）来定义后端服务器及其设置。

```json
{
  "mcpServers": {
    // 服务器定义
  }
}
```

### 默认位置

- **macOS**: `~/.config/1mcp/mcp.json`
- **Linux**: `~/.config/1mcp/mcp.json`
- **Windows**: `%APPDATA%\1mcp\mcp.json`

### 配置目录覆盖

代理支持覆盖整个配置目录位置，这会影响配置文件、备份和其他相关文件的存储位置。

**默认位置：**

- **macOS**: `~/.config/1mcp/`
- **Linux**: `~/.config/1mcp/`
- **Windows**: `%APPDATA%\1mcp\`

**覆盖方法：**

1. **命令行标志：**

   ```bash
   npx -y @1mcp/agent --config-dir /custom/config/path
   ```

2. **环境变量：**
   ```bash
   ONE_MCP_CONFIG_DIR=/custom/config/path npx -y @1mcp/agent
   ```

当您覆盖配置目录时，代理将：

- 在指定目录中查找 `mcp.json`
- 在 `backups` 子目录中存储备份
- 在指定目录中存储预设和其他配置文件

**示例：**

```bash
# 使用项目特定的配置目录
npx -y @1mcp/agent --config-dir ./project-config
```

这为需要隔离配置的项目创建了一个自包含的配置设置。

---

## MCP 服务器配置

### `mcpServers` 部分

这是代理将管理的所有后端 MCP 服务器的字典。

- **键**: 服务器的唯一、人类可读名称（例如 `my-filesystem`）。
- **值**: 服务器配置对象。

### 服务器属性

**通用属性：**

- `transport` (字符串, 可选): `stdio` 或 `http`。如果存在 `command` 则默认为 `stdio`，如果存在 `url` 则默认为 `http`。
- `tags` (字符串数组, 必需): 用于路由和访问控制的标签。
- `timeout` (数字, 可选): 连接超时时间（毫秒）。
- `enabled` (布尔值, 可选): 设置为 `false` 以禁用服务器。默认为 `true`。

**HTTP 传输属性：**

- `url` (字符串, `http` 必需): 远程 MCP 服务器的 URL。

**Stdio 传输属性：**

- `command` (字符串, `stdio` 必需): 要执行的命令。
- `args` (字符串数组, 可选): 命令的参数。
- `cwd` (字符串, 可选): 进程的工作目录。
- `env` (对象或数组, 可选): 环境变量。可以是对象 `{"KEY": "value"}` 或数组 `["KEY=value", "PATH"]`。
- `inheritParentEnv` (布尔值, 可选): 从父进程继承环境变量。默认为 `false`。
- `envFilter` (字符串数组, 可选): 用于过滤继承的环境变量的模式。支持 `*` 通配符和 `!` 排除。
- `restartOnExit` (布尔值, 可选): 进程退出时自动重启。默认为 `false`。
- `maxRestarts` (数字, 可选): 最大重启尝试次数。如果未指定，则允许无限重启。
- `restartDelay` (数字, 可选): 重启尝试之间的延迟（毫秒）。默认为 `1000`（1秒）。

### 配置示例

**基本配置：**

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

**增强的 Stdio 配置：**

```json
{
  "mcpServers": {
    "enhanced-server": {
      "command": "node",
      "args": ["server.js"],
      "cwd": "/app",
      "inheritParentEnv": true,
      "envFilter": ["PATH", "HOME", "NODE_*", "!SECRET_*", "!BASH_FUNC_*"],
      "env": {
        "NODE_ENV": "production",
        "API_KEY": "${MCP_API_KEY}",
        "DEBUG": "false"
      },
      "restartOnExit": true,
      "maxRestarts": 5,
      "restartDelay": 2000,
      "tags": ["production", "api"],
      "timeout": 30000
    }
  }
}
```

**数组环境格式：**

```json
{
  "mcpServers": {
    "array-env-server": {
      "command": "python",
      "args": ["server.py"],
      "env": ["PATH", "NODE_ENV=production", "API_KEY=${SECRET_KEY}"],
      "tags": ["python", "api"]
    }
  }
}
```

---

## 高级环境管理

### 环境变量替换

在您的配置中使用 `${VARIABLE_NAME}` 语法在运行时替换环境变量：

```json
{
  "mcpServers": {
    "dynamic-server": {
      "command": "${SERVER_COMMAND}",
      "args": ["--port", "${SERVER_PORT}"],
      "env": {
        "API_KEY": "${SECRET_API_KEY}",
        "DATABASE_URL": "${DB_CONNECTION_STRING}"
      },
      "tags": ["dynamic"]
    }
  }
}
```

### 环境继承和过滤

**继承父环境：**
设置 `inheritParentEnv: true` 以从父进程继承环境变量：

```json
{
  "inheritParentEnv": true
}
```

**环境过滤：**
使用 `envFilter` 通过模式匹配控制哪些变量被继承：

```json
{
  "inheritParentEnv": true,
  "envFilter": [
    "PATH", // 允许 PATH 变量
    "HOME", // 允许 HOME 变量
    "NODE_*", // 允许所有 NODE_* 变量
    "NPM_*", // 允许所有 NPM_* 变量
    "!SECRET_*", // 阻止所有 SECRET_* 变量
    "!BASH_FUNC_*" // 阻止 bash 函数定义
  ]
}
```

**过滤模式：**

- `VARIABLE_NAME`: 包含特定变量
- `PREFIX_*`: 包含所有以 PREFIX\_ 开头的变量
- `!VARIABLE_NAME`: 排除特定变量
- `!PREFIX_*`: 排除所有以 PREFIX\_ 开头的变量

### 灵活的环境格式

**对象格式（传统）：**

```json
{
  "env": {
    "NODE_ENV": "production",
    "DEBUG": "false",
    "API_TIMEOUT": "30000"
  }
}
```

**数组格式（Docker 风格）：**

```json
{
  "env": [
    "NODE_ENV=production",
    "DEBUG=false",
    "PATH", // 从父级继承 PATH
    "API_TIMEOUT=${TIMEOUT_VALUE}"
  ]
}
```

---

## 进程管理

### 自动重启

当服务器意外退出时启用自动进程重启：

```json
{
  "restartOnExit": true,
  "maxRestarts": 5,
  "restartDelay": 2000
}
```

**重启配置选项：**

- `restartOnExit`: 启用自动重启功能
- `maxRestarts`: 限制重启尝试次数（省略则允许无限重启）
- `restartDelay`: 重启尝试之间等待的毫秒数（默认：1000ms）

### 工作目录

为进程设置自定义工作目录：

```json
{
  "cwd": "/path/to/server/directory"
}
```

---

## 完整配置示例

```json
{
  "mcpServers": {
    "production-server": {
      "command": "node",
      "args": ["dist/server.js"],
      "cwd": "/app",

      // 带有安全过滤的环境继承
      "inheritParentEnv": true,
      "envFilter": [
        "PATH",
        "HOME",
        "USER", // 基本系统变量
        "NODE_*",
        "NPM_*", // Node.js 相关
        "!SECRET_*",
        "!KEY_*", // 阻止密钥
        "!BASH_FUNC_*" // 阻止函数
      ],

      // 带有替换的自定义环境
      "env": {
        "NODE_ENV": "production",
        "API_KEY": "${PROD_API_KEY}",
        "DB_URL": "${DATABASE_CONNECTION}",
        "LOG_LEVEL": "info"
      },

      // 进程管理
      "restartOnExit": true,
      "maxRestarts": 3,
      "restartDelay": 1500,

      // 标准 MCP 属性
      "tags": ["production", "api"],
      "timeout": 30000
    }
  }
}
```

---

## 热重载

代理支持配置文件的热重载。如果您在代理运行时修改 JSON 文件，它将自动应用新配置而无需重启。

---

## 另请参阅

- **[配置深入指南](../guide/essentials/configuration.md)** - CLI 标志和环境变量
- **[Serve 命令参考](../commands/serve.md)** - 命令行使用示例
- **[安全指南](security.md)** - MCP 服务器的安全最佳实践
