import logger from '../logger/logger.js';
import { ConfigChangeEvent, ConfigManager } from '../config/configManager.js';
import { MCPServerParams, ServerInfo, EnhancedTransport } from '../core/types/index.js';
import { createClients } from '../core/client/clientManager.js';
import { setupCapabilities } from '../capabilities/capabilityManager.js';
import { createTransports } from '../transport/config.js';
import { ServerManager } from '../core/server/serverManager.js';

/**
 * Service to handle dynamic configuration reloading
 */
export class ConfigReloadService {
  private static instance: ConfigReloadService;
  private serverInstances: Map<string, ServerInfo> = new Map();
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
   * Initialize the service with initial transports
   * @param initialTransports The initial transports
   */
  public initialize(initialTransports: Record<string, EnhancedTransport>): void {
    this.currentTransports = initialTransports;

    const configManager = ConfigManager.getInstance();

    // Remove any existing listeners to prevent duplicates
    configManager.removeAllListeners(ConfigChangeEvent.TRANSPORT_CONFIG_CHANGED);

    // Increase max listeners limit to prevent warnings
    configManager.setMaxListeners(20);

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
    if (this.isReloading) {
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

      // Update ServerManager with new clients and transports
      const serverManager = ServerManager.current;
      serverManager.updateClientsAndTransports(newClients, newTransports);

      // Register new capabilities with the server if serverInfo is available
      for (const serverInfo of this.serverInstances.values()) {
        await setupCapabilities(newClients, serverInfo);
      }

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
   * Update the server info when a client connects
   * @param sessionId The session ID for this server instance
   * @param serverInfo The MCP server instance
   */
  public updateServerInfo(sessionId: string, serverInfo: ServerInfo): void {
    this.serverInstances.set(sessionId, serverInfo);
    logger.debug(`Updated server info for session ${sessionId} in config reload service`);
  }

  /**
   * Remove server info when a client disconnects
   * @param sessionId The session ID to remove
   */
  public removeServerInfo(sessionId: string): void {
    this.serverInstances.delete(sessionId);
    logger.debug(`Removed server info for session ${sessionId} from config reload service`);
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
