import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getGlobalConfigDir, getGlobalConfigPath } from './constants.js';

describe('constants', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let originalPlatform: string;

  beforeEach(() => {
    originalEnv = { ...process.env };
    originalPlatform = process.platform;
  });

  afterEach(() => {
    process.env = originalEnv;
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      writable: true,
    });
  });

  describe('getGlobalConfigDir', () => {
    it('should return config directory for macOS', () => {
      process.env.HOME = '/Users/testuser';
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
      });

      const result = getGlobalConfigDir();
      expect(result).toBe('/Users/testuser/.config/1mcp');
    });

    it('should return config directory for Linux', () => {
      process.env.HOME = '/home/testuser';
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        writable: true,
      });

      const result = getGlobalConfigDir();
      expect(result).toBe('/home/testuser/.config/1mcp');
    });

    it('should return config directory for Windows', () => {
      delete process.env.HOME;
      process.env.USERPROFILE = 'C:\\Users\\testuser';
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
      });

      const result = getGlobalConfigDir();
      expect(result).toBe('C:\\Users\\testuser/AppData/Roaming/1mcp');
    });

    it('should prioritize HOME over USERPROFILE', () => {
      process.env.HOME = '/home/testuser';
      process.env.USERPROFILE = 'C:\\Users\\testuser';
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        writable: true,
      });

      const result = getGlobalConfigDir();
      expect(result).toBe('/home/testuser/.config/1mcp');
    });

    it('should use USERPROFILE when HOME is not available', () => {
      delete process.env.HOME;
      process.env.USERPROFILE = 'C:\\Users\\testuser';
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
      });

      const result = getGlobalConfigDir();
      expect(result).toBe('C:\\Users\\testuser/AppData/Roaming/1mcp');
    });

    it('should throw error when no home directory is found', () => {
      delete process.env.HOME;
      delete process.env.USERPROFILE;

      expect(() => getGlobalConfigDir()).toThrow('Could not determine home directory');
    });

    it('should handle empty HOME environment variable', () => {
      process.env.HOME = '';
      delete process.env.USERPROFILE;

      expect(() => getGlobalConfigDir()).toThrow('Could not determine home directory');
    });

    it('should handle empty USERPROFILE environment variable', () => {
      delete process.env.HOME;
      process.env.USERPROFILE = '';

      expect(() => getGlobalConfigDir()).toThrow('Could not determine home directory');
    });
  });

  describe('getGlobalConfigPath', () => {
    it('should return config file path for macOS', () => {
      process.env.HOME = '/Users/testuser';
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
      });

      const result = getGlobalConfigPath();
      expect(result).toBe('/Users/testuser/.config/1mcp/mcp.json');
    });

    it('should return config file path for Linux', () => {
      process.env.HOME = '/home/testuser';
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        writable: true,
      });

      const result = getGlobalConfigPath();
      expect(result).toBe('/home/testuser/.config/1mcp/mcp.json');
    });

    it('should return config file path for Windows', () => {
      delete process.env.HOME;
      process.env.USERPROFILE = 'C:\\Users\\testuser';
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
      });

      const result = getGlobalConfigPath();
      expect(result).toBe('C:\\Users\\testuser/AppData/Roaming/1mcp/mcp.json');
    });

    it('should use getGlobalConfigDir internally', () => {
      process.env.HOME = '/custom/config/path';
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
      });

      const result = getGlobalConfigPath();
      expect(result).toBe('/custom/config/path/.config/1mcp/mcp.json');
    });

    it('should handle path with spaces', () => {
      process.env.HOME = '/Users/test user';
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
      });

      const result = getGlobalConfigPath();
      expect(result).toBe('/Users/test user/.config/1mcp/mcp.json');
    });

    it('should handle path with special characters', () => {
      process.env.HOME = '/Users/test-user_123';
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
      });

      const result = getGlobalConfigPath();
      expect(result).toBe('/Users/test-user_123/.config/1mcp/mcp.json');
    });
  });

  describe('platform detection', () => {
    it('should handle unknown platform as non-Unix', () => {
      process.env.HOME = '/home/testuser';
      Object.defineProperty(process, 'platform', {
        value: 'unknown',
        writable: true,
      });

      const result = getGlobalConfigDir();
      expect(result).toBe('/home/testuser/AppData/Roaming/1mcp');
    });

    it('should handle freebsd as Unix-like', () => {
      process.env.HOME = '/home/testuser';
      Object.defineProperty(process, 'platform', {
        value: 'freebsd',
        writable: true,
      });

      const result = getGlobalConfigDir();
      expect(result).toBe('/home/testuser/AppData/Roaming/1mcp');
    });

    it('should handle openbsd as Unix-like', () => {
      process.env.HOME = '/home/testuser';
      Object.defineProperty(process, 'platform', {
        value: 'openbsd',
        writable: true,
      });

      const result = getGlobalConfigDir();
      expect(result).toBe('/home/testuser/AppData/Roaming/1mcp');
    });
  });

  describe('error handling', () => {
    it('should throw descriptive error message', () => {
      delete process.env.HOME;
      delete process.env.USERPROFILE;

      expect(() => getGlobalConfigDir()).toThrow('Could not determine home directory');
    });

    it('should propagate error from getGlobalConfigDir to getGlobalConfigPath', () => {
      delete process.env.HOME;
      delete process.env.USERPROFILE;

      expect(() => getGlobalConfigPath()).toThrow('Could not determine home directory');
    });
  });

  describe('path construction', () => {
    it('should use correct path separators', () => {
      process.env.HOME = '/Users/testuser';
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
      });

      const configDir = getGlobalConfigDir();
      const configPath = getGlobalConfigPath();

      expect(configDir).toContain('/');
      expect(configPath).toContain('/');
      expect(configPath).toContain('.config');
      expect(configPath).toContain('1mcp');
      expect(configPath).toContain('mcp.json');
    });

    it('should maintain consistent directory structure', () => {
      process.env.HOME = '/Users/testuser';
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
      });

      const configDir = getGlobalConfigDir();
      const configPath = getGlobalConfigPath();

      expect(configPath.startsWith(configDir)).toBe(true);
      expect(configPath.endsWith('/mcp.json')).toBe(true);
    });
  });
});