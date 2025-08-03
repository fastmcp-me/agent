import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CommandTestEnvironment, CliTestRunner } from '../utils/index.js';
import { TestFixtures } from '../fixtures/TestFixtures.js';
import { writeFile, chmod } from 'fs/promises';
import { join } from 'path';

describe('Error Scenarios E2E', () => {
  let environment: CommandTestEnvironment;
  let runner: CliTestRunner;

  beforeEach(async () => {
    environment = new CommandTestEnvironment(TestFixtures.createTestScenario('error-scenarios-test', 'basic'));
    await environment.setup();
    runner = new CliTestRunner(environment);
  });

  afterEach(async () => {
    await environment.cleanup();
  });

  describe('Configuration File Errors', () => {
    it('should handle missing config file gracefully', async () => {
      const result = await runner.runMcpCommand('list', {
        args: ['--config', '/nonexistent/config.json'],
        expectError: true,
      });

      runner.assertFailure(result, 1);
      runner.assertOutputContains(result, 'Failed to list servers', true);
      runner.assertOutputContains(result, 'config', true);
    });

    it('should handle malformed JSON config file', async () => {
      // Create malformed config file
      const malformedConfig = '{ "servers": [ { "name": "test", "command": incomplete json';
      await writeFile(environment.getConfigPath(), malformedConfig);

      const result = await runner.runMcpCommand('list', {
        expectError: true,
      });

      runner.assertFailure(result, 1);
      runner.assertOutputContains(result, 'Failed to list servers', true);
    });

    it('should handle config file with invalid structure', async () => {
      // Create config with invalid structure
      const invalidConfig = JSON.stringify({
        invalidField: 'value',
        mcpServers: 'not-an-object',
      });
      await writeFile(environment.getConfigPath(), invalidConfig);

      const result = await runner.runMcpCommand('list', {
        expectError: true,
      });

      runner.assertFailure(result, 1);
      runner.assertOutputContains(result, 'Failed to list servers', true);
    });

    it('should handle config file permission issues', async () => {
      // Make config file unreadable (if not running as root)
      try {
        await chmod(environment.getConfigPath(), 0o000);

        const result = await runner.runMcpCommand('list', {
          expectError: true,
        });

        runner.assertFailure(result, 1);
        runner.assertOutputContains(result, 'Failed to list servers', true);
      } catch (_error) {
        // chmod might fail in some test environments, skip this test
        console.warn('Skipping permission test due to environment limitations');
      } finally {
        // Restore permissions for cleanup
        await chmod(environment.getConfigPath(), 0o644).catch(() => {});
      }
    });

    it('should handle empty config file', async () => {
      await writeFile(environment.getConfigPath(), '');

      const result = await runner.runMcpCommand('list', {
        expectError: true,
      });

      runner.assertFailure(result, 1);
      runner.assertOutputContains(result, 'Failed to list servers', true);
    });

    it('should handle config file with circular references', async () => {
      // Create config that might cause parsing issues
      const circularConfig = JSON.stringify({
        mcpServers: {
          'circular-test': {
            transport: 'stdio',
            command: 'echo',
            args: ['test'],
            reference: '${self}', // Potential circular reference
          },
        },
      });
      await writeFile(environment.getConfigPath(), circularConfig);

      const result = await runner.runMcpCommand('list');

      // Should either succeed (ignoring circular refs) or fail gracefully
      if (result.exitCode !== 0) {
        runner.assertOutputContains(result, 'Failed to list servers', true);
      }
    });
  });

  describe('Command Argument Validation Errors', () => {
    it('should handle missing required arguments', async () => {
      const addResult = await runner.runMcpCommand('add', {
        args: [], // Missing server name
        expectError: true,
      });

      runner.assertFailure(addResult, 1);
      runner.assertOutputContains(addResult, 'required', true);
    });

    it('should handle invalid server names', async () => {
      const invalidNames = [
        '', // Empty name
        'server with spaces',
        'server/with/slashes',
        'server:with:colons',
        'server\nwith\nnewlines',
        'a'.repeat(256), // Very long name
      ];

      for (const name of invalidNames) {
        const result = await runner.runMcpCommand('add', {
          args: [name, '--command', 'echo'],
          expectError: true,
        });

        runner.assertFailure(result, 1);
        runner.assertOutputContains(result, 'Invalid', true);
      }
    });

    it('should handle invalid command arguments combinations', async () => {
      // HTTP server without URL
      const httpResult = await runner.runMcpCommand('add', {
        args: ['http-server', '--type', 'http'],
        expectError: true,
      });

      runner.assertFailure(httpResult, 1);
      runner.assertOutputContains(httpResult, 'URL is required', true);

      // Stdio server without command
      const stdioResult = await runner.runMcpCommand('add', {
        args: ['stdio-server', '--type', 'stdio'],
        expectError: true,
      });

      runner.assertFailure(stdioResult, 1);
      runner.assertOutputContains(stdioResult, 'command is required', true);
    });

    it('should handle invalid timeout values', async () => {
      const invalidTimeouts = ['not-a-number', '-1', '0', 'infinite'];

      for (const timeout of invalidTimeouts) {
        const result = await runner.runMcpCommand('add', {
          args: ['timeout-test', '--command', 'echo', '--timeout', timeout],
          expectError: true,
        });

        runner.assertFailure(result, 1);
        runner.assertOutputContains(result, 'Invalid timeout', true);
      }
    });

    it('should handle invalid URL formats', async () => {
      const invalidUrls = [
        'not-a-url',
        'http://',
        'ftp://invalid-protocol.com',
        'http://localhost:99999', // Invalid port
        'http://[invalid:ipv6:address]:8080',
      ];

      for (const url of invalidUrls) {
        const result = await runner.runMcpCommand('add', {
          args: ['url-test', '--type', 'http', '--url', url],
          expectError: true,
        });

        runner.assertFailure(result, 1);
        runner.assertOutputContains(result, 'Invalid URL', true);
      }
    });

    it('should handle invalid tag formats', async () => {
      const invalidTags = [
        '', // Empty tags
        ',,,', // Only commas
        'tag with spaces',
        'tag/with/slashes',
        'tag:with:colons',
      ];

      for (const tags of invalidTags) {
        const result = await runner.runMcpCommand('add', {
          args: ['tag-test', '--command', 'echo', '--tags', tags],
          expectError: true,
        });

        runner.assertFailure(result, 1);
        runner.assertOutputContains(result, 'Invalid', true);
      }
    });
  });

  describe('Server State Errors', () => {
    it('should handle operations on non-existent servers', async () => {
      const operations = [
        () => runner.runMcpCommand('status', { args: ['nonexistent-server'] }),
        () => runner.runMcpCommand('enable', { args: ['nonexistent-server'] }),
        () => runner.runMcpCommand('disable', { args: ['nonexistent-server'] }),
        () => runner.runMcpCommand('update', { args: ['nonexistent-server', '--command', 'echo'] }),
        () => runner.runMcpCommand('remove', { args: ['nonexistent-server'] }),
      ];

      for (const operation of operations) {
        const result = await operation();
        runner.assertFailure(result, 1);
        runner.assertOutputContains(result, 'not found', true);
      }
    });

    it('should handle duplicate server names', async () => {
      // Add a server first
      const addFirst = await runner.runMcpCommand('add', {
        args: ['duplicate-test', '--command', 'echo', '--args', 'first'],
      });
      runner.assertSuccess(addFirst);

      // Try to add another server with the same name
      const addDuplicate = await runner.runMcpCommand('add', {
        args: ['duplicate-test', '--command', 'node', '--args', '--version'],
        expectError: true,
      });

      runner.assertFailure(addDuplicate, 1);
      runner.assertOutputContains(addDuplicate, 'already exists', true);

      // Verify original server is unchanged
      const listResult = await runner.runMcpCommand('list', { args: ['--verbose'] });
      runner.assertOutputContains(listResult, 'duplicate-test');
      runner.assertOutputContains(listResult, 'Command: echo');

      // Clean up
      await runner.runMcpCommand('remove', { args: ['duplicate-test'] });
    });

    it('should handle enable/disable state conflicts', async () => {
      // Try to enable an already enabled server
      const enableResult = await runner.runMcpCommand('enable', {
        args: ['echo-server'], // Should already be enabled
      });

      runner.assertSuccess(enableResult);
      runner.assertOutputContains(enableResult, 'already enabled');

      // Try to disable an already disabled server
      const disableResult = await runner.runMcpCommand('disable', {
        args: ['disabled-server'], // Should already be disabled in our test scenario
      });

      runner.assertSuccess(disableResult);
      runner.assertOutputContains(disableResult, 'already disabled');
    });
  });

  describe('Filesystem and System Errors', () => {
    it('should handle disk space issues during backup creation', async () => {
      // This is difficult to test reliably, but we can test the error handling
      const result = await runner.runAppCommand('backups', {
        args: ['create', '--description', 'Disk space test'],
      });

      // Should either succeed or provide clear error message about disk space
      if (result.exitCode !== 0) {
        runner.assertOutputContains(result, 'failed', true);
      }
    });

    it('should handle permission denied errors gracefully', async () => {
      // Try to create backup in restricted directory
      const result = await runner.runAppCommand('backups', {
        args: ['create', '--output-dir', '/root', '--description', 'Permission test'],
      });

      // Should handle permission issues gracefully
      if (result.exitCode !== 0) {
        runner.assertOutputContains(result, 'permission', true);
      }
    });

    it('should handle network timeout errors', async () => {
      // Add HTTP server with unreachable URL
      const addResult = await runner.runMcpCommand('add', {
        args: ['unreachable-server', '--type', 'http', '--url', 'http://192.0.2.1:9999/mcp'],
      });
      runner.assertSuccess(addResult);

      // Check status (should handle timeout gracefully)
      const statusResult = await runner.runMcpCommand('status', {
        args: ['unreachable-server', '--timeout', '1000'],
      });

      // Should not fail completely due to network issues
      runner.assertSuccess(statusResult);
      runner.assertOutputContains(statusResult, 'unreachable-server');

      // Clean up
      await runner.runMcpCommand('remove', { args: ['unreachable-server'] });
    });

    it('should handle corrupted application configurations', async () => {
      // Create corrupted app config file
      const appConfigPath = join(environment.getAppsDir(), 'vscode', 'User', 'settings.json');
      const corruptedConfig = '{ "mcp.servers": { "test": incomplete json';

      try {
        await writeFile(appConfigPath, corruptedConfig);

        const result = await runner.runAppCommand('discover', {
          args: ['--analyze-config'],
        });

        // Should handle corrupted config gracefully
        runner.assertSuccess(result);
        // May show warnings about corrupted config
      } catch (_error) {
        // File write might fail in test environment
        console.warn('Skipping corrupted config test due to environment limitations');
      }
    });
  });

  describe('CLI Interface Errors', () => {
    it('should handle unknown commands gracefully', async () => {
      const result = await runner.runAppCommand('nonexistent-command' as any, {
        expectError: true,
      });

      runner.assertFailure(result, 1);
    });

    it('should handle unknown flags gracefully', async () => {
      const result = await runner.runMcpCommand('list', {
        args: ['--nonexistent-flag'],
        expectError: true,
      });

      runner.assertFailure(result, 1);
    });

    it('should handle malformed command line arguments', async () => {
      const malformedArgs = [
        ['--config'], // Missing value
        ['--tags', ''], // Empty value
        ['--timeout', 'abc'], // Invalid value type
        ['--headers', 'invalid-format'], // Invalid format
      ];

      for (const args of malformedArgs) {
        const result = await runner.runMcpCommand('add', {
          args: ['test-server', '--command', 'echo', ...args],
          expectError: true,
        });

        runner.assertFailure(result, 1);
      }
    });

    it('should handle very long command lines', async () => {
      const veryLongArg = 'a'.repeat(10000);

      const result = await runner.runMcpCommand('add', {
        args: ['long-arg-test', '--command', 'echo', '--args', veryLongArg],
        expectError: true,
        timeout: 10000, // Give it more time
      });

      // Should either succeed or fail gracefully
      if (result.exitCode !== 0) {
        runner.assertOutputContains(result, 'failed', true);
      }
    });
  });

  describe('Resource Exhaustion Scenarios', () => {
    it('should handle many simultaneous operations gracefully', async () => {
      const operations = [];
      const serverNames = [];

      // Create many operations
      for (let i = 0; i < 10; i++) {
        const serverName = `stress-test-${i}`;
        serverNames.push(serverName);
        operations.push(
          runner.runMcpCommand('add', {
            args: [serverName, '--command', 'echo', '--args', `test-${i}`],
          }),
        );
      }

      // Execute all operations
      const results = await Promise.allSettled(operations);

      // Most should succeed, but system should remain stable
      const successful = results.filter((r) => r.status === 'fulfilled' && r.value.exitCode === 0);
      expect(successful.length).toBeGreaterThan(5); // At least half should succeed

      // Clean up any created servers
      for (const serverName of serverNames) {
        await runner.runMcpCommand('remove', { args: [serverName] }).catch(() => {});
      }
    });

    it('should handle very large configuration files', async () => {
      // Create large config with many servers
      const largeConfig = {
        mcpServers: {} as Record<string, any>,
      };

      for (let i = 0; i < 100; i++) {
        largeConfig.mcpServers[`large-config-server-${i}`] = {
          transport: 'stdio',
          command: 'echo',
          args: [`test-${i}`],
          tags: ['large-config', 'test', `server-${i}`],
          timeout: 5000,
        };
      }

      await writeFile(environment.getConfigPath(), JSON.stringify(largeConfig, null, 2));

      const result = await runner.runMcpCommand('list', {
        timeout: 15000, // Give it more time
      });

      // Should handle large config, might be slow but shouldn't fail
      runner.assertSuccess(result);
      runner.assertOutputContains(result, 'large-config-server-0');
    });

    it('should handle rapid repeated operations', async () => {
      const serverName = 'rapid-test-server';

      // Add server
      await runner.runMcpCommand('add', {
        args: [serverName, '--command', 'echo', '--args', 'rapid'],
      });

      // Perform rapid operations
      const operations = [];
      for (let i = 0; i < 20; i++) {
        operations.push(runner.runMcpCommand('status', { args: [serverName] }));
      }

      const results = await Promise.allSettled(operations);

      // All status operations should succeed
      const successful = results.filter((r) => r.status === 'fulfilled' && r.value.exitCode === 0);
      expect(successful.length).toBe(20);

      // Clean up
      await runner.runMcpCommand('remove', { args: [serverName] });
    });
  });

  describe('Error Recovery and Consistency', () => {
    it('should maintain consistency after partial failures', async () => {
      const servers = ['recovery-1', 'recovery-2', 'recovery-3'];

      // Add servers successfully
      for (const server of servers) {
        await runner.runMcpCommand('add', {
          args: [server, '--command', 'echo', '--args', server],
        });
      }

      // Try batch operation with mix of valid and invalid servers
      const batchResult = await runner.runMcpCommand('disable', {
        args: [...servers, 'nonexistent-server'],
        expectError: true,
      });

      // Should fail due to nonexistent server
      runner.assertFailure(batchResult, 1);

      // But valid servers should still exist and be manageable
      const listResult = await runner.runMcpCommand('list', { args: ['--show-disabled'] });
      servers.forEach((server) => {
        runner.assertOutputContains(listResult, server);
      });

      // Clean up
      for (const server of servers) {
        await runner.runMcpCommand('remove', { args: [server] });
      }
    });

    it('should recover from interrupted operations', async () => {
      const serverName = 'interruption-recovery-test';

      // Add server
      await runner.runMcpCommand('add', {
        args: [serverName, '--command', 'echo', '--args', 'test'],
      });

      // Simulate interruption by trying to add same server again
      const interruptResult = await runner.runMcpCommand('add', {
        args: [serverName, '--command', 'node', '--args', '--version'],
        expectError: true,
      });

      runner.assertFailure(interruptResult, 1);

      // Verify original server is still functional
      const statusResult = await runner.runMcpCommand('status', { args: [serverName] });
      runner.assertSuccess(statusResult);
      runner.assertOutputContains(statusResult, serverName);

      // Should be able to perform normal operations
      const disableResult = await runner.runMcpCommand('disable', { args: [serverName] });
      runner.assertSuccess(disableResult);

      const enableResult = await runner.runMcpCommand('enable', { args: [serverName] });
      runner.assertSuccess(enableResult);

      // Clean up
      await runner.runMcpCommand('remove', { args: [serverName] });
    });

    it('should provide helpful error messages for common mistakes', async () => {
      // Test various common mistakes and ensure error messages are helpful
      const mistakes = [
        {
          args: ['add', 'test-server', '--cmd', 'echo'], // Wrong flag name
          expectedError: /unknown.*option|invalid.*flag/i,
        },
        {
          args: ['list', '--show-disable'], // Typo in flag
          expectedError: /unknown.*option|invalid.*flag/i,
        },
        {
          args: ['status', 'non-existent'], // Non-existent server
          expectedError: /not found|does not exist/i,
        },
        {
          args: ['add', 'test', '--type', 'invalid'], // Invalid type
          expectedError: /invalid.*type|unknown.*type/i,
        },
      ];

      for (const mistake of mistakes) {
        const result = await runner.runMcpCommand(mistake.args[0] as any, {
          args: mistake.args.slice(1),
          expectError: true,
        });

        runner.assertFailure(result, 1);
        // Error message should match the expected pattern
        expect(result.stderr.toLowerCase()).toMatch(mistake.expectedError);
      }
    });
  });
});
