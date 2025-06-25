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

export class ExpressServer {
  private app: express.Application;
  private serverManager: ServerManager;
  private authManager: AuthManager;
  private configManager: ServerConfigManager;

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

  private setupMiddleware(): void {
    this.app.use(cors()); // Allow all origins for local dev
    this.app.use(bodyParser.json());

    // Add error handling middleware
    this.app.use(errorHandler);
  }

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

  public start(port: number, host: string): void {
    this.app.listen(port, host, () => {
      const authStatus = this.authManager.isAuthEnabled() ? 'with authentication' : 'without authentication';
      logger.info(`Server is running on port ${port} with HTTP/SSE and Streamable HTTP transport ${authStatus}`);
    });
  }

  public shutdown(): void {
    this.authManager.shutdown();
  }
}
