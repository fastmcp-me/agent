import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { ServerManager } from '../serverManager.js';
import logger from '../logger/logger.js';
import errorHandler from './errorHandler.js';
import { AuthManager } from './auth/authManager.js';
import { createAuthMiddleware } from './auth/authMiddleware.js';
import { setupOAuthRoutes } from './routes/oauthRoutes.js';
import { setupStreamableHttpRoutes } from './routes/streamableHttpRoutes.js';
import { setupSseRoutes } from './routes/sseRoutes.js';
import { ServerConfigManager } from './config/serverConfig.js';

/**
 * ExpressServer orchestrates the HTTP/SSE transport layer for the MCP server.
 *
 * This class manages the Express application, authentication, and route setup.
 * It provides both HTTP and SSE transport options with optional OAuth 2.1 authentication.
 *
 * @example
 * ```typescript
 * const serverManager = await setupServer();
 * const expressServer = new ExpressServer(serverManager);
 * expressServer.start(3050, 'localhost');
 * ```
 */
export class ExpressServer {
  private app: express.Application;
  private serverManager: ServerManager;
  private authManager: AuthManager;
  private configManager: ServerConfigManager;

  /**
   * Creates a new ExpressServer instance.
   *
   * Initializes the Express application, sets up middleware, authentication,
   * and configures all routes for MCP transport and OAuth endpoints.
   *
   * @param serverManager - The server manager instance for handling MCP operations
   */
  constructor(serverManager: ServerManager) {
    this.app = express();
    this.serverManager = serverManager;
    this.configManager = ServerConfigManager.getInstance();

    // Initialize auth manager with custom session storage path if configured
    const sessionStoragePath = this.configManager.getSessionStoragePath();
    this.authManager = new AuthManager(sessionStoragePath);

    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Sets up Express middleware including CORS, body parsing, and error handling.
   *
   * Configures the basic middleware stack required for the MCP server:
   * - CORS for cross-origin requests
   * - JSON body parsing
   * - Global error handling
   */
  private setupMiddleware(): void {
    this.app.use(cors()); // Allow all origins for local dev
    this.app.use(bodyParser.json());

    // Add error handling middleware
    this.app.use(errorHandler);
  }

  /**
   * Sets up all application routes including OAuth and MCP transport endpoints.
   *
   * Configures the following route groups:
   * - OAuth 2.1 endpoints (always available, auth can be disabled)
   * - Streamable HTTP transport routes with authentication middleware
   * - SSE transport routes with authentication middleware
   *
   * Logs the authentication status for debugging purposes.
   */
  private setupRoutes(): void {
    // Create auth middleware
    const authMiddleware = createAuthMiddleware(this.authManager);

    // Setup OAuth routes (always available, but auth can be disabled)
    setupOAuthRoutes(this.app, this.authManager);

    // Setup MCP transport routes with auth middleware
    setupStreamableHttpRoutes(this.app, this.serverManager, authMiddleware);
    setupSseRoutes(this.app, this.serverManager, authMiddleware);

    // Log authentication status
    if (this.authManager.isAuthEnabled()) {
      logger.info('Authentication enabled - OAuth 2.1 endpoints available');
    } else {
      logger.info('Authentication disabled - all endpoints accessible without auth');
    }
  }

  /**
   * Starts the Express server on the specified port and host.
   *
   * Binds the Express application to the network interface and logs
   * the server status including authentication configuration.
   *
   * @param port - The port number to listen on
   * @param host - The host address to bind to
   */
  public start(port: number, host: string): void {
    this.app.listen(port, host, () => {
      const authStatus = this.authManager.isAuthEnabled() ? 'with authentication' : 'without authentication';
      logger.info(`Server is running on port ${port} with HTTP/SSE and Streamable HTTP transport ${authStatus}`);
    });
  }

  /**
   * Performs graceful shutdown of the Express server.
   *
   * Cleans up resources including:
   * - Authentication manager shutdown
   * - Session cleanup
   * - Timer cleanup
   */
  public shutdown(): void {
    this.authManager.shutdown();
  }
}
