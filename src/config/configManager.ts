import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { MCP_CONFIG_FILE } from '../constants.js';
import logger from '../logger/logger.js';
import { MCPTransport } from './transportConfig.js';

/**
 * Configuration change event types
 */
export enum ConfigChangeEvent {
  TRANSPORT_CONFIG_CHANGED = 'transportConfigChanged',
}

/**
 * Configuration manager that handles loading, watching, and reloading configuration
 */
export class ConfigManager extends EventEmitter {
  private static instance: ConfigManager;
  private configWatcher: fs.FSWatcher | null = null;
  private transportConfig: Record<string, MCPTransport> = {};
  private configFilePath: string;

  /**
   * Private constructor to enforce singleton pattern
   * @param configFilePath - Path to the config file
   */
  private constructor(configFilePath?: string) {
    super();
    this.configFilePath = configFilePath || path.resolve(process.cwd(), MCP_CONFIG_FILE);
    this.loadConfig();
  }

  /**
   * Get the singleton instance of the ConfigManager
   * @param configFilePath - Optional path to the config file
   * @returns The ConfigManager instance
   */
  public static getInstance(configFilePath?: string): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager(configFilePath);
    }
    return ConfigManager.instance;
  }

  /**
   * Load the configuration from the config file
   */
  private loadConfig(): void {
    try {
      const configData = JSON.parse(fs.readFileSync(this.configFilePath, 'utf8'));
      this.transportConfig = configData.mcpServers || {};
      logger.info('Configuration loaded successfully');
    } catch (error) {
      logger.error(`Failed to load configuration: ${error}`);
      this.transportConfig = {};
    }
  }

  /**
   * Start watching the configuration file for changes
   */
  public startWatching(): void {
    if (this.configWatcher) {
      return;
    }

    try {
      this.configWatcher = fs.watch(this.configFilePath, (eventType: fs.WatchEventType, filename: string | null) => {
        if (filename === path.basename(this.configFilePath) && eventType === 'change') {
          logger.info(`Configuration file ${filename} changed, reloading...`);
          this.reloadConfig();
        }
      });
      logger.info(`Started watching configuration file: ${this.configFilePath}`);
    } catch (error) {
      logger.error(`Failed to start watching configuration file: ${error}`);
    }
  }

  /**
   * Stop watching the configuration file
   */
  public stopWatching(): void {
    if (this.configWatcher) {
      this.configWatcher.close();
      this.configWatcher = null;
      logger.info('Stopped watching configuration file');
    }
  }

  /**
   * Reload the configuration from the config file
   */
  public reloadConfig(): void {
    const oldConfig = { ...this.transportConfig };

    try {
      this.loadConfig();

      // Emit event for transport configuration changes
      if (JSON.stringify(oldConfig) !== JSON.stringify(this.transportConfig)) {
        logger.info('Transport configuration changed, emitting event');
        this.emit(ConfigChangeEvent.TRANSPORT_CONFIG_CHANGED, this.transportConfig);
      }
    } catch (error) {
      logger.error(`Failed to reload configuration: ${error}`);
    }
  }

  /**
   * Get the current transport configuration
   * @returns The current transport configuration
   */
  public getTransportConfig(): Record<string, MCPTransport> {
    return { ...this.transportConfig };
  }
}

export default ConfigManager.getInstance();
