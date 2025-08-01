import { Request, Response, NextFunction } from 'express';
import logger from '../../../logger/logger.js';
import { McpLoadingManager } from '../../../core/loading/mcpLoadingManager.js';
import { LoadingState } from '../../../core/loading/loadingStateTracker.js';
import { getValidatedTags } from './scopeAuthMiddleware.js';

/**
 * Extended request interface to include MCP loading information
 */
export interface McpRequest extends Request {
  mcpAvailability?: {
    availableServers: string[];
    unavailableServers: string[];
    loadingServers: string[];
    oauthRequiredServers: string[];
    hasPartialAvailability: boolean;
    allServersReady: boolean;
  };
}

/**
 * Middleware options for MCP availability checking
 */
export interface McpAvailabilityOptions {
  /** Whether to allow requests when some servers are still loading */
  allowPartialAvailability?: boolean;
  /** Whether to include OAuth-required servers as available */
  includeOAuthServers?: boolean;
  /** Custom error message for unavailable servers */
  unavailableMessage?: string;
  /** Custom error message for loading servers */
  loadingMessage?: string;
}

/**
 * Default options for MCP availability middleware
 */
const DEFAULT_OPTIONS: Required<McpAvailabilityOptions> = {
  allowPartialAvailability: true,
  includeOAuthServers: false,
  unavailableMessage: 'Some requested MCP servers are not available',
  loadingMessage: 'Some requested MCP servers are still loading',
};

/**
 * Creates middleware that checks MCP server availability before processing requests
 *
 * This middleware examines the loading state of MCP servers and provides different
 * behaviors based on server availability and configuration options.
 *
 * @param loadingManager - The MCP loading manager instance
 * @param options - Configuration options for availability checking
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * const availabilityMiddleware = createMcpAvailabilityMiddleware(loadingManager, {
 *   allowPartialAvailability: true,
 *   includeOAuthServers: false,
 * });
 *
 * router.post('/mcp', availabilityMiddleware, (req, res) => {
 *   // Handle MCP request with availability info in req.mcpAvailability
 * });
 * ```
 */
export function createMcpAvailabilityMiddleware(
  loadingManager?: McpLoadingManager,
  options: McpAvailabilityOptions = {},
) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return (req: McpRequest, res: Response, next: NextFunction) => {
    try {
      // If no loading manager, assume all servers are available (legacy mode)
      if (!loadingManager) {
        logger.debug('No loading manager - assuming all servers available');
        next();
        return;
      }

      // Get requested tags from scope auth middleware
      const requestedTags = getValidatedTags(res);

      // If no specific tags requested, get all servers
      const stateTracker = loadingManager.getStateTracker();
      const allStates = stateTracker.getAllServerStates();

      // Filter servers based on requested tags
      let relevantServers: string[];
      if (requestedTags && requestedTags.length > 0) {
        // TODO: Implement tag-based filtering based on server configuration
        // For now, include all servers if tags are specified
        relevantServers = Array.from(allStates.keys());
        logger.debug(`Checking availability for servers with tags: ${requestedTags.join(', ')}`);
      } else {
        relevantServers = Array.from(allStates.keys());
        logger.debug(`Checking availability for all ${relevantServers.length} servers`);
      }

      // Categorize servers by state
      const availableServers: string[] = [];
      const unavailableServers: string[] = [];
      const loadingServers: string[] = [];
      const oauthRequiredServers: string[] = [];

      for (const serverName of relevantServers) {
        const serverInfo = stateTracker.getServerState(serverName);
        if (!serverInfo) {
          unavailableServers.push(serverName);
          continue;
        }

        switch (serverInfo.state) {
          case LoadingState.Ready:
            availableServers.push(serverName);
            break;
          case LoadingState.Loading:
          case LoadingState.Pending:
            loadingServers.push(serverName);
            break;
          case LoadingState.AwaitingOAuth:
            if (opts.includeOAuthServers) {
              availableServers.push(serverName);
            } else {
              oauthRequiredServers.push(serverName);
            }
            break;
          case LoadingState.Failed:
          case LoadingState.Cancelled:
          default:
            unavailableServers.push(serverName);
            break;
        }
      }

      // Calculate availability metrics
      const hasPartialAvailability = availableServers.length > 0;
      const allServersReady = relevantServers.length > 0 && availableServers.length === relevantServers.length;

      // Add availability info to request
      req.mcpAvailability = {
        availableServers,
        unavailableServers,
        loadingServers,
        oauthRequiredServers,
        hasPartialAvailability,
        allServersReady,
      };

      // Log availability status
      logger.debug(
        `MCP Availability: ${availableServers.length}/${relevantServers.length} ready, ` +
          `${loadingServers.length} loading, ${unavailableServers.length} failed, ` +
          `${oauthRequiredServers.length} OAuth required`,
      );

      // Decide whether to proceed based on availability
      if (relevantServers.length === 0) {
        // No servers configured - proceed normally
        next();
        return;
      }

      if (allServersReady) {
        // All servers ready - proceed normally
        next();
        return;
      }

      if (!hasPartialAvailability) {
        // No servers available - return error
        logger.warn('No MCP servers available for request');
        res.status(503).json({
          error: 'service_unavailable',
          message: 'No MCP servers are currently available',
          details: {
            total: relevantServers.length,
            available: availableServers.length,
            loading: loadingServers.length,
            failed: unavailableServers.length,
            oauthRequired: oauthRequiredServers.length,
          },
          loading: {
            isComplete: stateTracker.isLoadingComplete(),
            summary: loadingManager.getSummary(),
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (opts.allowPartialAvailability) {
        // Some servers available - proceed with warning
        logger.info(
          `Proceeding with partial MCP availability: ${availableServers.length}/${relevantServers.length} servers ready`,
        );

        // Add warning headers
        res.setHeader('X-MCP-Partial-Availability', 'true');
        res.setHeader('X-MCP-Available-Count', availableServers.length.toString());
        res.setHeader('X-MCP-Total-Count', relevantServers.length.toString());

        if (loadingServers.length > 0) {
          res.setHeader('X-MCP-Loading-Count', loadingServers.length.toString());
        }

        next();
        return;
      } else {
        // Partial availability not allowed - return error
        logger.warn('Partial MCP availability not allowed - blocking request');

        const primaryReason = loadingServers.length > 0 ? 'loading' : 'unavailable';
        const message = primaryReason === 'loading' ? opts.loadingMessage : opts.unavailableMessage;

        res.status(primaryReason === 'loading' ? 202 : 503).json({
          error: primaryReason === 'loading' ? 'servers_loading' : 'servers_unavailable',
          message,
          details: {
            total: relevantServers.length,
            available: availableServers.length,
            loading: loadingServers.length,
            failed: unavailableServers.length,
            oauthRequired: oauthRequiredServers.length,
            availableList: availableServers,
            loadingList: loadingServers,
            failedList: unavailableServers,
            oauthRequiredList: oauthRequiredServers,
          },
          loading: {
            isComplete: stateTracker.isLoadingComplete(),
            summary: loadingManager.getSummary(),
          },
          retryAfter: primaryReason === 'loading' ? 30 : undefined, // Suggest retry in 30 seconds for loading
          timestamp: new Date().toISOString(),
        });
        return;
      }
    } catch (error) {
      logger.error('MCP availability check failed:', error);

      // On error, proceed normally to avoid blocking requests
      // This ensures the system remains functional even if availability checking fails
      next();
    }
  };
}

/**
 * Utility function to get MCP availability info from request
 */
export function getMcpAvailability(req: Request) {
  return (req as McpRequest).mcpAvailability;
}

/**
 * Utility function to check if all MCP servers are ready
 */
export function areAllMcpServersReady(req: Request): boolean {
  const availability = getMcpAvailability(req);
  return availability?.allServersReady ?? true; // Assume ready if no availability info
}

/**
 * Utility function to get list of available MCP servers
 */
export function getAvailableMcpServers(req: Request): string[] {
  const availability = getMcpAvailability(req);
  return availability?.availableServers ?? [];
}

/**
 * Utility function to get list of loading MCP servers
 */
export function getLoadingMcpServers(req: Request): string[] {
  const availability = getMcpAvailability(req);
  return availability?.loadingServers ?? [];
}
