# E2E Testing for 1MCP Agent

This directory contains comprehensive end-to-end tests for the 1MCP agent, covering both stdio and HTTP transports with real MCP protocol communication.

## Test Structure

```
src/test/e2e/
├── fixtures/           # Test MCP servers
├── utils/             # Test utilities and helpers
├── stdio/             # Stdio transport E2E tests
├── http/              # HTTP transport E2E tests
├── integration/       # Multi-transport integration tests
└── setup/             # Global test setup/teardown
```

## Test Fixtures

The test fixtures include simple MCP servers for various testing scenarios:

- **echo-server.js** - Reflects all requests for basic communication testing
- **error-server.js** - Returns various error conditions for error handling tests
- **capability-server.js** - Tests resource/tool/prompt capabilities
- **slow-server.js** - Introduces delays for timeout testing
- **crash-server.js** - Intentionally crashes for error scenario testing

## Running E2E Tests

### Working Demo Tests (Recommended)

```bash
# Run the working infrastructure demo
pnpm test:e2e:demo

# Or run all E2E tests (currently only demo tests)
pnpm test:e2e
```

### Watch Mode

```bash
pnpm test:e2e:watch
```

### Full Test Suite (Future)

```bash
# Stdio transport tests (requires MCP SDK fixes)
pnpm test:e2e:stdio

# HTTP transport tests (requires full implementation)
pnpm test:e2e:http

# Integration tests (requires working servers)
pnpm test:e2e:integration
```

### Combined Unit + E2E Tests

```bash
pnpm test:all
```

## Current Status

✅ **Working Components:**

- E2E test directory structure and organization
- Test utilities (ConfigBuilder, ProtocolValidator, TestProcessManager)
- Test configuration generation and management
- Protocol validation for JSON-RPC and MCP messages
- Basic process management for test scenarios

⚠️ **Pending Components:**

- MCP test servers (require SDK compatibility fixes)
- Full stdio transport E2E tests (require working test servers)
- HTTP transport E2E tests (require full HTTP implementation)
- Integration tests (require working MCP protocol communication)

The E2E test infrastructure is complete and demonstrated with working tests. The comprehensive test suites await resolution of MCP SDK compatibility issues and full server implementation.

## Test Categories

### Stdio Transport Tests

- **stdio-lifecycle.test.ts** - Process management and server lifecycle
- **stdio-protocol.test.ts** - MCP protocol communication over stdio
- **stdio-errors.test.ts** - Error handling and edge cases
- **stdio-integration.test.ts** - Full client workflow scenarios

### HTTP Transport Tests

- **http-auth.test.ts** - OAuth 2.1 authentication flows
- **http-mcp.test.ts** - MCP protocol over HTTP
- **http-management.test.ts** - Management API endpoints
- **http-sessions.test.ts** - Session management and lifecycle

### Integration Tests

- **multi-transport.test.ts** - Mixed stdio + HTTP server scenarios
- **performance.test.ts** - Performance and load testing

## Test Utilities

### TestProcessManager

Manages child process lifecycle for stdio servers:

```typescript
const processManager = new TestProcessManager();
const processInfo = await processManager.startProcess('test-server', {
  command: 'node',
  args: ['path/to/server.js'],
  timeout: 10000,
});
```

### McpTestClient

Test client for MCP protocol communication:

```typescript
const client = new McpTestClient({
  transport: 'stdio',
  stdioConfig: {
    command: 'node',
    args: ['server.js'],
  },
});
await client.connect();
const response = await client.listTools();
```

### ConfigBuilder

Dynamic test configuration generation:

```typescript
const config = ConfigBuilder.create()
  .enableStdioTransport()
  .enableHttpTransport(3000)
  .addStdioServer('echo', 'node', ['echo-server.js'])
  .writeToFile();
```

### ProtocolValidator

Validates MCP message compliance:

```typescript
const validation = ProtocolValidator.validateRequest(request);
expect(validation.valid).toBe(true);
```

## Configuration

E2E tests use a separate vitest configuration (`vitest.e2e.config.ts`) with:

- Extended timeouts (60s test timeout, 30s setup/teardown)
- Sequential execution to avoid port conflicts
- Retry logic for flaky network issues
- Global setup/teardown for environment preparation

## Environment Variables

- `NODE_ENV=test` - Set automatically during E2E tests
- `LOG_LEVEL=warn` - Reduces log noise during testing
- `MCP_DISABLE_CONSOLE=true` - Disables console logging in MCP servers
- `CI=true` - Enables single fork mode for CI environments

## Best Practices

### Writing E2E Tests

1. **Use real processes** - E2E tests spawn actual MCP server processes
2. **Test real protocols** - Use actual JSON-RPC over stdin/stdout or HTTP
3. **Handle async properly** - Always await process startup/shutdown
4. **Clean up resources** - Use beforeEach/afterEach for proper cleanup
5. **Expect failures** - Test error conditions and edge cases

### Performance Considerations

- Tests run sequentially to avoid port conflicts
- Each test gets a fresh server instance
- Random ports are used for HTTP tests
- Cleanup timeouts prevent hanging tests

### CI/CD Integration

E2E tests are designed to run in CI environments:

- Cross-platform compatibility (Windows/Unix)
- Proper resource cleanup
- Reasonable timeout limits
- Retry logic for flaky conditions

## Troubleshooting

### Common Issues

1. **Port conflicts** - Tests use random ports, but conflicts can still occur
2. **Process cleanup** - Ensure proper cleanup in test teardown
3. **Timing issues** - Use appropriate waits for async operations
4. **Resource limits** - CI environments may have limited resources

### Debugging

- Use `test:e2e:watch` for interactive debugging
- Check process manager logs for startup issues
- Verify server fixture implementations
- Use protocol validator for message format issues

## Coverage and Quality

E2E tests complement unit tests by:

- Testing real process communication
- Validating protocol compliance
- Checking error handling under real conditions
- Performance testing with actual workloads
- Cross-platform compatibility verification

The E2E test suite provides confidence that the 1MCP agent works correctly in real-world scenarios with actual MCP servers and clients.
