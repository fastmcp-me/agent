import { ClientStatus } from '../core/types/index.js';
import { ServerManager } from '../core/server/serverManager.js';
import { McpConfigManager } from '../config/mcpConfigManager.js';
import { AgentConfigManager } from '../core/server/agentConfig.js';
import { MCP_SERVER_VERSION } from '../constants.js';
import logger from '../logger/logger.js';

/**
 * Health status levels
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
}

/**
 * MCP server health information
 */
export interface McpServerHealth {
  name: string;
  status: ClientStatus;
  healthy: boolean;
  lastConnected?: Date;
  lastError?: string;
  tags?: string[];
}

/**
 * System health metrics
 */
export interface SystemHealth {
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  process: {
    pid: number;
    nodeVersion: string;
    platform: string;
    arch: string;
  };
}

/**
 * Complete health check response
 */
export interface HealthCheckResponse {
  status: HealthStatus;
  timestamp: string;
  version: string;
  system: SystemHealth;
  servers: {
    total: number;
    healthy: number;
    unhealthy: number;
    details: McpServerHealth[];
  };
  configuration: {
    loaded: boolean;
    serverCount: number;
    enabledCount: number;
    disabledCount: number;
    authEnabled: boolean;
    transport: string;
  };
}

/**
 * Health service for monitoring system and MCP server status
 */
export class HealthService {
  private static instance: HealthService;
  private startTime: number;

  private constructor() {
    this.startTime = Date.now();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): HealthService {
    if (!HealthService.instance) {
      HealthService.instance = new HealthService();
    }
    return HealthService.instance;
  }

  /**
   * Perform complete health check
   */
  public async performHealthCheck(): Promise<HealthCheckResponse> {
    try {
      const systemHealth = this.getSystemHealth();
      const serverHealth = await this.getServerHealth();
      const configHealth = this.getConfigurationHealth();

      const overallStatus = this.determineOverallHealth(serverHealth, configHealth);

      return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        version: MCP_SERVER_VERSION,
        system: systemHealth,
        servers: serverHealth,
        configuration: configHealth,
      };
    } catch (error) {
      logger.error('Health check failed:', error);
      throw error;
    }
  }

  /**
   * Get system health metrics
   */
  private getSystemHealth(): SystemHealth {
    const memUsage = process.memoryUsage();

    return {
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      memory: {
        used: Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100, // MB
        total: Math.round((memUsage.heapTotal / 1024 / 1024) * 100) / 100, // MB
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100 * 100) / 100,
      },
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };
  }

  /**
   * Get MCP server health status
   */
  private async getServerHealth(): Promise<HealthCheckResponse['servers']> {
    try {
      const serverManager = ServerManager.current;
      if (!serverManager) {
        return {
          total: 0,
          healthy: 0,
          unhealthy: 0,
          details: [],
        };
      }

      const clients = serverManager.getClients();
      const serverDetails: McpServerHealth[] = [];
      let healthyCount = 0;
      let unhealthyCount = 0;

      for (const [name, clientInfo] of clients.entries()) {
        const isHealthy = clientInfo.status === ClientStatus.Connected;

        if (isHealthy) {
          healthyCount++;
        } else {
          unhealthyCount++;
        }

        serverDetails.push({
          name,
          status: clientInfo.status,
          healthy: isHealthy,
          lastConnected: clientInfo.lastConnected,
          lastError: clientInfo.lastError?.message,
          tags: clientInfo.transport.tags,
        });
      }

      return {
        total: clients.size,
        healthy: healthyCount,
        unhealthy: unhealthyCount,
        details: serverDetails,
      };
    } catch (error) {
      logger.error('Error getting server health:', error);
      return {
        total: 0,
        healthy: 0,
        unhealthy: 0,
        details: [],
      };
    }
  }

  /**
   * Get configuration health status
   */
  private getConfigurationHealth(): HealthCheckResponse['configuration'] {
    try {
      const mcpConfig = McpConfigManager.getInstance();
      const agentConfig = AgentConfigManager.getInstance();

      const config = mcpConfig.getTransportConfig();
      const serverCount = Object.keys(config).length;
      const enabledCount = Object.values(config).filter((server) => !server.disabled).length;
      const disabledCount = serverCount - enabledCount;

      return {
        loaded: true,
        serverCount,
        enabledCount,
        disabledCount,
        authEnabled: agentConfig.isAuthEnabled(),
        transport: 'http', // Since this is the HTTP transport layer
      };
    } catch (error) {
      logger.error('Error getting configuration health:', error);
      return {
        loaded: false,
        serverCount: 0,
        enabledCount: 0,
        disabledCount: 0,
        authEnabled: false,
        transport: 'unknown',
      };
    }
  }

  /**
   * Determine overall health status based on component status
   */
  private determineOverallHealth(
    serverHealth: { total: number; healthy: number; unhealthy: number },
    configHealth: { loaded: boolean },
  ): HealthStatus {
    // Configuration must be loaded
    if (!configHealth.loaded) {
      return HealthStatus.UNHEALTHY;
    }

    // If no servers are configured, system is healthy but degraded
    if (serverHealth.total === 0) {
      return HealthStatus.DEGRADED;
    }

    // If all servers are healthy, system is healthy
    if (serverHealth.healthy === serverHealth.total) {
      return HealthStatus.HEALTHY;
    }

    // If more than half servers are healthy, system is degraded
    if (serverHealth.healthy > serverHealth.total / 2) {
      return HealthStatus.DEGRADED;
    }

    // If less than half servers are healthy, system is unhealthy
    return HealthStatus.UNHEALTHY;
  }

  /**
   * Get HTTP status code based on health status
   */
  public getHttpStatusCode(healthStatus: HealthStatus): number {
    switch (healthStatus) {
      case HealthStatus.HEALTHY:
        return 200;
      case HealthStatus.DEGRADED:
        return 200; // Still operational, but with warnings
      case HealthStatus.UNHEALTHY:
        return 503; // Service unavailable
      default:
        return 500; // Internal server error
    }
  }
}

export default HealthService;
