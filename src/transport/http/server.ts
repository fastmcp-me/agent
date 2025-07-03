import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
import logger from '../../logger/logger.js';
import errorHandler from './errorHandler.js';
import { ServerManager } from '../../core/server/serverManager.js';
import { SDKOAuthProvider } from '../../auth/sdkOAuthProvider.js';
import { setupStreamableHttpRoutes } from './routes/streamableHttpRoutes.js';
import { setupSseRoutes } from './routes/sseRoutes.js';
import { ServerConfigManager } from '../../core/server/serverConfig.js';

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
  private oauthProvider: SDKOAuthProvider;
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

    // Initialize OAuth provider with custom session storage path if configured
    const sessionStoragePath = this.configManager.getSessionStoragePath();
    this.oauthProvider = new SDKOAuthProvider(sessionStoragePath);

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
    this.app.use(bodyParser.urlencoded({ extended: true }));

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
    // Setup OAuth routes using SDK's mcpAuthRouter
    const { host, port } = this.configManager.getConfig();
    const issuerUrl = new URL(`http://${host}:${port}`);
    const authRouter = mcpAuthRouter({
      provider: this.oauthProvider,
      issuerUrl,
    });
    this.app.use(authRouter);

    // Create auth middleware using SDK's requireBearerAuth
    const authMiddleware = this.configManager.isAuthEnabled()
      ? requireBearerAuth({ verifier: this.oauthProvider })
      : (req: express.Request, res: express.Response, next: express.NextFunction) => next();

    // Setup MCP transport routes with auth middleware
    setupStreamableHttpRoutes(this.app, this.serverManager, authMiddleware);
    setupSseRoutes(this.app, this.serverManager, authMiddleware);

    // Log authentication status
    if (this.configManager.isAuthEnabled()) {
      logger.info('Authentication enabled - OAuth 2.1 endpoints available via SDK');
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
  public start(): void {
    const { port, host } = this.configManager.getConfig();
    this.app.listen(port, host, () => {
      const authStatus = this.configManager.isAuthEnabled() ? 'with authentication' : 'without authentication';
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
    this.oauthProvider.shutdown();
  }
}
