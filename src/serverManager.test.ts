import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { ServerManager } from './serverManager.js';
import logger from './logger/logger.js';
import configReloadService from './services/configReloadService.js';
import { setupCapabilities } from './capabilities/capabilityManager.js';
import { enhanceServerWithLogging } from './middleware/loggingMiddleware.js';
import { Clients } from './types.js';

// Mock dependencies
jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: jest.fn(),
}));

jest.mock('@modelcontextprotocol/sdk/shared/transport.js', () => ({
  Transport: jest.fn(),
}));

jest.mock('./logger/logger.js', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockLogger,
  };
});

jest.mock('./services/configReloadService.js', () => ({
  __esModule: true,
  default: {
    initialize: jest.fn(),
  },
}));

jest.mock('./capabilities/capabilityManager.js', () => ({
  setupCapabilities: jest.fn(),
}));

jest.mock('./middleware/loggingMiddleware.js', () => ({
  enhanceServerWithLogging: jest.fn(),
}));

describe('ServerManager', () => {
  let mockConfig: { name: string; version: string };
  let mockCapabilities: { capabilities: Record<string, unknown> };
  let mockClients: Clients;
  let mockTransports: Record<string, Transport>;
  let mockTransport: Transport;
  let mockServer: Server;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup test data
    mockConfig = { name: 'test-server', version: '1.0.0' };
    mockCapabilities = { capabilities: { test: true } };
    mockClients = {};
    mockTransports = {};
    mockTransport = {
      // Add any required Transport properties here
    } as Transport;
    mockServer = {
      connect: jest.fn().mockResolvedValue(undefined),
      transport: mockTransport,
    } as unknown as Server;

    // Setup mocks
    (Server as jest.Mock).mockImplementation(() => mockServer);
    (setupCapabilities as jest.Mock).mockResolvedValue(undefined);
    (enhanceServerWithLogging as jest.Mock).mockReturnValue(undefined);
    (configReloadService.initialize as jest.Mock).mockImplementation(() => undefined);
  });

  describe('getInstance', () => {
    it('should create a singleton instance', () => {
      const instance1 = ServerManager.getInstance(mockConfig, mockCapabilities, mockClients, mockTransports);
      const instance2 = ServerManager.getInstance(mockConfig, mockCapabilities, mockClients, mockTransports);

      expect(instance1).toBe(instance2);
    });
  });

  describe('connectTransport', () => {
    let serverManager: ServerManager;
    const sessionId = 'test-session';
    const tags = ['tag1', 'tag2'];

    beforeEach(() => {
      serverManager = ServerManager.getInstance(mockConfig, mockCapabilities, mockClients, mockTransports);
    });

    it('should successfully connect a transport', async () => {
      await serverManager.connectTransport(mockTransport, sessionId, tags);

      expect(Server).toHaveBeenCalledWith(mockConfig, mockCapabilities);
      expect(enhanceServerWithLogging).toHaveBeenCalledWith(mockServer);
      expect(setupCapabilities).toHaveBeenCalled();
      expect(configReloadService.initialize).toHaveBeenCalled();
      expect(mockServer.connect).toHaveBeenCalledWith(mockTransport);
      expect(logger.info).toHaveBeenCalledWith(`Connected transport for session ${sessionId}`);
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      (mockServer.connect as jest.Mock).mockRejectedValueOnce(error);

      await expect(serverManager.connectTransport(mockTransport, sessionId, tags)).rejects.toThrow('Connection failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('disconnectTransport', () => {
    let serverManager: ServerManager;
    const sessionId = 'test-session';

    beforeEach(() => {
      serverManager = ServerManager.getInstance(mockConfig, mockCapabilities, mockClients, mockTransports);
    });

    it('should successfully disconnect a transport', async () => {
      await serverManager.connectTransport(mockTransport, sessionId);
      jest.clearAllMocks(); // Clear the logs from connectTransport
      serverManager.disconnectTransport(sessionId);
      expect(logger.info).toHaveBeenCalledWith(`Disconnected transport for session ${sessionId}`);
    });

    it('should handle non-existent session gracefully', () => {
      serverManager.disconnectTransport('non-existent');
      expect(logger.info).not.toHaveBeenCalled();
    });
  });

  describe('transport management methods', () => {
    let serverManager: ServerManager;
    const sessionId = 'test-session';

    beforeEach(async () => {
      serverManager = ServerManager.getInstance(mockConfig, mockCapabilities, mockClients, mockTransports);
      await serverManager.connectTransport(mockTransport, sessionId);
    });

    it('should get transport by session id', () => {
      const transport = serverManager.getTransport(sessionId);
      expect(transport).toBe(mockTransport);
    });

    it('should return undefined for non-existent session', () => {
      const transport = serverManager.getTransport('non-existent');
      expect(transport).toBeUndefined();
    });

    it('should get all transports', () => {
      const transports = serverManager.getTransports();
      expect(transports.size).toBe(1);
      expect(transports.get(sessionId)).toBe(mockTransport);
    });

    it('should get client transports', () => {
      const clientTransports = serverManager.getClientTransports();
      expect(clientTransports).toEqual(mockTransports);
    });

    it('should get active transports count', () => {
      expect(serverManager.getActiveTransportsCount()).toBe(1);
    });
  });

  describe('getServer', () => {
    let serverManager: ServerManager;
    const sessionId = 'test-session';
    const tags = ['tag1', 'tag2'];

    beforeEach(async () => {
      serverManager = ServerManager.getInstance(mockConfig, mockCapabilities, mockClients, mockTransports);
      await serverManager.connectTransport(mockTransport, sessionId, tags);
    });

    it('should return server info for existing session', () => {
      const serverInfo = serverManager.getServer(sessionId);
      expect(serverInfo).toBeDefined();
      expect(serverInfo?.server).toBe(mockServer);
      expect(serverInfo?.tags).toEqual(tags);
    });

    it('should return undefined for non-existent session', () => {
      const serverInfo = serverManager.getServer('non-existent');
      expect(serverInfo).toBeUndefined();
    });
  });
});
