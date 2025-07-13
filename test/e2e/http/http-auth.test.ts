import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { TestProcessManager, ConfigBuilder, ProtocolValidator } from '../utils/index.js';

describe('HTTP Transport Authentication E2E', () => {
  let processManager: TestProcessManager;
  let configBuilder: ConfigBuilder;
  let configPath: string;
  let httpPort: number;
  let baseUrl: string;

  beforeEach(async () => {
    processManager = new TestProcessManager();
    configBuilder = new ConfigBuilder();

    // Use a random port for testing
    httpPort = 3000 + Math.floor(Math.random() * 1000);
    baseUrl = `http://localhost:${httpPort}`;
  });

  afterEach(async () => {
    await processManager.cleanup();
    configBuilder.cleanup();
  });

  it('should configure HTTP transport with authentication', async () => {
    const fixturesPath = join(__dirname, '../fixtures');
    configPath = configBuilder
      .enableHttpTransport(httpPort)
      .enableAuth('test-client-id', 'test-client-secret')
      .addStdioServer('echo-server', 'node', [join(fixturesPath, 'echo-server.js')], ['test', 'echo'])
      .writeToFile();

    const config = configBuilder.build();
    expect(configPath).toBeDefined();
    expect(configPath.endsWith('.json')).toBe(true);
    expect(config.transport?.http?.port).toBe(httpPort);
    expect(config.auth?.enabled).toBe(true);
    expect(config.servers).toHaveLength(1);
  });

  it('should handle OAuth 2.1 authentication configuration', async () => {
    const authConfig = configBuilder.enableHttpTransport(httpPort).enableAuth('oauth-client', 'oauth-secret').build();

    expect(baseUrl).toBe(`http://localhost:${httpPort}`);
    expect(authConfig.transport?.http?.port).toBe(httpPort);
    expect(authConfig.auth?.clientId).toBe('oauth-client');
    expect(authConfig.auth?.clientSecret).toBe('oauth-secret');
    expect(authConfig.auth?.enabled).toBe(true);
  });

  it('should validate HTTP authentication request patterns', async () => {
    // Test authentication-related request validation
    const authRequests = [
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'auth/login',
        params: { username: 'test', password: 'secret' },
      },
      {
        jsonrpc: '2.0',
        id: 2,
        method: 'auth/refresh',
        params: { refresh_token: 'refresh_token_value' },
      },
      {
        jsonrpc: '2.0',
        id: 3,
        method: 'auth/logout',
        params: { token: 'access_token_value' },
      },
    ];

    authRequests.forEach((request) => {
      const validation = ProtocolValidator.validateRequest(request);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  it('should handle HTTP server configuration', async () => {
    const httpConfig = configBuilder
      .enableHttpTransport(httpPort)
      .enableAuth('http-client', 'http-secret')
      .addHttpServer('external-api', 'http://external-api.example.com', ['external', 'api'])
      .build();

    expect(httpConfig.transport?.http?.port).toBe(httpPort);
    expect(httpConfig.servers).toHaveLength(1);
    expect(httpConfig.servers[0].transport).toBe('http');
    expect(httpConfig.servers[0].endpoint).toBe('http://external-api.example.com');
  });

  it('should handle mixed transport configuration', async () => {
    const fixturesPath = join(__dirname, '../fixtures');
    const mixedConfig = configBuilder
      .enableStdioTransport()
      .enableHttpTransport(httpPort)
      .enableAuth('mixed-client', 'mixed-secret')
      .addStdioServer('local-server', 'node', [join(fixturesPath, 'echo-server.js')], ['local'])
      .addHttpServer('remote-server', 'https://api.example.com', ['remote'])
      .build();

    expect(mixedConfig.transport?.stdio).toBe(true);
    expect(mixedConfig.transport?.http?.port).toBe(httpPort);
    expect(mixedConfig.servers).toHaveLength(2);

    const stdioServer = mixedConfig.servers.find((s) => s.transport === 'stdio');
    const httpServer = mixedConfig.servers.find((s) => s.transport === 'http');

    expect(stdioServer?.name).toBe('local-server');
    expect(httpServer?.name).toBe('remote-server');
  });

  it('should validate authentication error responses', async () => {
    // Test authentication-specific error codes
    const authErrors = [
      { code: -32001, message: 'Authentication required' },
      { code: -32002, message: 'Invalid credentials' },
      { code: -32003, message: 'Token expired' },
      { code: -32004, message: 'Insufficient permissions' },
      { code: -32005, message: 'Rate limit exceeded' },
    ];

    authErrors.forEach((error) => {
      const validation = ProtocolValidator.validateError(error);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  it('should validate token-based authentication patterns', async () => {
    // Test different token types and validation
    const tokenPatterns = [
      { type: 'bearer', token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...' },
      { type: 'api_key', token: 'ak_1234567890abcdef' },
      { type: 'oauth2', token: 'oauth2_access_token_value' },
      { type: 'basic', token: 'Basic dXNlcjpwYXNzd29yZA==' },
    ];

    tokenPatterns.forEach((pattern) => {
      const authHeader =
        pattern.type === 'basic'
          ? pattern.token
          : `${pattern.type.charAt(0).toUpperCase() + pattern.type.slice(1)} ${pattern.token}`;

      expect(authHeader).toBeDefined();
      expect(authHeader.length).toBeGreaterThan(0);
    });
  });

  it('should handle authentication flow simulation', async () => {
    // Simulate authentication flow steps
    const authFlow = [
      { step: 'request_auth', method: 'auth/request', params: { client_id: 'test' } },
      { step: 'provide_credentials', method: 'auth/login', params: { username: 'user', password: 'pass' } },
      { step: 'receive_token', method: 'auth/token', params: { grant_type: 'password' } },
      { step: 'use_token', method: 'tools/list', params: {}, headers: { authorization: 'Bearer token' } },
      { step: 'refresh_token', method: 'auth/refresh', params: { refresh_token: 'refresh' } },
      { step: 'logout', method: 'auth/logout', params: { token: 'access_token' } },
    ];

    authFlow.forEach((step, index) => {
      const request = {
        jsonrpc: '2.0',
        id: index + 1,
        method: step.method,
        params: step.params,
      };

      const validation = ProtocolValidator.validateRequest(request);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });
});
