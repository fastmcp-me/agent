import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { ClientSessionManager } from './clientSessionManager.js';
import { ClientSessionData } from './sessionTypes.js';

// Mock fs module
vi.mock('fs');
vi.mock('path');

// Mock logger
vi.mock('../logger/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock getGlobalConfigDir
vi.mock('../constants.js', () => ({
  getGlobalConfigDir: vi.fn().mockReturnValue('/mock/config'),
}));

describe('ClientSessionManager', () => {
  let clientSessionManager: ClientSessionManager;
  let mockFs: typeof fs;
  let mockPath: typeof path;

  beforeEach(() => {
    mockFs = fs as any;
    mockPath = path as any;
    vi.clearAllMocks();

    // Mock path.join and path.resolve
    mockPath.join = vi.fn().mockImplementation((...args) => args.join('/'));
    mockPath.resolve = vi.fn().mockImplementation((...args) => args.join('/'));

    // Mock fs.existsSync to return false initially
    mockFs.existsSync = vi.fn().mockReturnValue(false);
    mockFs.mkdirSync = vi.fn();
    mockFs.writeFileSync = vi.fn();
    mockFs.readFileSync = vi.fn();
    mockFs.unlinkSync = vi.fn();
    mockFs.readdirSync = vi.fn().mockReturnValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create client session manager with default path', () => {
      clientSessionManager = new ClientSessionManager();
      expect(mockPath.join).toHaveBeenCalledWith('/mock/config', 'clientSessions');
      expect(mockFs.mkdirSync).toHaveBeenCalledWith('/mock/config/clientSessions', { recursive: true });
    });

    it('should create client session manager with custom path', () => {
      const customPath = '/custom/path';
      clientSessionManager = new ClientSessionManager(customPath);
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(customPath, { recursive: true });
    });

    it('should not create directory if it already exists', () => {
      mockFs.existsSync = vi.fn().mockReturnValue(true);
      clientSessionManager = new ClientSessionManager();
      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('getClientSessionStoragePath', () => {
    it('should return the client session storage path', () => {
      clientSessionManager = new ClientSessionManager('/test/path');
      expect(clientSessionManager.getClientSessionStoragePath()).toBe('/test/path');
    });
  });

  describe('server name sanitization', () => {
    beforeEach(() => {
      clientSessionManager = new ClientSessionManager();
    });

    it('should sanitize server names with special characters', () => {
      const testData: ClientSessionData = {
        serverName: 'test',
        expires: Date.now() + 1000,
        createdAt: Date.now(),
      };

      // Test with server name containing special characters
      clientSessionManager.createClientSession('server.with.dots', testData);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('oauth_server_with_dots.json'),
        expect.any(String),
      );
    });

    it('should handle server names with spaces', () => {
      const testData: ClientSessionData = {
        serverName: 'test',
        expires: Date.now() + 1000,
        createdAt: Date.now(),
      };

      clientSessionManager.createClientSession('server with spaces', testData);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('oauth_server_with_spaces.json'),
        expect.any(String),
      );
    });

    it('should handle server names with slashes', () => {
      const testData: ClientSessionData = {
        serverName: 'test',
        expires: Date.now() + 1000,
        createdAt: Date.now(),
      };

      clientSessionManager.createClientSession('server/with/slashes', testData);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('oauth_server_with_slashes.json'),
        expect.any(String),
      );
    });

    it('should handle empty server name', () => {
      const testData: ClientSessionData = {
        serverName: 'test',
        expires: Date.now() + 1000,
        createdAt: Date.now(),
      };

      clientSessionManager.createClientSession('', testData);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('oauth_default.json'),
        expect.any(String),
      );
    });

    it('should handle server names with only special characters', () => {
      const testData: ClientSessionData = {
        serverName: 'test',
        expires: Date.now() + 1000,
        createdAt: Date.now(),
      };

      clientSessionManager.createClientSession('特殊字符', testData);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('oauth_default.json'),
        expect.any(String),
      );
    });

    it('should limit server name length', () => {
      const testData: ClientSessionData = {
        serverName: 'test',
        expires: Date.now() + 1000,
        createdAt: Date.now(),
      };

      const longServerName = 'a'.repeat(150);
      clientSessionManager.createClientSession(longServerName, testData);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('oauth_' + 'a'.repeat(100) + '.json'),
        expect.any(String),
      );
    });
  });

  describe('createClientSession', () => {
    beforeEach(() => {
      clientSessionManager = new ClientSessionManager();
    });

    it('should create a client session successfully', () => {
      const sessionData: ClientSessionData = {
        serverName: 'test-server',
        clientInfo: '{"client_id":"test"}',
        tokens: '{"access_token":"test-token"}',
        codeVerifier: 'test-verifier',
        state: 'test-state',
        expires: Date.now() + 1000,
        createdAt: Date.now(),
      };

      const result = clientSessionManager.createClientSession('test-server', sessionData);
      expect(result).toBe('test-server');
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('oauth_test-server.json'),
        JSON.stringify(sessionData, null, 2),
      );
    });

    it('should throw error if file write fails', () => {
      mockFs.writeFileSync = vi.fn().mockImplementation(() => {
        throw new Error('Write failed');
      });

      const sessionData: ClientSessionData = {
        serverName: 'test-server',
        expires: Date.now() + 1000,
        createdAt: Date.now(),
      };

      expect(() => {
        clientSessionManager.createClientSession('test-server', sessionData);
      }).toThrow('Write failed');
    });
  });

  describe('getClientSession', () => {
    beforeEach(() => {
      clientSessionManager = new ClientSessionManager();
    });

    it('should return null if session file does not exist', () => {
      mockFs.existsSync = vi.fn().mockReturnValue(false);
      const result = clientSessionManager.getClientSession('test-server');
      expect(result).toBeNull();
    });

    it('should return session data if file exists and is not expired', () => {
      const sessionData: ClientSessionData = {
        serverName: 'test-server',
        clientInfo: '{"client_id":"test"}',
        expires: Date.now() + 1000,
        createdAt: Date.now(),
      };

      mockFs.existsSync = vi.fn().mockReturnValue(true);
      mockFs.readFileSync = vi.fn().mockReturnValue(JSON.stringify(sessionData));

      const result = clientSessionManager.getClientSession('test-server');
      expect(result).toEqual(sessionData);
    });

    it('should delete and return null if session is expired', () => {
      const expiredSessionData: ClientSessionData = {
        serverName: 'test-server',
        expires: Date.now() - 1000, // Expired
        createdAt: Date.now(),
      };

      mockFs.existsSync = vi.fn().mockReturnValue(true);
      mockFs.readFileSync = vi.fn().mockReturnValue(JSON.stringify(expiredSessionData));
      mockFs.unlinkSync = vi.fn();

      const result = clientSessionManager.getClientSession('test-server');
      expect(result).toBeNull();
      expect(mockFs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining('oauth_test-server.json'));
    });

    it('should return null if JSON parsing fails', () => {
      mockFs.existsSync = vi.fn().mockReturnValue(true);
      mockFs.readFileSync = vi.fn().mockReturnValue('invalid json');

      const result = clientSessionManager.getClientSession('test-server');
      expect(result).toBeNull();
    });
  });

  describe('deleteClientSession', () => {
    beforeEach(() => {
      clientSessionManager = new ClientSessionManager();
    });

    it('should delete session file if it exists', () => {
      mockFs.existsSync = vi.fn().mockReturnValue(true);
      mockFs.unlinkSync = vi.fn();

      const result = clientSessionManager.deleteClientSession('test-server');
      expect(result).toBe(true);
      expect(mockFs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining('oauth_test-server.json'));
    });

    it('should return false if session file does not exist', () => {
      mockFs.existsSync = vi.fn().mockReturnValue(false);

      const result = clientSessionManager.deleteClientSession('test-server');
      expect(result).toBe(false);
      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should return false if deletion fails', () => {
      mockFs.existsSync = vi.fn().mockReturnValue(true);
      mockFs.unlinkSync = vi.fn().mockImplementation(() => {
        throw new Error('Delete failed');
      });

      const result = clientSessionManager.deleteClientSession('test-server');
      expect(result).toBe(false);
    });
  });

  describe('cleanupExpiredClientSessions', () => {
    beforeEach(() => {
      clientSessionManager = new ClientSessionManager();
    });

    it('should clean up expired client sessions', () => {
      const currentTime = Date.now();
      const validSession: ClientSessionData = {
        serverName: 'valid-server',
        expires: currentTime + 1000,
        createdAt: currentTime,
      };
      const expiredSession: ClientSessionData = {
        serverName: 'expired-server',
        expires: currentTime - 1000,
        createdAt: currentTime,
      };

      mockFs.existsSync = vi.fn().mockReturnValue(true);
      mockFs.readdirSync = vi.fn().mockReturnValue(['oauth_valid.json', 'oauth_expired.json', 'other.json']);
      mockFs.readFileSync = vi
        .fn()
        .mockReturnValueOnce(JSON.stringify(validSession))
        .mockReturnValueOnce(JSON.stringify(expiredSession));
      mockFs.unlinkSync = vi.fn();

      clientSessionManager.cleanupExpiredClientSessions();

      expect(mockFs.unlinkSync).toHaveBeenCalledTimes(1);
      expect(mockFs.unlinkSync).toHaveBeenCalledWith('/mock/config/clientSessions/oauth_expired.json');
    });

    it('should remove corrupted session files', () => {
      mockFs.existsSync = vi.fn().mockReturnValue(true);
      mockFs.readdirSync = vi.fn().mockReturnValue(['oauth_corrupted.json']);
      mockFs.readFileSync = vi.fn().mockReturnValue('invalid json');
      mockFs.unlinkSync = vi.fn();

      clientSessionManager.cleanupExpiredClientSessions();

      expect(mockFs.unlinkSync).toHaveBeenCalledTimes(1);
      expect(mockFs.unlinkSync).toHaveBeenCalledWith('/mock/config/clientSessions/oauth_corrupted.json');
    });

    it('should skip if client session directory does not exist', () => {
      mockFs.existsSync = vi.fn().mockReturnValue(false);

      clientSessionManager.cleanupExpiredClientSessions();

      expect(mockFs.readdirSync).not.toHaveBeenCalled();
      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
    });
  });

  describe('listClientSessions', () => {
    beforeEach(() => {
      clientSessionManager = new ClientSessionManager();
    });

    it('should list all client sessions', () => {
      mockFs.existsSync = vi.fn().mockReturnValue(true);
      mockFs.readdirSync = vi
        .fn()
        .mockReturnValue(['oauth_server1.json', 'oauth_server2.json', 'other.json', 'oauth_server3.json']);

      const result = clientSessionManager.listClientSessions();
      expect(result).toEqual(['server1', 'server2', 'server3']);
    });

    it('should return empty array if directory does not exist', () => {
      mockFs.existsSync = vi.fn().mockReturnValue(false);

      const result = clientSessionManager.listClientSessions();
      expect(result).toEqual([]);
    });

    it('should return empty array if listing fails', () => {
      mockFs.existsSync = vi.fn().mockReturnValue(true);
      mockFs.readdirSync = vi.fn().mockImplementation(() => {
        throw new Error('List failed');
      });

      const result = clientSessionManager.listClientSessions();
      expect(result).toEqual([]);
    });
  });
});
