import { randomUUID } from 'node:crypto';
import { OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js';
import type {
  OAuthClientMetadata,
  OAuthClientInformationFull,
  OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import logger from '../logger/logger.js';
import { SessionManager } from './sessionManager.js';

/**
 * OAuth client configuration for connecting to downstream MCP servers
 */
export interface OAuthClientConfig {
  clientId?: string;
  clientSecret?: string;
  scopes?: string[];
  autoRegister?: boolean;
  redirectUrl?: string;
}

/**
 * OAuth client provider for MCP SDK that handles authentication
 * when connecting to downstream MCP servers that require OAuth.
 *
 * This provider implements the OAuth 2.1 Authorization Code Grant flow
 * as specified in the MCP Authorization specification:
 * https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization
 *
 * Flow Overview:
 * 1. When connecting to an OAuth-protected MCP server, the transport will
 *    attempt to use existing tokens first
 * 2. If no valid tokens exist, the provider will redirect the user to
 *    the authorization server (by printing a URL to the console)
 * 3. After user authorization, the browser redirects to the callback URL
 *    with an authorization code
 * 4. The MCP SDK exchanges the code for access tokens automatically
 * 5. Tokens are persisted using the existing SessionManager infrastructure
 *
 * Configuration Example:
 * ```json
 * {
 *   "oauth-server": {
 *     "type": "http",
 *     "url": "https://api.example.com/mcp",
 *     "oauth": {
 *       "clientId": "your-client-id",
 *       "clientSecret": "your-client-secret",
 *       "scopes": ["read", "write"],
 *       "autoRegister": true,
 *       "redirectUrl": "http://localhost:3050/oauth/callback"
 *     }
 *   }
 * }
 * ```
 *
 * The provider supports both pre-registered clients (with clientId/clientSecret)
 * and dynamic client registration (when autoRegister is true).
 */
export class MCPOAuthClientProvider implements OAuthClientProvider {
  private _redirectUrl: string;
  private _clientMetadata: OAuthClientMetadata;
  private _clientInfo?: OAuthClientInformationFull;
  private _tokens?: OAuthTokens;
  private _codeVerifier?: string;
  private _state?: string;
  private sessionManager: SessionManager;
  private serverName: string;
  private config: OAuthClientConfig;
  public authorizationCodeResolver?: (code: string) => void;
  public authorizationCodePromise?: Promise<string>;

  constructor(serverName: string, config: OAuthClientConfig, sessionStoragePath?: string) {
    this.serverName = serverName;
    this.config = config;
    this.sessionManager = new SessionManager(sessionStoragePath);

    // Set up redirect URL - use provided URL or default to local callback
    this._redirectUrl = config.redirectUrl || 'http://localhost:3000/oauth/callback';

    // Set up client metadata for registration
    this._clientMetadata = {
      redirect_uris: [this._redirectUrl],
      client_name: `1MCP Agent - ${serverName}`,
      token_endpoint_auth_method: config.clientSecret ? 'client_secret_basic' : 'none',
      grant_types: ['authorization_code'],
      response_types: ['code'],
      scope: config.scopes?.join(' ') || 'openid',
    };

    // Load existing client info and tokens if available
    this.loadPersistedData();
  }

  get redirectUrl(): string {
    return this._redirectUrl;
  }

  get clientMetadata(): OAuthClientMetadata {
    return this._clientMetadata;
  }

  /**
   * Returns current client registration information
   */
  clientInformation(): OAuthClientInformationFull | undefined {
    return this._clientInfo;
  }

  /**
   * Saves client registration information from dynamic registration
   */
  saveClientInformation(clientInfo: OAuthClientInformationFull): void {
    this._clientInfo = clientInfo;
    this.persistClientInfo();
    logger.info(`OAuth client registered for ${this.serverName}: ${clientInfo.client_id}`);
  }

  /**
   * Returns current OAuth tokens
   */
  tokens(): OAuthTokens | undefined {
    return this._tokens;
  }

  /**
   * Saves OAuth tokens after successful authorization
   */
  saveTokens(tokens: OAuthTokens): void {
    this._tokens = tokens;
    this.persistTokens();
    logger.info(`OAuth tokens saved for ${this.serverName}`);
  }

  /**
   * Redirects user to authorization server
   * In console application, this prints the URL for user to open
   */
  redirectToAuthorization(authorizationUrl: URL): void {
    logger.info(`OAuth authorization required for ${this.serverName}`);

    // Create a promise that will be resolved when the authorization code is received
    this.authorizationCodePromise = new Promise<string>((resolve) => {
      this.authorizationCodeResolver = resolve;
    });

    // Register this provider instance for callback handling
    OAuthCallbackRegistry.registerProvider(this.serverName, this);

    console.log('\n=== OAUTH AUTHORIZATION REQUIRED ===');
    console.log(`Server: ${this.serverName}`);
    console.log(`Please open this URL in your browser to authorize:`);
    console.log(`\n${authorizationUrl.toString()}\n`);
    console.log('After authorization, the browser will redirect back to complete the OAuth flow.');
    console.log('=====================================\n');
  }

  /**
   * Saves PKCE code verifier for the authorization session
   */
  saveCodeVerifier(codeVerifier: string): void {
    this._codeVerifier = codeVerifier;
    this.persistCodeVerifier();
  }

  /**
   * Returns the PKCE code verifier for token exchange
   */
  codeVerifier(): string | Promise<string> {
    return this._codeVerifier || '';
  }

  /**
   * Returns the OAuth state parameter for CSRF protection
   */
  state(): string | Promise<string> {
    if (!this._state) {
      this._state = randomUUID();
      this.persistState();
    }
    return this._state;
  }

  /**
   * Custom resource validation (optional)
   */
  async validateResourceURL(serverUrl: string | URL, resource?: string): Promise<URL | undefined> {
    const url = typeof serverUrl === 'string' ? new URL(serverUrl) : serverUrl;
    // Basic validation - can be extended for specific requirements
    if (resource && !resource.startsWith(url.origin)) {
      return undefined;
    }
    return url;
  }

  /**
   * Load persisted OAuth data from session storage
   */
  private loadPersistedData(): void {
    const clientInfoKey = `oauth_client_${this.serverName}`;
    const tokensKey = `oauth_tokens_${this.serverName}`;
    const codeVerifierKey = `oauth_code_verifier_${this.serverName}`;
    const stateKey = `oauth_state_${this.serverName}`;

    // Load client info
    const clientInfoSession = this.sessionManager.getSession(clientInfoKey);
    if (clientInfoSession?.data) {
      this._clientInfo = JSON.parse(clientInfoSession.data);
    }

    // Load tokens
    const tokensSession = this.sessionManager.getSession(tokensKey);
    if (tokensSession?.data) {
      this._tokens = JSON.parse(tokensSession.data);

      // Check if tokens are expired
      if (this._tokens && this.isTokenExpired(this._tokens)) {
        logger.warn(`OAuth tokens expired for ${this.serverName}, clearing`);
        this._tokens = undefined;
        this.sessionManager.deleteSession(tokensKey);
      }
    }

    // Load code verifier
    const codeVerifierSession = this.sessionManager.getSession(codeVerifierKey);
    if (codeVerifierSession?.data) {
      this._codeVerifier = codeVerifierSession.data;
    }

    // Load state
    const stateSession = this.sessionManager.getSession(stateKey);
    if (stateSession?.data) {
      this._state = stateSession.data;
    }
  }

  /**
   * Persist client information to session storage
   */
  private persistClientInfo(): void {
    if (this._clientInfo) {
      const key = `oauth_client_${this.serverName}`;
      // Store for 30 days
      const ttlMs = 30 * 24 * 60 * 60 * 1000;
      this.sessionManager.createSessionWithData(key, JSON.stringify(this._clientInfo), ttlMs);
    }
  }

  /**
   * Persist OAuth tokens to session storage
   */
  private persistTokens(): void {
    if (this._tokens) {
      const key = `oauth_tokens_${this.serverName}`;
      // Use token's expires_in or default to 1 hour
      const ttlMs = (this._tokens.expires_in || 3600) * 1000;
      this.sessionManager.createSessionWithData(key, JSON.stringify(this._tokens), ttlMs);
    }
  }

  /**
   * Persist code verifier to session storage
   */
  private persistCodeVerifier(): void {
    if (this._codeVerifier) {
      const key = `oauth_code_verifier_${this.serverName}`;
      // Code verifier valid for 10 minutes
      const ttlMs = 10 * 60 * 1000;
      this.sessionManager.createSessionWithData(key, this._codeVerifier, ttlMs);
    }
  }

  /**
   * Persist OAuth state to session storage
   */
  private persistState(): void {
    if (this._state) {
      const key = `oauth_state_${this.serverName}`;
      // State valid for 10 minutes
      const ttlMs = 10 * 60 * 1000;
      this.sessionManager.createSessionWithData(key, this._state, ttlMs);
    }
  }

  /**
   * Check if OAuth tokens are expired
   */
  private isTokenExpired(tokens: OAuthTokens): boolean {
    if (!tokens.expires_in) {
      return false; // No expiration info, assume valid
    }

    // This is a simple check - in practice, you might want to store the issued_at time
    // For now, we'll rely on the session storage TTL for expiration
    return false;
  }

  /**
   * Handle the OAuth authorization code callback
   * This method is called by the callback registry when an authorization code is received
   */
  async handleAuthorizationCallback(code: string, state?: string): Promise<boolean> {
    try {
      // Validate state if provided
      if (state && this._state && state !== this._state) {
        logger.error(`OAuth state mismatch for ${this.serverName}: expected ${this._state}, got ${state}`);
        return false;
      }

      // Resolve the authorization code promise to notify the MCP SDK
      if (this.authorizationCodeResolver) {
        this.authorizationCodeResolver(code);
        logger.info(`OAuth authorization code delivered to MCP SDK for ${this.serverName}`);
        return true;
      } else {
        logger.warn(`No authorization code resolver waiting for ${this.serverName}`);
        return false;
      }
    } catch (error) {
      logger.error(`Error handling OAuth callback for ${this.serverName}:`, error);
      return false;
    }
  }

  /**
   * Clean up resources
   */
  shutdown(): void {
    // Unregister from callback registry
    OAuthCallbackRegistry.unregisterProvider(this.serverName);

    // Clean up any temporary session data
    const keys = [`oauth_code_verifier_${this.serverName}`, `oauth_state_${this.serverName}`];

    keys.forEach((key) => {
      this.sessionManager.deleteSession(key);
    });
  }
}

/**
 * Registry for managing OAuth callback handlers
 * This allows the HTTP callback route to notify the correct OAuth provider instance
 */
class OAuthCallbackRegistry {
  private static providers = new Map<string, MCPOAuthClientProvider>();

  static registerProvider(serverName: string, provider: MCPOAuthClientProvider): void {
    this.providers.set(serverName, provider);
    logger.debug(`Registered OAuth provider for ${serverName}`);
  }

  static unregisterProvider(serverName: string): void {
    this.providers.delete(serverName);
    logger.debug(`Unregistered OAuth provider for ${serverName}`);
  }

  static async handleCallback(code: string, state?: string): Promise<boolean> {
    // Try to find the provider that matches the state
    if (state) {
      for (const [serverName, provider] of this.providers.entries()) {
        const providerState = await provider.state();
        if (providerState === state) {
          logger.info(`Found matching OAuth provider for state: ${serverName}`);
          return await provider.handleAuthorizationCallback(code, state);
        }
      }
    }

    // If no state match, try all providers (first successful one wins)
    for (const [serverName, provider] of this.providers.entries()) {
      try {
        const success = await provider.handleAuthorizationCallback(code, state);
        if (success) {
          logger.info(`OAuth callback handled by provider: ${serverName}`);
          return true;
        }
      } catch (error) {
        logger.debug(`Provider ${serverName} could not handle callback:`, error);
      }
    }

    logger.warn('No OAuth provider could handle the authorization callback');
    return false;
  }

  static getRegisteredProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  static async getAuthorizationCode(serverName: string): Promise<string | null> {
    const provider = this.providers.get(serverName);
    if (!provider) {
      return null;
    }

    // Wait for the authorization code promise if it exists
    if (provider.authorizationCodePromise) {
      try {
        const authCode = await provider.authorizationCodePromise;
        // Clean up the promise after use
        provider.authorizationCodePromise = undefined;
        provider.authorizationCodeResolver = undefined;
        return authCode;
      } catch (error) {
        logger.error(`Error waiting for authorization code for ${serverName}:`, error);
        return null;
      }
    }

    return null;
  }
}

// Export the registry for use in OAuth routes
export { OAuthCallbackRegistry };
