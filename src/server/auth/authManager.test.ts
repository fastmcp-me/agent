import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthManager } from './authManager.js';
import { SessionManager } from './sessionManager.js';
import { ServerConfigManager } from '../config/serverConfig.js';
import { AUTH_CONFIG } from '../../constants.js';

// Mock dependencies
vi.mock('./sessionManager.js');
vi.mock('../config/serverConfig.js');

describe('AuthManager', () => {
  let authManager: AuthManager;
  let mockSessionManager: any;
  let mockConfigManager: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock instances
    mockSessionManager = {
      getSession: vi.fn(),
      createSession: vi.fn(),
      createAuthCode: vi.fn(),
      getAuthCode: vi.fn(),
      deleteAuthCode: vi.fn(),
      deleteSession: vi.fn(),
      shutdown: vi.fn(),
    };

    mockConfigManager = {
      isAuthEnabled: vi.fn(),
      getOAuthCodeTtlMs: vi.fn(),
      getOAuthTokenTtlMs: vi.fn(),
      getSessionTtlMinutes: vi.fn(),
      getSessionStoragePath: vi.fn(),
    };

    // Mock static methods
    vi.mocked(SessionManager).mockImplementation(() => mockSessionManager);
    vi.mocked(ServerConfigManager.getInstance).mockReturnValue(mockConfigManager);

    authManager = new AuthManager();
  });

  afterEach(() => {
    authManager.shutdown();
  });

  describe('validateAccessToken', () => {
    it('should return null when auth is disabled', () => {
      mockConfigManager.isAuthEnabled.mockReturnValue(false);

      const result = authManager.validateAccessToken('any-token');

      expect(result).toBeNull();
    });

    it('should return null for empty token', () => {
      mockConfigManager.isAuthEnabled.mockReturnValue(true);

      const result = authManager.validateAccessToken('');

      expect(result).toBeNull();
    });

    it('should strip token prefix and validate session', () => {
      mockConfigManager.isAuthEnabled.mockReturnValue(true);
      const mockSession = { clientId: 'test', resource: '', expires: Date.now() + 60000, createdAt: Date.now() };
      mockSessionManager.getSession.mockReturnValue(mockSession);

      const token = AUTH_CONFIG.PREFIXES.ACCESS_TOKEN + '12345';
      const result = authManager.validateAccessToken(token);

      expect(mockSessionManager.getSession).toHaveBeenCalledWith('sess-12345');
      expect(result).toBe(mockSession);
    });

    it('should handle token without prefix', () => {
      mockConfigManager.isAuthEnabled.mockReturnValue(true);
      const mockSession = { clientId: 'test', resource: '', expires: Date.now() + 60000, createdAt: Date.now() };
      mockSessionManager.getSession.mockReturnValue(mockSession);

      const token = '12345';
      const result = authManager.validateAccessToken(token);

      expect(mockSessionManager.getSession).toHaveBeenCalledWith('sess-12345');
      expect(result).toBe(mockSession);
    });
  });

  describe('exchangeCodeForToken', () => {
    it('should exchange valid code for prefixed token', () => {
      const mockAuthCode = {
        clientId: 'client-123',
        redirectUri: 'http://localhost:3000/callback',
        resource: 'test-resource',
        expires: Date.now() + 60000,
        createdAt: Date.now(),
      };
      const mockTokenTtl = 3600000; // 1 hour

      mockSessionManager.getAuthCode.mockReturnValue(mockAuthCode);
      mockSessionManager.createSessionWithId = vi.fn();
      mockSessionManager.deleteAuthCode.mockReturnValue(true);
      mockConfigManager.getOAuthTokenTtlMs.mockReturnValue(mockTokenTtl);

      const code = 'code-12345';
      const clientId = 'client-123';
      const result = authManager.exchangeCodeForToken(code, clientId);

      expect(mockSessionManager.getAuthCode).toHaveBeenCalledWith(code);
      expect(mockSessionManager.deleteAuthCode).toHaveBeenCalledWith(code);
      expect(mockSessionManager.createSessionWithId).toHaveBeenCalled();
      expect(result).toMatch(/^tk-[a-f0-9-]+$/);
      expect(result).not.toContain('tk-sess-');
    });

    it('should return null for invalid auth code', () => {
      mockSessionManager.getAuthCode.mockReturnValue(null);

      const result = authManager.exchangeCodeForToken('invalid-code', 'client-123');

      expect(result).toBeNull();
      expect(mockSessionManager.deleteAuthCode).not.toHaveBeenCalled();
      expect(mockSessionManager.createSession).not.toHaveBeenCalled();
    });

    it('should return null for client ID mismatch', () => {
      const mockAuthCode = {
        clientId: 'client-123',
        redirectUri: 'http://localhost:3000/callback',
        resource: 'test-resource',
        expires: Date.now() + 60000,
        createdAt: Date.now(),
      };

      mockSessionManager.getAuthCode.mockReturnValue(mockAuthCode);

      const result = authManager.exchangeCodeForToken('code-12345', 'different-client');

      expect(result).toBeNull();
      expect(mockSessionManager.deleteAuthCode).not.toHaveBeenCalled();
      expect(mockSessionManager.createSession).not.toHaveBeenCalled();
    });

    it('should never generate an access token with the prefix "tk-sess-"', () => {
      const mockAuthCode = {
        clientId: 'client-123',
        redirectUri: 'http://localhost:3000/callback',
        resource: 'test-resource',
        expires: Date.now() + 60000,
        createdAt: Date.now(),
      };
      const mockTokenTtl = 3600000; // 1 hour
      mockSessionManager.getAuthCode.mockReturnValue(mockAuthCode);
      mockSessionManager.createSessionWithId = vi.fn();
      mockSessionManager.deleteAuthCode.mockReturnValue(true);
      mockConfigManager.getOAuthTokenTtlMs.mockReturnValue(mockTokenTtl);

      const code = 'code-12345';
      const clientId = 'client-123';
      // Generate multiple tokens to check for any prefix stacking
      for (let i = 0; i < 10; i++) {
        const result = authManager.exchangeCodeForToken(code, clientId);
        expect(result).not.toContain('tk-sess-');
        expect(result).toMatch(/^tk-[a-f0-9-]+$/);
      }
    });
  });

  describe('createAuthCode', () => {
    it('should create auth code with prefix', () => {
      const mockCode = 'code-12345';
      const mockTtl = 60000; // 1 minute

      mockSessionManager.createAuthCode.mockReturnValue(mockCode);
      mockConfigManager.getOAuthCodeTtlMs.mockReturnValue(mockTtl);

      const clientId = 'client-123';
      const redirectUri = 'http://localhost:3000/callback';
      const resource = 'test-resource';

      const result = authManager.createAuthCode(clientId, redirectUri, resource);

      expect(mockSessionManager.createAuthCode).toHaveBeenCalledWith(clientId, redirectUri, resource, mockTtl);
      expect(result).toBe(mockCode);
    });
  });
});
