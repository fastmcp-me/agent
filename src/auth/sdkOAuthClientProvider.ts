import { randomUUID } from 'node:crypto';
import { OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js';
import type {
  OAuthClientMetadata,
  OAuthClientInformationFull,
  OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import logger from '../logger/logger.js';
import { SessionManager } from './sessionManager.js';
import { AUTH_CONFIG } from '../constants.js';

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
 * SDK-compatible OAuth client provider that replaces the custom implementation.
 *
 * This provider implements the OAuth 2.1 Authorization Code Grant flow using
 * the SDK's OAuthClientProvider interface while maintaining compatibility with
 * the existing session storage system.
 */
export class SDKOAuthClientProvider implements OAuthClientProvider {
  private _redirectUrl: string;
  private _clientMetadata: OAuthClientMetadata;
  private _clientInfo?: OAuthClientInformationFull;
  private _tokens?: OAuthTokens;
  private _codeVerifier?: string;
  private _state?: string;
  private sessionManager: SessionManager;
  private serverName: string;
  private config: OAuthClientConfig;

  constructor(serverName: string, config: OAuthClientConfig, sessionStoragePath?: string) {
    this.serverName = serverName;
    this.config = config;
    this.sessionManager = new SessionManager(sessionStoragePath);

    // Set up redirect URL - use provided URL or default to local callback
    this._redirectUrl = config.redirectUrl || AUTH_CONFIG.CLIENT.OAUTH.DEFAULT_REDIRECT_URL;

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
    const clientInfoKey = `${AUTH_CONFIG.CLIENT.PREFIXES.CLIENT}${this.serverName}`;
    const tokensKey = `${AUTH_CONFIG.CLIENT.PREFIXES.TOKENS}${this.serverName}`;
    const codeVerifierKey = `${AUTH_CONFIG.CLIENT.PREFIXES.VERIFIER}${this.serverName}`;
    const stateKey = `${AUTH_CONFIG.CLIENT.PREFIXES.STATE}${this.serverName}`;

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
      const key = `${AUTH_CONFIG.CLIENT.PREFIXES.CLIENT}${this.serverName}`;
      // Store for 30 days
      const ttlMs = AUTH_CONFIG.CLIENT.OAUTH.TTL_MS;
      this.sessionManager.createSessionWithData(key, JSON.stringify(this._clientInfo), ttlMs);
    }
  }

  /**
   * Persist OAuth tokens to session storage
   */
  private persistTokens(): void {
    if (this._tokens) {
      const key = `${AUTH_CONFIG.CLIENT.PREFIXES.TOKENS}${this.serverName}`;
      // Use token's expires_in or default to 1 hour
      const ttlMs = (this._tokens.expires_in || AUTH_CONFIG.CLIENT.OAUTH.DEFAULT_TOKEN_EXPIRY_SECONDS) * 1000;
      this.sessionManager.createSessionWithData(key, JSON.stringify(this._tokens), ttlMs);
    }
  }

  /**
   * Persist code verifier to session storage
   */
  private persistCodeVerifier(): void {
    if (this._codeVerifier) {
      const key = `${AUTH_CONFIG.CLIENT.PREFIXES.VERIFIER}${this.serverName}`;
      // Code verifier valid for 10 minutes
      const ttlMs = AUTH_CONFIG.CLIENT.OAUTH.CODE_VERIFIER_TTL_MS;
      this.sessionManager.createSessionWithData(key, this._codeVerifier, ttlMs);
    }
  }

  /**
   * Persist OAuth state to session storage
   */
  private persistState(): void {
    if (this._state) {
      const key = `${AUTH_CONFIG.CLIENT.PREFIXES.STATE}${this.serverName}`;
      // State valid for 10 minutes
      const ttlMs = AUTH_CONFIG.CLIENT.OAUTH.STATE_TTL_MS;
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
   * Clean up resources
   */
  shutdown(): void {
    // Clean up any temporary session data
    const keys = [
      `${AUTH_CONFIG.CLIENT.PREFIXES.VERIFIER}${this.serverName}`,
      `${AUTH_CONFIG.CLIENT.PREFIXES.STATE}${this.serverName}`,
    ];

    keys.forEach((key) => {
      this.sessionManager.deleteSession(key);
    });
  }
}
