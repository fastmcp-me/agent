import logger from '../logger/logger.js';
import { ConfigChangeEvent, ConfigManager } from '../config/configManager.js';
import { MCPServerParams, ServerInfo, EnhancedTransport } from '../types.js';
import { createClients } from '../clients/clientManager.js';
import { setupCapabilities } from '../capabilities/capabilityManager.js';
import { createTransports } from '../config/transportConfig.js';

/**
 * Service to handle dynamic configuration reloading
 */
export class ConfigReloadService {
  private static instance: ConfigReloadService;
  private serverInfo: ServerInfo | null = null;
  private currentTransports: Record<string, EnhancedTransport> = {};
  private isReloading = false;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}

  /**
   * Get the singleton instance of the ConfigReloadService
   * @returns The ConfigReloadService instance
   */
  public static getInstance(): ConfigReloadService {
    if (!ConfigReloadService.instance) {
      ConfigReloadService.instance = new ConfigReloadService();
    }
    return ConfigReloadService.instance;
  }

  /**
   * Initialize the service with the server instance
   * @param serverInfo The MCP server instance
   * @param initialTransports The initial transports
   */
  public initialize(serverInfo: ServerInfo, initialTransports: Record<string, EnhancedTransport>): void {
    this.serverInfo = serverInfo;
    this.currentTransports = initialTransports;

    const configManager = ConfigManager.getInstance();

    // Set up configuration change listener
    configManager.on(ConfigChangeEvent.TRANSPORT_CONFIG_CHANGED, this.handleConfigChange.bind(this));

    // Start watching for configuration changes
    configManager.startWatching();

    logger.info('Config reload service initialized');
  }

  /**
   * Handle configuration changes
   * @param newConfig The new transport configuration
   */
  private async handleConfigChange(newConfig: Record<string, MCPServerParams>): Promise<void> {
    if (!this.serverInfo || this.isReloading) {
      return;
    }

    this.isReloading = true;
    logger.info('Handling configuration change...');

    // Store current transports for reconnection
    const currentTransportEntries = Object.entries(this.currentTransports);

    try {
      // Close all current transports
      for (const [key, transport] of currentTransportEntries) {
        try {
          await transport.close();
          logger.info(`Closed transport: ${key}`);
        } catch (error) {
          logger.error(`Error closing transport ${key}: ${error}`);
        }
      }

      // Create new transports from updated configuration
      const newTransports = createTransports(newConfig);

      // Create clients for the new transports
      const newClients = await createClients(newTransports);

      // Register new capabilities with the server
      await setupCapabilities(newClients, this.serverInfo);

      // Update current transports
      this.currentTransports = newTransports;

      logger.info('Configuration reload completed successfully');
    } catch (error) {
      logger.error(`Failed to reload configuration: ${error}`);
    } finally {
      this.isReloading = false;
    }
  }

  /**
   * Stop the service and clean up resources
   */
  public stop(): void {
    const configManager = ConfigManager.getInstance();
    configManager.stopWatching();
    configManager.removeAllListeners(ConfigChangeEvent.TRANSPORT_CONFIG_CHANGED);
    logger.info('Config reload service stopped');
  }
}

export default ConfigReloadService.getInstance();
