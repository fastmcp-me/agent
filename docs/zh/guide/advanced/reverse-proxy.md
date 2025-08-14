# 代理支持

1MCP 支持信任代理配置，以便在负载均衡器和反向代理（如 nginx、Apache 或 Cloudflare）后面进行部署。

## 概述

当 1MCP 在代理后面运行时，需要将其配置为信任该代理，以便正确识别客户端的 IP 地址和协议 (HTTP/HTTPS)。这对于速率限制等安全功能和准确的日志记录至关重要。

## 配置

可以通过 `--trust-proxy` 命令行标志或 `ONE_MCP_TRUST_PROXY` 环境变量来配置信任代理设置。

有关可用选项以及如何在 JSON 文件、CLI 或环境中配置它们的详细信息，请参阅 **[配置深入探讨](./configuration#network-options)**。

有关具体示例和安全注意事项，请参阅 **[信任代理参考](../reference/trust-proxy)**。
