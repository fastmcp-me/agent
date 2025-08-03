# CLI Command E2E Testing

This directory contains comprehensive end-to-end tests for all CLI commands in the 1MCP agent. The tests are designed to run in complete isolation from your real application data and configurations.

## Overview

The command tests validate:

- **MCP Commands**: `mcp add`, `mcp remove`, `mcp list`, `mcp status`, `mcp enable`, `mcp disable`, `mcp update`
- **App Commands**: `app discover`, `app list`, `app status`, `app backups`, `app restore`, `app consolidate`
- **Integration Workflows**: Multi-command sequences and state consistency
- **Error Scenarios**: Invalid inputs, filesystem issues, network problems

## Safety Features

### Complete Isolation

- **Temporary Directories**: Each test runs in its own isolated temporary directory
- **Mock Configurations**: Tests use generated mock config files, not your real ones
- **Environment Variables**: Override all paths to prevent touching real data
- **Automatic Cleanup**: All test data is automatically cleaned up after each test

### No Real App Interference

- Tests never modify your actual MCP server configurations
- Application discovery uses mock application directories
- Backup operations work on test data only
- Network operations use localhost/unreachable test endpoints

## Test Structure

```
test/e2e/commands/
├── fixtures/           # Test data and mock configurations
│   └── TestFixtures.ts
├── utils/              # Testing utilities (exported from parent utils)
├── mcp/                # MCP command tests
│   ├── mcp-list.test.ts
│   ├── mcp-status.test.ts
│   ├── mcp-add.test.ts
│   ├── mcp-enable-disable.test.ts
│   └── mcp-remove-update.test.ts
├── app/                # App command tests
│   ├── app-discover.test.ts
│   ├── app-list-status.test.ts
│   ├── app-backups-restore.test.ts
│   └── app-consolidate.test.ts
├── integration/        # Multi-command workflow tests
│   └── command-workflows.test.ts
├── error-scenarios.test.ts  # Error handling tests
└── README.md
```

## Key Testing Components

### CommandTestEnvironment

Creates isolated test environments with:

- Temporary directories for config, backups, logs, apps
- Mock MCP server configurations
- Mock application installations
- Environment variable overrides
- Automatic cleanup

### CliTestRunner

Executes CLI commands safely:

- Runs commands in isolated environments
- Captures stdout/stderr output
- Handles timeouts and errors
- Provides assertion helpers
- Supports both MCP and App commands

### TestFixtures

Provides consistent test data:

- Mock MCP server configurations (stdio, HTTP, disabled servers)
- Mock application setups (VS Code, Cursor, Claude Desktop)
- Common command arguments and expected outputs
- Error scenarios and edge cases

## Running Tests

### All Command Tests

```bash
pnpm test:e2e:commands
```

### Specific Command Categories

```bash
# MCP commands only
pnpm test:e2e:mcp

# App commands only
pnpm test:e2e:app

# Integration workflows
pnpm test:e2e:integration

# Error scenarios
pnpm test:e2e:errors
```

### Watch Mode

```bash
pnpm test:e2e:commands:watch
```

### Individual Test Files

```bash
# Specific test file
npx vitest run --config vitest.e2e.config.ts test/e2e/commands/mcp/mcp-list.test.ts

# With watch mode
npx vitest --config vitest.e2e.config.ts test/e2e/commands/mcp/mcp-list.test.ts
```

## Test Examples

### Basic Command Test

```typescript
it('should list all servers', async () => {
  const result = await runner.runMcpCommand('list');

  runner.assertSuccess(result);
  runner.assertOutputContains(result, '📋 MCP Servers');
  runner.assertOutputContains(result, 'echo-server');
});
```

### Error Scenario Test

```typescript
it('should handle non-existent server', async () => {
  const result = await runner.runMcpCommand('status', {
    args: ['nonexistent-server'],
    expectError: true,
  });

  runner.assertFailure(result, 1);
  runner.assertOutputContains(result, 'Server not found', true);
});
```

### Integration Workflow Test

```typescript
it('should handle server lifecycle', async () => {
  // Add server
  await runner.runMcpCommand('add', {
    args: ['test-server', '--command', 'echo', '--args', 'test'],
  });

  // Verify it exists
  const listResult = await runner.runMcpCommand('list');
  runner.assertOutputContains(listResult, 'test-server');

  // Remove server
  await runner.runMcpCommand('remove', { args: ['test-server'] });

  // Verify it's gone
  const finalList = await runner.runMcpCommand('list');
  expect(finalList.stdout).not.toContain('test-server');
});
```

## Test Categories

### MCP Command Tests

#### `mcp-list.test.ts`

- Basic server listing (enabled/disabled)
- Verbose output with server details
- Tag filtering and search
- Transport type display
- Output formatting and counts
- Error handling for invalid configs

#### `mcp-status.test.ts`

- Overall system status
- Individual server status
- Connection health information
- JSON output format support
- Error scenarios and recovery

#### `mcp-add.test.ts`

- Stdio server creation with various options
- HTTP server creation with headers
- Configuration persistence
- Input validation and error handling
- Server naming and tagging

#### `mcp-enable-disable.test.ts`

- Server state management
- Batch enable/disable operations
- State persistence across operations
- Integration with list command
- Error handling for non-existent servers

#### `mcp-remove-update.test.ts`

- Server removal and configuration updates
- Multiple property updates
- Configuration validation
- State consistency during operations
- Complex update workflows

### App Command Tests

#### `app-discover.test.ts`

- Application discovery across platforms
- Configuration analysis
- Search filtering and customization
- Performance and caching
- Error handling for permission issues

#### `app-list-status.test.ts`

- Application listing and categorization
- Status monitoring and health checks
- Configuration analysis
- JSON output support
- Performance metrics

#### `app-backups-restore.test.ts`

- Backup creation and management
- Incremental backup support
- Restore operations with conflict resolution
- File system operations
- Error recovery and validation

#### `app-consolidate.test.ts`

- Configuration consolidation analysis
- Selective consolidation strategies
- Conflict resolution mechanisms
- Migration workflows
- Rollback and recovery features

### Integration Tests

#### `command-workflows.test.ts`

- Complete server lifecycle workflows
- Cross-command state consistency
- Batch operations and error recovery
- Performance under load
- Configuration persistence validation

### Error Scenario Tests

#### `error-scenarios.test.ts`

- Configuration file errors (missing, malformed, permissions)
- Command argument validation
- Server state conflicts
- Filesystem and network issues
- Resource exhaustion scenarios
- Error recovery and consistency

## Environment Variables

The test environment uses these variables to ensure isolation:

```bash
NODE_ENV=test
LOG_LEVEL=error
ONE_MCP_CONFIG_DIR=/tmp/1mcp-test-*/config
ONE_MCP_BACKUP_DIR=/tmp/1mcp-test-*/backups
ONE_MCP_LOG_DIR=/tmp/1mcp-test-*/logs
ONE_MCP_TEST_MODE=true
ONE_MCP_DISABLE_AUTO_DISCOVERY=true
```

## Debugging Tests

### Enable Verbose Logging

```bash
LOG_LEVEL=debug pnpm test:e2e:commands
```

### Run Single Test with Output

```bash
npx vitest run --config vitest.e2e.config.ts --reporter=verbose test/e2e/commands/mcp/mcp-list.test.ts
```

### Check Test Environment

```typescript
console.log('Test environment:', {
  tempDir: environment.getTempDir(),
  configPath: environment.getConfigPath(),
  env: environment.getEnvironmentVariables(),
});
```

## Contributing

When adding new command tests:

1. **Use TestFixtures** for consistent mock data
2. **Clean up resources** in `afterEach` hooks
3. **Test both success and error cases**
4. **Verify state consistency** across operations
5. **Include integration scenarios** for complex workflows
6. **Document test scenarios** in the test descriptions

### Test Naming Conventions

- Test files: `{command-category}-{command-name}.test.ts`
- Test suites: `{Command Name} Command E2E`
- Test cases: `should {expected behavior}`

### Assertion Helpers

- `runner.assertSuccess(result)` - Verify exit code 0
- `runner.assertFailure(result, code)` - Verify specific exit code
- `runner.assertOutputContains(result, text)` - Check stdout content
- `runner.assertOutputMatches(result, regex)` - Check stdout pattern
- `runner.parseJsonOutput(result)` - Parse JSON responses

## Troubleshooting

### Common Issues

**Tests fail with permission errors:**

- Check that test directories are writable
- Ensure cleanup is working properly
- Verify environment variable overrides

**Commands timeout:**

- Increase timeout in test configuration
- Check for hanging processes
- Verify test isolation

**State consistency errors:**

- Ensure proper cleanup between tests
- Check for race conditions in async operations
- Verify mock data is reset correctly

**Configuration not found:**

- Verify environment setup is complete
- Check config file creation in beforeEach
- Ensure paths are absolute, not relative

### Getting Help

If tests are failing:

1. Run with verbose logging: `LOG_LEVEL=debug`
2. Check individual test files with `--reporter=verbose`
3. Verify the build is up to date: `pnpm build`
4. Check test isolation by running tests individually

The command tests are designed to be comprehensive, isolated, and safe. They provide confidence that CLI commands work correctly without risking your real application data or configurations.
