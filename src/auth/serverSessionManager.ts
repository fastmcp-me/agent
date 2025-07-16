import fs from 'fs';
import path from 'path';
import { randomUUID } from 'node:crypto';
import logger from '../logger/logger.js';
import { AUTH_CONFIG, getGlobalConfigDir } from '../constants.js';
import { SessionData, AuthCodeData, ClientData, AuthRequestData } from './sessionTypes.js';
import { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js';

/**
 * SessionManager handles file-based session storage with automatic cleanup.
 *
 * This class manages OAuth 2.1 sessions and authorization codes using
 * the local filesystem. It provides automatic cleanup of expired sessions
 * and supports configurable storage locations.
 *
 * Features:
 * - File-based session storage with JSON format
 * - Automatic cleanup of expired sessions every 5 minutes
 * - Prefixed identifiers for easy debugging
 * - Configurable storage directory
 *
 * @example
 * ```typescript
 * const sessionManager = new SessionManager('/custom/path');
 * const sessionId = sessionManager.createSession('client-123', 'resource', 3600000);
 * const session = sessionManager.getSession(sessionId);
 * ```
 */
export class ServerSessionManager {
  private sessionStoragePath: string;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Creates a new SessionManager instance.
   *
   * Initializes the session storage directory and starts the automatic
   * cleanup process for expired sessions.
   *
   * @param sessionStoragePath - Optional custom path for session storage
   */
  constructor(sessionStoragePath?: string) {
    this.sessionStoragePath = sessionStoragePath || path.join(getGlobalConfigDir(), AUTH_CONFIG.SERVER.STORAGE.DIR);
    this.ensureSessionDirectory();
    this.startCleanupInterval();
  }

  /**
   * Gets the session storage path.
   *
   * @returns The absolute path to the session storage directory
   */
  public getSessionStoragePath(): string {
    return this.sessionStoragePath;
  }

  /**
   * Ensures the session storage directory exists.
   *
   * Creates the directory structure if it doesn't exist, including
   * parent directories as needed.
   *
   * @throws Error if directory creation fails
   */
  private ensureSessionDirectory(): void {
    try {
      if (!fs.existsSync(this.sessionStoragePath)) {
        fs.mkdirSync(this.sessionStoragePath, { recursive: true });
        logger.info(`Created session storage directory: ${this.sessionStoragePath}`);
      }
    } catch (error) {
      logger.error(`Failed to create session directory: ${error}`);
      throw error;
    }
  }

  /**
   * Gets the file path for a session ID.
   *
   * @param sessionId - The session identifier
   * @returns Full file path for the session file
   */
  private getSessionFilePath(sessionId: string): string {
    // Validate session ID format first
    if (!this.isValidId(sessionId)) {
      throw new Error('Invalid session ID format');
    }

    const fileName = `${AUTH_CONFIG.SERVER.SESSION.FILE_PREFIX}${sessionId}${AUTH_CONFIG.SERVER.STORAGE.FILE_EXTENSION}`;
    const filePath = path.resolve(this.sessionStoragePath, fileName);

    // Additional security check: ensure resolved path is within session storage
    const normalizedStoragePath = path.resolve(this.sessionStoragePath);
    const normalizedFilePath = path.resolve(filePath);

    if (!normalizedFilePath.startsWith(normalizedStoragePath + path.sep)) {
      throw new Error('Invalid session file path: outside storage directory');
    }

    return filePath;
  }

  /**
   * Gets the file path for an authorization code.
   *
   * @param code - The authorization code
   * @returns Full file path for the auth code file
   */
  private getAuthCodeFilePath(code: string): string {
    // Validate auth code format first
    if (!this.isValidId(code)) {
      throw new Error('Invalid authorization code format');
    }

    const fileName = `${AUTH_CONFIG.SERVER.AUTH_CODE.FILE_PREFIX}${code}${AUTH_CONFIG.SERVER.STORAGE.FILE_EXTENSION}`;
    const filePath = path.resolve(this.sessionStoragePath, fileName);

    // Additional security check: ensure resolved path is within session storage
    const normalizedStoragePath = path.resolve(this.sessionStoragePath);
    const normalizedFilePath = path.resolve(filePath);

    if (!normalizedFilePath.startsWith(normalizedStoragePath + path.sep)) {
      throw new Error('Invalid authorization code path: outside storage directory');
    }

    return filePath;
  }

  /**
   * Gets the file path for an authorization request.
   *
   * @param authRequestId - The authorization request identifier
   * @returns Full file path for the auth request file
   */
  private getAuthRequestFilePath(authRequestId: string): string {
    // Validate auth request ID format first
    if (!this.isValidId(authRequestId)) {
      throw new Error('Invalid authorization request ID format');
    }

    const fileName = `${AUTH_CONFIG.SERVER.AUTH_REQUEST.FILE_PREFIX}${authRequestId}${AUTH_CONFIG.SERVER.STORAGE.FILE_EXTENSION}`;
    const filePath = path.resolve(this.sessionStoragePath, fileName);

    // Additional security check: ensure resolved path is within session storage
    const normalizedStoragePath = path.resolve(this.sessionStoragePath);
    const normalizedFilePath = path.resolve(filePath);

    if (!normalizedFilePath.startsWith(normalizedStoragePath + path.sep)) {
      throw new Error('Invalid authorization request path: outside storage directory');
    }

    return filePath;
  }

  /**
   * Utility to validate session IDs and auth codes for proper format and security.
   * Ensures proper format with prefix and UUID structure for security.
   * @param id - The session ID or auth code to validate
   * @returns true if valid, false otherwise
   */
  private isValidId(id: string): boolean {
    // Check minimum length (prefix + content)
    if (!id || id.length < 8) {
      return false;
    }

    // Check for valid server-side prefix
    const hasServerPrefix =
      id.startsWith(AUTH_CONFIG.SERVER.SESSION.ID_PREFIX) || id.startsWith(AUTH_CONFIG.SERVER.AUTH_CODE.ID_PREFIX);

    if (hasServerPrefix) {
      // Validate the UUID portion (after prefix)
      const uuidPart = id.startsWith(AUTH_CONFIG.SERVER.SESSION.ID_PREFIX)
        ? id.substring(AUTH_CONFIG.SERVER.SESSION.ID_PREFIX.length)
        : id.substring(AUTH_CONFIG.SERVER.AUTH_CODE.ID_PREFIX.length);

      // UUID v4 format: 8-4-4-4-12 hexadecimal digits with hyphens
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(uuidPart);
    }

    // Check for valid client-side OAuth prefix
    const hasClientPrefix =
      id.startsWith(AUTH_CONFIG.CLIENT.PREFIXES.CLIENT) ||
      id.startsWith(AUTH_CONFIG.CLIENT.PREFIXES.TOKENS) ||
      id.startsWith(AUTH_CONFIG.CLIENT.PREFIXES.VERIFIER) ||
      id.startsWith(AUTH_CONFIG.CLIENT.PREFIXES.STATE);

    if (hasClientPrefix) {
      const contentPart = id.substring(4); // All client prefixes are 4 characters
      return contentPart.length > 0 && /^[a-zA-Z0-9_-]+$/.test(contentPart);
    }

    return false;
  }

  /**
   * Creates a new session with the specified parameters.
   *
   * Generates a unique session ID with prefix, stores the session data
   * as a JSON file, and returns the session identifier.
   *
   * @param clientId - The client identifier
   * @param resource - The resource this session can access
   * @param scopes - The scopes this session grants access to
   * @param ttlMs - Time-to-live in milliseconds
   * @returns The generated session ID with prefix
   * @throws Error if session creation fails
   */
  public createSession(clientId: string, resource: string, scopes: string[], ttlMs: number): string {
    const sessionId = AUTH_CONFIG.SERVER.SESSION.ID_PREFIX + randomUUID();
    const sessionData: SessionData = {
      clientId,
      resource,
      scopes,
      expires: Date.now() + ttlMs,
      createdAt: Date.now(),
    };

    try {
      const filePath = this.getSessionFilePath(sessionId);
      fs.writeFileSync(filePath, JSON.stringify(sessionData, null, 2));
      logger.info(`Created session: ${sessionId} for client: ${clientId}`);
      return sessionId;
    } catch (error) {
      logger.error(`Failed to create session: ${error}`);
      throw error;
    }
  }

  /**
   * Retrieves session data by session ID.
   *
   * Reads the session file and validates expiration. If the session
   * is expired, it's automatically deleted and null is returned.
   *
   * @param sessionId - The session identifier to retrieve
   * @returns Session data if valid and not expired, null otherwise
   */
  public getSession(sessionId: string): SessionData | null {
    if (!this.isValidId(sessionId)) {
      logger.warn(`Rejected getSession with invalid sessionId: ${sessionId}`);
      return null;
    }
    try {
      const filePath = this.getSessionFilePath(sessionId);
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const data = fs.readFileSync(filePath, 'utf8');
      const sessionData: SessionData = JSON.parse(data);

      if (sessionData.expires < Date.now()) {
        this.deleteSession(sessionId);
        return null;
      }

      return sessionData;
    } catch (error) {
      logger.error(`Failed to read session ${sessionId}: ${error}`);
      return null;
    }
  }

  /**
   * Deletes a session by session ID.
   *
   * Removes the session file from the filesystem if it exists.
   *
   * @param sessionId - The session identifier to delete
   * @returns True if session was deleted, false if it didn't exist
   */
  public deleteSession(sessionId: string): boolean {
    if (!this.isValidId(sessionId)) {
      logger.warn(`Rejected deleteSession with invalid sessionId: ${sessionId}`);
      return false;
    }
    try {
      const filePath = this.getSessionFilePath(sessionId);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`Deleted session: ${sessionId}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Failed to delete session ${sessionId}: ${error}`);
      return false;
    }
  }

  /**
   * Creates a new authorization code for OAuth 2.1 flow.
   *
   * Generates a unique authorization code with prefix, stores the code data
   * as a JSON file, and returns the code identifier.
   *
   * @param clientId - The client identifier
   * @param redirectUri - The redirect URI for this code
   * @param resource - The resource this code grants access to
   * @param scopes - The scopes this code grants access to
   * @param ttlMs - Time-to-live in milliseconds
   * @param codeChallenge - Optional PKCE code challenge for OAuth 2.1 security
   * @returns The generated authorization code with prefix
   * @throws Error if code creation fails
   */
  public createAuthCode(
    clientId: string,
    redirectUri: string,
    resource: string,
    scopes: string[],
    ttlMs: number,
    codeChallenge?: string,
  ): string {
    const code = AUTH_CONFIG.SERVER.AUTH_CODE.ID_PREFIX + randomUUID();
    const authCodeData: AuthCodeData = {
      clientId,
      redirectUri,
      resource,
      scopes,
      codeChallenge,
      expires: Date.now() + ttlMs,
      createdAt: Date.now(),
    };

    try {
      const filePath = this.getAuthCodeFilePath(code);
      fs.writeFileSync(filePath, JSON.stringify(authCodeData, null, 2));
      logger.info(`Created auth code: ${code} for client: ${clientId}`);
      return code;
    } catch (error) {
      logger.error(`Failed to create auth code: ${error}`);
      throw error;
    }
  }

  /**
   * Retrieves authorization code data by code.
   *
   * Reads the auth code file and validates expiration. If the code
   * is expired, it's automatically deleted and null is returned.
   *
   * @param code - The authorization code to retrieve
   * @returns Auth code data if valid and not expired, null otherwise
   */
  public getAuthCode(code: string): AuthCodeData | null {
    if (!this.isValidId(code)) {
      logger.warn(`Rejected getAuthCode with invalid code: ${code}`);
      return null;
    }
    try {
      const filePath = this.getAuthCodeFilePath(code);
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const data = fs.readFileSync(filePath, 'utf8');
      const authCodeData: AuthCodeData = JSON.parse(data);

      if (authCodeData.expires < Date.now()) {
        this.deleteAuthCode(code);
        return null;
      }

      return authCodeData;
    } catch (error) {
      logger.error(`Failed to read auth code ${code}: ${error}`);
      return null;
    }
  }

  /**
   * Deletes an authorization code by code.
   *
   * Removes the auth code file from the filesystem if it exists.
   *
   * @param code - The authorization code to delete
   * @returns True if code was deleted, false if it didn't exist
   */
  public deleteAuthCode(code: string): boolean {
    if (!this.isValidId(code)) {
      logger.warn(`Rejected deleteAuthCode with invalid code: ${code}`);
      return false;
    }
    try {
      const filePath = this.getAuthCodeFilePath(code);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`Deleted auth code: ${code}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Failed to delete auth code ${code}: ${error}`);
      return false;
    }
  }

  /**
   * Starts the automatic cleanup interval for expired sessions.
   *
   * Runs cleanup every 5 minutes to remove expired sessions and
   * authorization codes from the filesystem.
   */
  private startCleanupInterval(): void {
    // Clean up expired sessions every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupExpiredSessions();
      },
      5 * 60 * 1000,
    );
  }

  /**
   * Cleans up expired sessions and authorization codes.
   *
   * Scans the session storage directory and removes all expired
   * session and auth code files. Also handles corrupted files
   * by removing them to prevent future errors.
   */
  private cleanupExpiredSessions(): void {
    this.cleanupExpiredServerSessions();
  }

  /**
   * Cleans up expired server sessions and authorization codes.
   */
  private cleanupExpiredServerSessions(): void {
    try {
      const files = fs.readdirSync(this.sessionStoragePath);
      let cleanedCount = 0;

      for (const file of files) {
        if (file.endsWith(AUTH_CONFIG.SERVER.STORAGE.FILE_EXTENSION)) {
          const filePath = path.join(this.sessionStoragePath, file);
          try {
            const data = fs.readFileSync(filePath, 'utf8');
            const sessionData = JSON.parse(data);

            if (sessionData.expires < Date.now()) {
              fs.unlinkSync(filePath);
              cleanedCount++;
            }
          } catch (error) {
            logger.warn(`Failed to process session file ${file}: ${error}`);
            // Remove corrupted files
            try {
              fs.unlinkSync(filePath);
              cleanedCount++;
            } catch (unlinkError) {
              logger.error(`Failed to remove corrupted file ${file}: ${unlinkError}`);
            }
          }
        }
      }

      if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} expired server sessions`);
      }
    } catch (error) {
      logger.error(`Failed to cleanup expired server sessions: ${error}`);
    }
  }

  /**
   * Performs graceful shutdown of the SessionManager.
   *
   * Stops the cleanup interval to prevent memory leaks and
   * ensures proper resource cleanup.
   */
  public shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Creates a new session with a custom ID (no prefix).
   * Used for access tokens where the token ID is generated separately.
   *
   * @param tokenId - The raw UUID to use for the session (no prefix)
   * @param clientId - The client identifier
   * @param resource - The resource this session can access
   * @param scopes - The scopes this session grants access to
   * @param ttlMs - Time-to-live in milliseconds
   * @returns The generated session ID with prefix
   * @throws Error if session creation fails
   */
  public createSessionWithId(
    tokenId: string,
    clientId: string,
    resource: string,
    scopes: string[],
    ttlMs: number,
  ): string {
    const sessionId = AUTH_CONFIG.SERVER.SESSION.ID_PREFIX + tokenId;
    const sessionData: SessionData = {
      clientId,
      resource,
      scopes,
      expires: Date.now() + ttlMs,
      createdAt: Date.now(),
    };

    try {
      const filePath = this.getSessionFilePath(sessionId);
      fs.writeFileSync(filePath, JSON.stringify(sessionData, null, 2));
      logger.info(`Created session: ${sessionId} for client: ${clientId}`);
      return sessionId;
    } catch (error) {
      logger.error(`Failed to create session: ${error}`);
      throw error;
    }
  }

  /**
   * Deletes client data by client ID.
   *
   * Removes the client data file from the filesystem if it exists.
   *
   * @param clientId - The client identifier to delete
   * @returns True if client data was deleted, false if it didn't exist
   */
  public deleteClientData(clientId: string): boolean {
    if (!this.isValidId(clientId)) {
      logger.warn(`Rejected deleteClientData with invalid clientId: ${clientId}`);
      return false;
    }
    const filePath = this.getSessionFilePath(clientId);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }

  /**
   * Retrieves client data by client ID.
   *
   * Reads the client data file and validates expiration. If the client data
   * is expired, it's automatically deleted and null is returned.
   *
   * @param clientId - The client identifier to retrieve
   * @returns Client data if valid and not expired, null otherwise
   */
  public getClientData(clientId: string): OAuthClientInformationFull | null {
    const filePath = this.getSessionFilePath(clientId);
    if (!this.isValidId(clientId)) {
      logger.warn(`Rejected getClientData with invalid clientId: ${clientId}`);
      return null;
    }
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    const clientData: ClientData = JSON.parse(data);
    if (clientData.expires < Date.now()) {
      this.deleteClientData(clientId);
      return null;
    }
    return clientData;
  }

  /**
   * Creates a new session with custom data.
   * Used for OAuth client data storage where arbitrary data needs to be stored.
   *
   * @param sessionId - The session ID to use
   * @param data - The custom data to store
   * @param ttlMs - Time-to-live in milliseconds
   * @returns The session ID
   * @throws Error if session creation fails
   */
  public saveClientData(clientId: string, data: OAuthClientInformationFull, ttlMs: number): string {
    try {
      const clientData: ClientData = {
        ...data,
        expires: data.client_secret_expires_at ? data.client_secret_expires_at * 1000 : Date.now() + ttlMs,
        createdAt: data.client_id_issued_at ? data.client_id_issued_at * 1000 : Date.now(),
      };
      const filePath = this.getSessionFilePath(clientId);
      fs.writeFileSync(filePath, JSON.stringify(clientData, null, 2));
      logger.info(`Created client data: ${clientId}`);
      return clientId;
    } catch (error) {
      logger.error(`Failed to create data session: ${error}`);
      throw error;
    }
  }

  /**
   * Creates a temporary authorization request for the consent flow.
   *
   * Stores the authorization parameters including code challenge to be
   * retrieved when the consent form is submitted.
   *
   * @param clientId - The client identifier
   * @param redirectUri - The redirect URI for this request
   * @param codeChallenge - Optional PKCE code challenge
   * @param state - Optional state parameter
   * @param resource - Optional resource parameter
   * @param scopes - Optional scopes array
   * @param ttlMs - Time-to-live in milliseconds
   * @returns The generated authorization request ID
   * @throws Error if request creation fails
   */
  public createAuthRequest(
    clientId: string,
    redirectUri: string,
    codeChallenge?: string,
    state?: string,
    resource?: string,
    scopes?: string[],
    ttlMs: number = AUTH_CONFIG.SERVER.AUTH_REQUEST.TTL_MS,
  ): string {
    const authRequestId = AUTH_CONFIG.SERVER.AUTH_REQUEST.ID_PREFIX + randomUUID();
    const authRequestData: AuthRequestData = {
      clientId,
      redirectUri,
      codeChallenge,
      state,
      resource,
      scopes,
      expires: Date.now() + ttlMs,
      createdAt: Date.now(),
    };

    try {
      const filePath = this.getAuthRequestFilePath(authRequestId);
      fs.writeFileSync(filePath, JSON.stringify(authRequestData, null, 2));
      logger.info(`Created auth request: ${authRequestId} for client: ${clientId}`);
      return authRequestId;
    } catch (error) {
      logger.error(`Failed to create auth request: ${error}`);
      throw error;
    }
  }

  /**
   * Retrieves authorization request data by request ID.
   *
   * @param authRequestId - The authorization request identifier
   * @returns Auth request data if valid and not expired, null otherwise
   */
  public getAuthRequest(authRequestId: string): AuthRequestData | null {
    if (!this.isValidId(authRequestId)) {
      logger.warn(`Rejected getAuthRequest with invalid ID: ${authRequestId}`);
      return null;
    }
    try {
      const filePath = this.getAuthRequestFilePath(authRequestId);
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const data = fs.readFileSync(filePath, 'utf8');
      const authRequestData: AuthRequestData = JSON.parse(data);

      if (authRequestData.expires < Date.now()) {
        this.deleteAuthRequest(authRequestId);
        return null;
      }

      return authRequestData;
    } catch (error) {
      logger.error(`Failed to read auth request ${authRequestId}: ${error}`);
      return null;
    }
  }

  /**
   * Deletes an authorization request by ID.
   *
   * @param authRequestId - The authorization request identifier
   * @returns True if request was deleted, false if it didn't exist
   */
  public deleteAuthRequest(authRequestId: string): boolean {
    if (!this.isValidId(authRequestId)) {
      logger.warn(`Rejected deleteAuthRequest with invalid ID: ${authRequestId}`);
      return false;
    }
    try {
      const filePath = this.getAuthRequestFilePath(authRequestId);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`Deleted auth request: ${authRequestId}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Failed to delete auth request ${authRequestId}: ${error}`);
      return false;
    }
  }
}
