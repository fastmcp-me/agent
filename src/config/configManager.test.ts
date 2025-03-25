import fs from 'fs';
import path from 'path';
import { ConfigManager, ConfigChangeEvent } from './configManager.js';
import { DEFAULT_CONFIG } from '../constants.js';
import { setupCommonJestMocks } from '../test-utils/mocks/commonMocks.js';
import { testConfig } from '../test-utils/fixtures/commonFixtures.js';
import { clearAllMocks, createEventEmitterSpy } from '../test-utils/helpers/testHelpers.js';

// Mock modules
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  watch: jest.fn(() => ({ close: jest.fn() })),
}));

// Setup common mocks
setupCommonJestMocks();

// Mock constants
jest.mock('../constants.js', () => ({
  __esModule: true,
  DEFAULT_CONFIG: { mcpServers: {} },
  getGlobalConfigPath: jest.fn(),
  getGlobalConfigDir: jest.fn().mockReturnValue('/test'),
}));

describe('ConfigManager', () => {
  const testConfigPath = '/test/config.json';

  beforeEach(() => {
    // Reset all mocks and timers
    clearAllMocks();
    // Reset singleton instance
    (ConfigManager as any).instance = undefined;
    // Default mock implementations
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({ mcpServers: {} }));
  });

  describe('getInstance', () => {
    it('should create singleton instance', () => {
      const instance1 = ConfigManager.getInstance(testConfigPath);
      const instance2 = ConfigManager.getInstance(testConfigPath);
      expect(instance1).toBe(instance2);
    });

    it('should use provided config path', () => {
      const instance = ConfigManager.getInstance(testConfigPath);
      expect((instance as any).configFilePath).toBe(testConfigPath);
    });
  });

  describe('ensureConfigExists', () => {
    it('should create config directory and file if they do not exist', () => {
      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(false) // Directory doesn't exist
        .mockReturnValueOnce(false); // File doesn't exist

      ConfigManager.getInstance(testConfigPath);

      expect(fs.mkdirSync).toHaveBeenCalledWith(path.dirname(testConfigPath), { recursive: true });
      expect(fs.writeFileSync).toHaveBeenCalledWith(testConfigPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
    });
  });

  describe('config watching', () => {
    it('should start and stop watching config file', () => {
      const instance = ConfigManager.getInstance(testConfigPath);

      instance.startWatching();
      expect(fs.watch).toHaveBeenCalledWith(testConfigPath, expect.any(Function));

      instance.stopWatching();
      expect(instance['configWatcher']).toBeNull();
    });

    it('should reload config on file change', () => {
      const instance = ConfigManager.getInstance(testConfigPath);
      const mockWatcher = { close: jest.fn() };
      let watchCallback: Function = () => {};

      (fs.watch as jest.Mock).mockImplementation((path, callback) => {
        watchCallback = callback;
        return mockWatcher;
      });

      instance.startWatching();

      // Setup spy for event emission
      const emitSpy = createEventEmitterSpy(instance);

      // Mock new config data
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(JSON.stringify(testConfig));

      // Simulate file change
      watchCallback('change', path.basename(testConfigPath));

      expect(emitSpy).toHaveBeenCalledWith(ConfigChangeEvent.TRANSPORT_CONFIG_CHANGED, testConfig.mcpServers);
    });
  });

  describe('getTransportConfig', () => {
    it('should return copy of transport config', () => {
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(JSON.stringify(testConfig));

      const instance = ConfigManager.getInstance(testConfigPath);
      const config = instance.getTransportConfig();

      expect(config).toEqual(testConfig.mcpServers);
      expect(config).not.toBe(instance['transportConfig']); // Should be a copy
    });
  });
});
