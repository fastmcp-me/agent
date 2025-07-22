import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ExpressServer } from '../../../src/transport/http/server.js';
import { ServerManager } from '../../../src/core/server/serverManager.js';
import { AgentConfigManager } from '../../../src/core/server/agentConfig.js';
import { vi } from 'vitest';

/**
 * Integration tests for trust proxy configuration in HTTP transport.
 *
 * These tests verify that the Express.js trust proxy configuration
 * is properly applied during server initialization with various settings.
 */
describe('HTTP Trust Proxy Configuration Integration', () => {
  let expressServer: ExpressServer;
  let mockServerManager: ServerManager;
  let configManager: AgentConfigManager;
  let mockApp: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset singleton instance
    // @ts-expect-error - Accessing private property for testing
    AgentConfigManager.instance = undefined;

    configManager = AgentConfigManager.getInstance();

    // Mock ServerManager for testing
    mockServerManager = {
      getClients: vi.fn(() => new Map()),
      getServer: vi.fn(),
    } as any;

    // Mock Express app
    mockApp = {
      use: vi.fn(),
      set: vi.fn(),
      listen: vi.fn((port, host, callback) => {
        if (callback) callback();
      }),
    };
  });

  afterEach(() => {
    if (expressServer) {
      expressServer.shutdown();
    }
  });

  describe('Trust Proxy Configuration Application', () => {
    beforeEach(() => {
      // Mock express to return our mock app
      vi.doMock('express', () => ({
        default: vi.fn(() => mockApp),
        Router: vi.fn(() => ({
          use: vi.fn(),
          get: vi.fn(),
          post: vi.fn(),
          delete: vi.fn(),
        })),
      }));
    });

    it('should apply default loopback trust proxy configuration', () => {
      // Default configuration should have trustProxy: 'loopback'
      expect(configManager.getTrustProxy()).toBe('loopback');

      expressServer = new ExpressServer(mockServerManager);

      // Verify that app.set was called with trust proxy setting
      expect(mockApp.set).toHaveBeenCalledWith('trust proxy', 'loopback');
    });

    it('should apply custom boolean trust proxy configuration', () => {
      configManager.updateConfig({ trustProxy: true });
      expect(configManager.getTrustProxy()).toBe(true);

      expressServer = new ExpressServer(mockServerManager);

      expect(mockApp.set).toHaveBeenCalledWith('trust proxy', true);
    });

    it('should apply custom IP address trust proxy configuration', () => {
      configManager.updateConfig({ trustProxy: '192.168.1.1' });
      expect(configManager.getTrustProxy()).toBe('192.168.1.1');

      expressServer = new ExpressServer(mockServerManager);

      expect(mockApp.set).toHaveBeenCalledWith('trust proxy', '192.168.1.1');
    });

    it('should apply CIDR range trust proxy configuration', () => {
      configManager.updateConfig({ trustProxy: '10.0.0.0/8' });
      expect(configManager.getTrustProxy()).toBe('10.0.0.0/8');

      expressServer = new ExpressServer(mockServerManager);

      expect(mockApp.set).toHaveBeenCalledWith('trust proxy', '10.0.0.0/8');
    });

    it('should apply preset trust proxy configurations', () => {
      const presets = ['loopback', 'linklocal', 'uniquelocal'];

      presets.forEach((preset) => {
        vi.clearAllMocks();

        // Reset singleton for clean state
        // @ts-expect-error - Accessing private property for testing
        AgentConfigManager.instance = undefined;
        configManager = AgentConfigManager.getInstance();

        configManager.updateConfig({ trustProxy: preset });
        expect(configManager.getTrustProxy()).toBe(preset);

        expressServer = new ExpressServer(mockServerManager);
        expect(mockApp.set).toHaveBeenCalledWith('trust proxy', preset);

        expressServer.shutdown();
      });
    });

    it('should apply trust proxy setting before middleware setup', () => {
      configManager.updateConfig({ trustProxy: 'linklocal' });

      expressServer = new ExpressServer(mockServerManager);

      // Verify that set was called before use (middleware setup)
      const setCallIndex = mockApp.set.mock.invocationCallOrder.find(
        (_: any, index: number) => mockApp.set.mock.calls[index]?.[0] === 'trust proxy',
      );
      const firstUseCallIndex = mockApp.use.mock.invocationCallOrder[0];

      expect(setCallIndex).toBeDefined();
      expect(setCallIndex).toBeLessThan(firstUseCallIndex);
    });

    it('should only set trust proxy once during initialization', () => {
      configManager.updateConfig({ trustProxy: 'uniquelocal' });

      expressServer = new ExpressServer(mockServerManager);

      // Filter calls to only trust proxy settings
      const trustProxyCalls = mockApp.set.mock.calls.filter((call: any[]) => call[0] === 'trust proxy');

      expect(trustProxyCalls).toHaveLength(1);
      expect(trustProxyCalls[0]).toEqual(['trust proxy', 'uniquelocal']);
    });
  });

  describe('Configuration Persistence', () => {
    beforeEach(() => {
      // Mock express to return our mock app
      vi.doMock('express', () => ({
        default: vi.fn(() => mockApp),
        Router: vi.fn(() => ({
          use: vi.fn(),
          get: vi.fn(),
          post: vi.fn(),
          delete: vi.fn(),
        })),
      }));
    });

    it('should maintain configuration across multiple server instances', () => {
      // Set initial configuration
      configManager.updateConfig({ trustProxy: false });

      // Create first server instance
      let server1 = new ExpressServer(mockServerManager);
      expect(mockApp.set).toHaveBeenCalledWith('trust proxy', false);

      server1.shutdown();
      vi.clearAllMocks();

      // Create second server instance - should use same config
      const server2 = new ExpressServer(mockServerManager);
      expect(mockApp.set).toHaveBeenCalledWith('trust proxy', false);

      server2.shutdown();
    });

    it('should reflect configuration updates in new server instances', () => {
      // Initial configuration
      configManager.updateConfig({ trustProxy: '127.0.0.1' });
      let server = new ExpressServer(mockServerManager);
      expect(mockApp.set).toHaveBeenCalledWith('trust proxy', '127.0.0.1');

      server.shutdown();
      vi.clearAllMocks();

      // Update configuration
      configManager.updateConfig({ trustProxy: 'loopback' });
      server = new ExpressServer(mockServerManager);
      expect(mockApp.set).toHaveBeenCalledWith('trust proxy', 'loopback');

      server.shutdown();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      // Mock express to return our mock app
      vi.doMock('express', () => ({
        default: vi.fn(() => mockApp),
        Router: vi.fn(() => ({
          use: vi.fn(),
          get: vi.fn(),
          post: vi.fn(),
          delete: vi.fn(),
        })),
      }));
    });

    it('should handle boolean false trust proxy configuration', () => {
      configManager.updateConfig({ trustProxy: false });
      expect(configManager.getTrustProxy()).toBe(false);

      expressServer = new ExpressServer(mockServerManager);

      expect(mockApp.set).toHaveBeenCalledWith('trust proxy', false);
    });

    it('should handle complex CIDR configurations', () => {
      const complexCidrs = ['192.168.0.0/16', '10.0.0.0/8', '172.16.0.0/12', '2001:db8::/32'];

      complexCidrs.forEach((cidr) => {
        vi.clearAllMocks();

        // Reset singleton
        // @ts-expect-error - Accessing private property for testing
        AgentConfigManager.instance = undefined;
        configManager = AgentConfigManager.getInstance();

        configManager.updateConfig({ trustProxy: cidr });
        expressServer = new ExpressServer(mockServerManager);

        expect(mockApp.set).toHaveBeenCalledWith('trust proxy', cidr);

        expressServer.shutdown();
      });
    });
  });
});
