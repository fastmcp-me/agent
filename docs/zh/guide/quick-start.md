# 快速入门

在 5 分钟内使用基本配置让 1MCP 运行起来。

## 先决条件

- Node.js 18+

## 基本设置

1.  **创建配置**

    ```bash
    # 创建一个基本的配置文件
    cat > mcp.json << 'EOF'
    {
      "mcpServers": {
        "filesystem": {
          "command": ["npx", "-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
          "description": "文件系统访问"
        }
      }
    }
    EOF
    ```

2.  **启动服务器**

    ```bash
    npx -y @1mcp/agent --config mcp.json --port 3000
    ```

3.  **测试连接**

    服务器现在正在端口 3000 上运行。您现在可以将您的 MCP 客户端连接到此端口。

就是这样！您的 1MCP 代理现在正在运行并聚合 MCP 服务器。

## 下一步

- [启用认证](/zh/guide/advanced/authentication) 用于生产环境
- [添加更多服务器](/zh/guide/essentials/configuration) 以扩展功能

## 常见问题

**服务器启动失败？**

- 检查是否安装了 Node.js 18+：`node --version`
- 验证配置文件是否为有效的 JSON：`cat mcp.json | jq`

**无法连接到 MCP 服务器？**

- 确保服务器命令是可执行的
- 检查服务器日志以获取特定的错误消息
