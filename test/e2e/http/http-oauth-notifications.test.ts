import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestProcessManager, ConfigBuilder } from '../utils/index.js';
import type { NextFunction } from 'express';

// Mock the dependencies we need to test the OAuth callback logic
const mockUpdateServerState = vi.fn();
const mockLoadingManager = {
  getStateTracker: vi.fn(() => ({
    updateServerState: mockUpdateServerState,
  })),
};

// Mock ServerManager before any imports
vi.mock('../../../src/core/server/serverManager.js', () => ({
  ServerManager: {
    current: {
      getClient: vi.fn(),
    },
  },
}));

describe('HTTP OAuth Notifications E2E', () => {
  let processManager: TestProcessManager;
  let configBuilder: ConfigBuilder;

  // Test utilities
  const createMockTransport = () => ({
    start: vi.fn().mockResolvedValue(undefined),
    send: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    finishAuth: vi.fn().mockResolvedValue(undefined),
  });

  const createMockRequest = (serverName: string, queryParams: Record<string, string>) => ({
    params: { serverName },
    query: queryParams,
  });

  const createMockResponse = () => ({
    redirect: vi.fn(),
  });

  const findOAuthCallbackRoute = (router: any) => {
    const callbackRoute = router.stack.find(
      (layer: any) => layer.route?.path === '/callback/:serverName' && layer.route?.methods?.get,
    );

    if (!callbackRoute?.route) {
      throw new Error('OAuth callback route not found');
    }

    return callbackRoute;
  };

  beforeEach(() => {
    // Arrange - Reset all test state
    processManager = new TestProcessManager();
    configBuilder = new ConfigBuilder();
    vi.resetAllMocks();

    // Reset the loading manager mock
    mockUpdateServerState.mockClear();
    mockLoadingManager.getStateTracker.mockReturnValue({
      updateServerState: mockUpdateServerState,
    });
  });

  afterEach(async () => {
    await processManager.cleanup();
    configBuilder.cleanup();
  });

  it('should trigger LoadingStateTracker update when OAuth callback succeeds', async () => {
    // Arrange
    const { createOAuthRoutes } = await import('../../../src/transport/http/routes/oauthRoutes.js');
    const { LoadingState } = await import('../../../src/core/loading/loadingStateTracker.js');
    const { ClientStatus } = await import('../../../src/core/types/index.js');
    const { ServerManager } = await import('../../../src/core/server/serverManager.js');

    const mockGetClient = vi.mocked(ServerManager.current.getClient);
    const mockOAuthProvider = {} as any;
    const router = createOAuthRoutes(mockOAuthProvider, mockLoadingManager as any);
    const callbackRoute = findOAuthCallbackRoute(router);

    const mockRequest = createMockRequest('test-oauth-server', { code: 'auth-code-123' });
    const mockResponse = createMockResponse();
    const mockTransport = createMockTransport();
    const mockClientInfo = {
      name: 'test-oauth-server',
      transport: mockTransport,
      client: {} as any,
      status: ClientStatus.AwaitingOAuth,
    };

    mockGetClient.mockReturnValue(mockClientInfo);

    // Act
    const mockNext = vi.fn() as unknown as NextFunction;
    await callbackRoute.route.stack[0].handle(mockRequest, mockResponse, mockNext);

    // Assert
    expect(mockTransport.finishAuth).toHaveBeenCalledWith('auth-code-123');
    expect(mockResponse.redirect).toHaveBeenCalledWith('/oauth?success=1');
    expect(mockLoadingManager.getStateTracker).toHaveBeenCalled();
    expect(mockUpdateServerState).toHaveBeenCalledWith('test-oauth-server', LoadingState.Ready);
  });

  it('should not update LoadingStateTracker when OAuth callback fails', async () => {
    // Arrange
    const { createOAuthRoutes } = await import('../../../src/transport/http/routes/oauthRoutes.js');
    const mockOAuthProvider = {} as any;
    const router = createOAuthRoutes(mockOAuthProvider, mockLoadingManager as any);
    const callbackRoute = findOAuthCallbackRoute(router);

    const mockRequest = createMockRequest('test-oauth-server', { error: 'access_denied' });
    const mockResponse = createMockResponse();

    // Act
    const mockNext = vi.fn() as unknown as NextFunction;
    await callbackRoute.route.stack[0].handle(mockRequest, mockResponse, mockNext);

    // Assert
    expect(mockResponse.redirect).toHaveBeenCalledWith('/oauth?error=access_denied');
    expect(mockUpdateServerState).not.toHaveBeenCalled();
  });

  it('should complete OAuth flow successfully without loading manager', async () => {
    // Arrange
    const { createOAuthRoutes } = await import('../../../src/transport/http/routes/oauthRoutes.js');
    const { ClientStatus } = await import('../../../src/core/types/index.js');
    const { ServerManager } = await import('../../../src/core/server/serverManager.js');

    const mockGetClient = vi.mocked(ServerManager.current.getClient);
    const mockOAuthProvider = {} as any;
    const router = createOAuthRoutes(mockOAuthProvider, undefined);
    const callbackRoute = findOAuthCallbackRoute(router);

    const mockRequest = createMockRequest('test-oauth-server', { code: 'auth-code-123' });
    const mockResponse = createMockResponse();
    const mockTransport = createMockTransport();
    const mockClientInfo = {
      name: 'test-oauth-server',
      transport: mockTransport,
      client: {} as any,
      status: ClientStatus.AwaitingOAuth,
    };

    mockGetClient.mockReturnValue(mockClientInfo);

    // Act
    const mockNext = vi.fn() as unknown as NextFunction;
    await callbackRoute.route.stack[0].handle(mockRequest, mockResponse, mockNext);

    // Assert
    expect(mockTransport.finishAuth).toHaveBeenCalledWith('auth-code-123');
    expect(mockResponse.redirect).toHaveBeenCalledWith('/oauth?success=1');
    expect(mockLoadingManager.getStateTracker).not.toHaveBeenCalled();
  });
});
