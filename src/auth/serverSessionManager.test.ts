import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { ServerSessionManager } from './serverSessionManager.js';

// Mock fs module
vi.mock('fs');
vi.mock('path');

describe('ServerSessionManager', () => {
  let sessionManager: ServerSessionManager;
  const mockStoragePath = '/tmp/test-sessions';

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock fs.existsSync to return false initially
    vi.mocked(fs.existsSync).mockReturnValue(false);

    // Mock fs.mkdirSync
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);

    // Mock fs.writeFileSync
    vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);

    // Mock fs.readFileSync with future expiration time
    const futureTime = Date.now() + 60000; // 1 minute in the future
    vi.mocked(fs.readFileSync).mockImplementation(() =>
      JSON.stringify({
        clientId: 'test',
        resource: '',
        expires: futureTime,
        createdAt: Date.now(),
      }),
    );

    // Mock fs.unlinkSync
    vi.mocked(fs.unlinkSync).mockImplementation(() => undefined);

    // Mock fs.readdirSync
    vi.mocked(fs.readdirSync).mockReturnValue([]);

    // Mock path.join
    vi.mocked(path.join).mockImplementation((...args) => args.join('/'));

    // Mock path.resolve
    vi.mocked(path.resolve).mockImplementation((...args) => args.join('/'));

    sessionManager = new ServerSessionManager(mockStoragePath);
  });

  afterEach(() => {
    sessionManager.shutdown();
  });

  it('should create session directory if it does not exist', () => {
    expect(fs.mkdirSync).toHaveBeenCalledWith(mockStoragePath, { recursive: true });
  });

  it('should create a session successfully', () => {
    const clientId = 'test-client';
    const resource = 'test-resource';
    const ttlMs = 60000; // 1 minute

    const sessionId = sessionManager.createSession(clientId, resource, [], ttlMs);

    expect(sessionId).toBeDefined();
    expect(typeof sessionId).toBe('string');
    expect(sessionId).toMatch(/^sess-/);
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('should get a valid session', () => {
    // Mock fs.existsSync to return true for existing session
    vi.mocked(fs.existsSync).mockReturnValue(true);

    const sessionId = 'sess-12345678-1234-4567-8901-123456789012';
    const session = sessionManager.getSession(sessionId);

    expect(session).toBeDefined();
    expect(session?.clientId).toBe('test');
    expect(fs.readFileSync).toHaveBeenCalled();
  });

  it('should return null for non-existent session', () => {
    // Mock fs.existsSync to return false for non-existent session
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const sessionId = 'non-existent-session';
    const session = sessionManager.getSession(sessionId);

    expect(session).toBeNull();
  });

  it('should delete a session successfully', () => {
    // Mock fs.existsSync to return true for existing session
    vi.mocked(fs.existsSync).mockReturnValue(true);

    const sessionId = 'sess-12345678-1234-4567-8901-123456789012';
    const result = sessionManager.deleteSession(sessionId);

    expect(result).toBe(true);
    expect(fs.unlinkSync).toHaveBeenCalled();
  });

  it('should create auth code successfully', () => {
    const clientId = 'test-client';
    const redirectUri = 'http://localhost:3000/callback';
    const resource = 'test-resource';
    const ttlMs = 60000; // 1 minute

    const code = sessionManager.createAuthCode(clientId, redirectUri, resource, [], ttlMs);

    expect(code).toBeDefined();
    expect(typeof code).toBe('string');
    expect(code).toMatch(/^code-/);
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('should get a valid auth code', () => {
    // Mock fs.existsSync to return true for existing auth code
    vi.mocked(fs.existsSync).mockReturnValue(true);

    const code = 'code-12345678-1234-4567-8901-123456789012';
    const authCode = sessionManager.getAuthCode(code);

    expect(authCode).toBeDefined();
    expect(authCode?.clientId).toBe('test');
    expect(fs.readFileSync).toHaveBeenCalled();
  });

  it('should delete auth code successfully', () => {
    // Mock fs.existsSync to return true for existing auth code
    vi.mocked(fs.existsSync).mockReturnValue(true);

    const code = 'code-12345678-1234-4567-8901-123456789012';
    const result = sessionManager.deleteAuthCode(code);

    expect(result).toBe(true);
    expect(fs.unlinkSync).toHaveBeenCalled();
  });

  it('should reject session IDs with path traversal attempts', () => {
    const invalidIds = [
      '../evil',
      'sess-../../etc/passwd',
      'sess-..\\windows',
      'sess-..//etc/shadow',
      'sess-..%2Fetc%2Fpasswd',
    ];
    for (const id of invalidIds) {
      expect(sessionManager.getSession(id)).toBeNull();
      expect(sessionManager.deleteSession(id)).toBe(false);
    }
  });

  it('should reject auth codes with path traversal attempts', () => {
    const invalidCodes = [
      '../evil',
      'code-../../etc/passwd',
      'code-..\\windows',
      'code-..//etc/shadow',
      'code-..%2Fetc%2Fpasswd',
    ];
    for (const code of invalidCodes) {
      expect(sessionManager.getAuthCode(code)).toBeNull();
      expect(sessionManager.deleteAuthCode(code)).toBe(false);
    }
  });

  describe('Invalid ID validation', () => {
    it('should reject empty session IDs', () => {
      expect(sessionManager.getSession('')).toBeNull();
      expect(sessionManager.deleteSession('')).toBe(false);
    });

    it('should reject null session IDs', () => {
      expect(sessionManager.getSession(null as any)).toBeNull();
      expect(sessionManager.deleteSession(null as any)).toBe(false);
    });

    it('should reject session IDs without proper prefix', () => {
      const invalidIds = [
        '12345678-1234-4567-8901-123456789012',
        'invalid-12345678-1234-4567-8901-123456789012',
        'code-12345678-1234-4567-8901-123456789012', // wrong prefix
      ];
      for (const id of invalidIds) {
        expect(sessionManager.getSession(id)).toBeNull();
        expect(sessionManager.deleteSession(id)).toBe(false);
      }
    });

    it('should reject session IDs with invalid UUID format', () => {
      const invalidIds = [
        'sess-not-a-uuid',
        'sess-12345678-1234-1234-8901-123456789012', // invalid version (should be 4)
        'sess-12345678-1234-4567-1901-123456789012', // invalid variant
        'sess-12345678-1234-4567-8901-12345678901', // wrong length
        'sess-xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx', // invalid characters
      ];
      for (const id of invalidIds) {
        expect(sessionManager.getSession(id)).toBeNull();
        expect(sessionManager.deleteSession(id)).toBe(false);
      }
    });

    it('should reject auth codes with invalid UUID format', () => {
      const invalidCodes = [
        'code-not-a-uuid',
        'code-12345678-1234-1234-8901-123456789012', // invalid version
        'code-12345678-1234-4567-1901-123456789012', // invalid variant
        'code-12345678-1234-4567-8901-12345678901', // wrong length
      ];
      for (const code of invalidCodes) {
        expect(sessionManager.getAuthCode(code)).toBeNull();
        expect(sessionManager.deleteAuthCode(code)).toBe(false);
      }
    });
  });

  describe('File system error handling', () => {
    it('should handle file read errors gracefully for sessions', () => {
      const sessionId = 'sess-12345678-1234-4567-8901-123456789012';

      // Mock fs.existsSync to return true but fs.readFileSync to throw
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('File read error');
      });

      const session = sessionManager.getSession(sessionId);
      expect(session).toBeNull();
    });

    it('should handle file read errors gracefully for auth codes', () => {
      const code = 'code-12345678-1234-4567-8901-123456789012';

      // Mock fs.existsSync to return true but fs.readFileSync to throw
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('File read error');
      });

      const authCode = sessionManager.getAuthCode(code);
      expect(authCode).toBeNull();
    });

    it('should handle malformed JSON in session files', () => {
      const sessionId = 'sess-12345678-1234-4567-8901-123456789012';

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json content');

      const session = sessionManager.getSession(sessionId);
      expect(session).toBeNull();
    });

    it('should handle malformed JSON in auth code files', () => {
      const code = 'code-12345678-1234-4567-8901-123456789012';

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json content');

      const authCode = sessionManager.getAuthCode(code);
      expect(authCode).toBeNull();
    });

    it('should handle file deletion errors gracefully', () => {
      const sessionId = 'sess-12345678-1234-4567-8901-123456789012';

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.unlinkSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = sessionManager.deleteSession(sessionId);
      expect(result).toBe(false);
    });

    it('should handle auth code file deletion errors gracefully', () => {
      const code = 'code-12345678-1234-4567-8901-123456789012';

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.unlinkSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = sessionManager.deleteAuthCode(code);
      expect(result).toBe(false);
    });

    it('should handle session creation file write errors', () => {
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        throw new Error('Disk full');
      });

      expect(() => {
        sessionManager.createSession('test-client', 'test-resource', [], 60000);
      }).toThrow('Disk full');
    });

    it('should handle auth code creation file write errors', () => {
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        throw new Error('Disk full');
      });

      expect(() => {
        sessionManager.createAuthCode('test-client', 'http://localhost', 'test-resource', [], 60000);
      }).toThrow('Disk full');
    });
  });

  describe('Session expiration handling', () => {
    it('should return null for expired sessions', () => {
      const sessionId = 'sess-12345678-1234-4567-8901-123456789012';
      const expiredSessionData = {
        clientId: 'test-client',
        resource: 'test-resource',
        expires: Date.now() - 1000, // expired 1 second ago
        createdAt: Date.now() - 60000,
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(expiredSessionData));

      const session = sessionManager.getSession(sessionId);
      expect(session).toBeNull();
    });

    it('should return null for expired auth codes', () => {
      const code = 'code-12345678-1234-4567-8901-123456789012';
      const expiredAuthData = {
        clientId: 'test-client',
        redirectUri: 'http://localhost',
        resource: 'test-resource',
        expires: Date.now() - 1000, // expired 1 second ago
        createdAt: Date.now() - 60000,
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(expiredAuthData));

      const authCode = sessionManager.getAuthCode(code);
      expect(authCode).toBeNull();
    });

    it('should return valid session for non-expired sessions', () => {
      const sessionId = 'sess-12345678-1234-4567-8901-123456789012';
      const validSessionData = {
        clientId: 'test-client',
        resource: 'test-resource',
        expires: Date.now() + 60000, // expires in 1 minute
        createdAt: Date.now(),
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(validSessionData));

      const session = sessionManager.getSession(sessionId);
      expect(session).toEqual(validSessionData);
    });

    it('should return valid auth code for non-expired codes', () => {
      const code = 'code-12345678-1234-4567-8901-123456789012';
      const validAuthData = {
        clientId: 'test-client',
        redirectUri: 'http://localhost',
        resource: 'test-resource',
        expires: Date.now() + 60000, // expires in 1 minute
        createdAt: Date.now(),
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(validAuthData));

      const authCode = sessionManager.getAuthCode(code);
      expect(authCode).toEqual(validAuthData);
    });
  });

  describe('Cleanup functionality', () => {
    it('should properly shutdown and clear cleanup interval', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      sessionManager.shutdown();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should handle shutdown when no cleanup interval exists', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      // Call shutdown twice to test when cleanupInterval is null
      sessionManager.shutdown();
      sessionManager.shutdown();

      expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle cleanup errors gracefully', () => {
      // Mock fs.readdirSync to throw an error
      vi.mocked(fs.readdirSync).mockImplementation(() => {
        throw new Error('Permission denied to read directory');
      });

      // Access the private cleanupExpiredSessions method for testing
      const cleanupMethod = (sessionManager as any).cleanupExpiredSessions;

      // Should not throw, just log error
      expect(() => cleanupMethod.call(sessionManager)).not.toThrow();
    });

    it('should cleanup expired session files', () => {
      const expiredFile = 'session_sess-12345678-1234-4567-8901-123456789012.json';
      const validFile = 'session_sess-87654321-4321-7654-1098-876543210987.json';

      vi.mocked(fs.readdirSync).mockReturnValue([expiredFile, validFile, 'other.txt'] as any);

      // Mock file exists for both files
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Mock expired session data for first file
      vi.mocked(fs.readFileSync).mockImplementation((filePath: any) => {
        if (filePath.includes(expiredFile)) {
          return JSON.stringify({
            clientId: 'test',
            resource: 'test',
            expires: Date.now() - 1000, // expired
            createdAt: Date.now() - 60000,
          });
        } else if (filePath.includes(validFile)) {
          return JSON.stringify({
            clientId: 'test',
            resource: 'test',
            expires: Date.now() + 60000, // not expired
            createdAt: Date.now(),
          });
        }
        return '{}';
      });

      const unlinkSyncSpy = vi.mocked(fs.unlinkSync);
      unlinkSyncSpy.mockClear();

      // Access the private cleanupExpiredSessions method
      const cleanupMethod = (sessionManager as any).cleanupExpiredSessions;
      cleanupMethod.call(sessionManager);

      // Should only delete the expired file
      expect(unlinkSyncSpy).toHaveBeenCalledTimes(1);
      expect(unlinkSyncSpy).toHaveBeenCalledWith(expect.stringContaining(expiredFile));
    });

    it('should cleanup corrupted session files', () => {
      const corruptedFile = 'session_sess-12345678-1234-4567-8901-123456789012.json';

      vi.mocked(fs.readdirSync).mockReturnValue([corruptedFile] as any);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Mock corrupted JSON
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        return 'invalid json content';
      });

      const unlinkSyncSpy = vi.mocked(fs.unlinkSync);
      unlinkSyncSpy.mockClear();

      // Access the private cleanupExpiredSessions method
      const cleanupMethod = (sessionManager as any).cleanupExpiredSessions;
      cleanupMethod.call(sessionManager);

      // Should delete the corrupted file
      expect(unlinkSyncSpy).toHaveBeenCalledTimes(1);
      expect(unlinkSyncSpy).toHaveBeenCalledWith(expect.stringContaining(corruptedFile));
    });

    it('should handle cleanup file deletion errors', () => {
      const expiredFile = 'session_sess-12345678-1234-4567-8901-123456789012.json';

      vi.mocked(fs.readdirSync).mockReturnValue([expiredFile] as any);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Mock expired session data
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          clientId: 'test',
          resource: 'test',
          expires: Date.now() - 1000, // expired
          createdAt: Date.now() - 60000,
        }),
      );

      // Mock fs.unlinkSync to throw error
      vi.mocked(fs.unlinkSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // Access the private cleanupExpiredSessions method
      const cleanupMethod = (sessionManager as any).cleanupExpiredSessions;

      // Should not throw, just log error
      expect(() => cleanupMethod.call(sessionManager)).not.toThrow();
    });

    it('should skip non-json files during cleanup', () => {
      const nonJsonFiles = ['other.txt', 'README.md', 'config.xml'];

      vi.mocked(fs.readdirSync).mockReturnValue(nonJsonFiles as any);

      const readFileSyncSpy = vi.mocked(fs.readFileSync);
      readFileSyncSpy.mockClear();

      // Access the private cleanupExpiredSessions method
      const cleanupMethod = (sessionManager as any).cleanupExpiredSessions;
      cleanupMethod.call(sessionManager);

      // Should not attempt to read non-json files
      expect(readFileSyncSpy).not.toHaveBeenCalled();
    });

    it('should process all json files during cleanup', () => {
      const jsonFiles = ['config.json', 'other-data.json', 'session_test.json'];

      vi.mocked(fs.readdirSync).mockReturnValue(jsonFiles as any);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Mock all files as non-expired valid JSON
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          expires: Date.now() + 60000, // not expired
        }),
      );

      const readFileSyncSpy = vi.mocked(fs.readFileSync);
      readFileSyncSpy.mockClear();

      // Access the private cleanupExpiredSessions method
      const cleanupMethod = (sessionManager as any).cleanupExpiredSessions;
      cleanupMethod.call(sessionManager);

      // Should attempt to read all json files
      expect(readFileSyncSpy).toHaveBeenCalledTimes(3);
    });

    it('should handle file read errors during cleanup', () => {
      const sessionFile = 'session_sess-12345678-1234-4567-8901-123456789012.json';

      vi.mocked(fs.readdirSync).mockReturnValue([sessionFile] as any);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Mock fs.readFileSync to throw error
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('File read error');
      });

      const unlinkSyncSpy = vi.mocked(fs.unlinkSync);
      unlinkSyncSpy.mockClear();

      // Access the private cleanupExpiredSessions method
      const cleanupMethod = (sessionManager as any).cleanupExpiredSessions;
      cleanupMethod.call(sessionManager);

      // Should attempt to delete the corrupted file
      expect(unlinkSyncSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Path validation security', () => {
    it('should reject session IDs that could cause path traversal', () => {
      const maliciousIds = [
        'sess-12345678-1234-4567-8901-123456789012/../../../etc/passwd',
        'sess-12345678-1234-4567-8901-123456789012\\..\\..\\windows\\system32',
        'sess-12345678-1234-4567-8901-123456789012/../../../../usr/bin/sh',
      ];

      for (const id of maliciousIds) {
        expect(() => sessionManager.getSession(id)).not.toThrow();
        expect(sessionManager.getSession(id)).toBeNull();
      }
    });

    it('should handle very long session IDs gracefully', () => {
      const longId = 'sess-' + 'a'.repeat(1000);

      expect(sessionManager.getSession(longId)).toBeNull();
      expect(sessionManager.deleteSession(longId)).toBe(false);
    });

    it('should handle session IDs with special characters', () => {
      const specialIds = [
        'sess-12345678-1234-4567-8901-123456789012\x00',
        'sess-12345678-1234-4567-8901-123456789012\n',
        'sess-12345678-1234-4567-8901-123456789012\r',
        'sess-12345678-1234-4567-8901-123456789012\t',
      ];

      for (const id of specialIds) {
        expect(sessionManager.getSession(id)).toBeNull();
        expect(sessionManager.deleteSession(id)).toBe(false);
      }
    });
  });

  describe('Edge cases for session and auth code data', () => {
    it('should handle missing required fields in session data', () => {
      const sessionId = 'sess-12345678-1234-4567-8901-123456789012';
      const incompleteSessionData = {
        clientId: 'test-client',
        // missing resource, expires, createdAt
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(incompleteSessionData));

      const session = sessionManager.getSession(sessionId);
      expect(session).toEqual(incompleteSessionData); // Should return as-is, validation happens at usage
    });

    it('should handle missing required fields in auth code data', () => {
      const code = 'code-12345678-1234-4567-8901-123456789012';
      const incompleteAuthData = {
        clientId: 'test-client',
        // missing redirectUri, resource, expires, createdAt
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(incompleteAuthData));

      const authCode = sessionManager.getAuthCode(code);
      expect(authCode).toEqual(incompleteAuthData); // Should return as-is, validation happens at usage
    });

    it('should handle zero TTL for session creation', () => {
      const sessionId = sessionManager.createSession('test-client', 'test-resource', [], 0);

      expect(sessionId).toBeDefined();
      expect(sessionId).toMatch(/^sess-/);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should handle negative TTL for auth code creation', () => {
      const code = sessionManager.createAuthCode('test-client', 'http://localhost', 'test-resource', [], -1000);

      expect(code).toBeDefined();
      expect(code).toMatch(/^code-/);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should handle very large TTL values', () => {
      const largeTTL = Number.MAX_SAFE_INTEGER;
      const sessionId = sessionManager.createSession('test-client', 'test-resource', [], largeTTL);

      expect(sessionId).toBeDefined();
      expect(sessionId).toMatch(/^sess-/);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });
});
