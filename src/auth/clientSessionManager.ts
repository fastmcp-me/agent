import fs from 'fs';
import path from 'path';
import logger from '../logger/logger.js';
import { getGlobalConfigDir } from '../constants.js';
import { ClientSessionData } from './sessionTypes.js';

/**
 * ClientSessionManager handles file-based client session storage with automatic cleanup.
 *
 * This class manages OAuth 2.1 client sessions using the local filesystem.
 * It provides automatic cleanup of expired sessions and supports configurable
 * storage locations separate from server sessions.
 *
 * Features:
 * - File-based client session storage with JSON format
 * - Automatic cleanup of expired client sessions
 * - Server name sanitization for safe filenames
 * - Configurable storage directory
 * - Unified session data per server
 *
 * @example
 * ```typescript
 * const clientSessionManager = new ClientSessionManager();
 * const sessionData = { serverName: 'test', ... };
 * clientSessionManager.createClientSession('test', sessionData);
 * const session = clientSessionManager.getClientSession('test');
 * ```
 */
export class ClientSessionManager {
  private clientSessionStoragePath: string;

  /**
   * Creates a new ClientSessionManager instance.
   *
   * Initializes the client session storage directory.
   *
   * @param clientSessionStoragePath - Optional custom path for client session storage
   */
  constructor(clientSessionStoragePath?: string) {
    this.clientSessionStoragePath = clientSessionStoragePath || path.join(getGlobalConfigDir(), 'clientSessions');
    this.ensureClientSessionDirectory();
  }

  /**
   * Gets the client session storage path.
   *
   * @returns The absolute path to the client session storage directory
   */
  public getClientSessionStoragePath(): string {
    return this.clientSessionStoragePath;
  }

  /**
   * Ensures the client session storage directory exists.
   *
   * Creates the directory structure if it doesn't exist, including
   * parent directories as needed.
   *
   * @throws Error if directory creation fails
   */
  private ensureClientSessionDirectory(): void {
    try {
      if (!fs.existsSync(this.clientSessionStoragePath)) {
        fs.mkdirSync(this.clientSessionStoragePath, { recursive: true });
        logger.info(`Created client session storage directory: ${this.clientSessionStoragePath}`);
      }
    } catch (error) {
      logger.error(`Failed to create client session directory: ${error}`);
      throw error;
    }
  }

  /**
   * Sanitizes server name for use as filename by replacing special characters.
   *
   * @param serverName - The server name to sanitize
   * @returns Sanitized server name safe for use as filename
   */
  private sanitizeServerName(serverName: string): string {
    if (!serverName) {
      return 'default';
    }

    // Replace special characters with safe equivalents
    let sanitized = serverName
      .replace(/[^a-zA-Z0-9_-]/g, '_') // Replace any non-alphanumeric, underscore, or hyphen with underscore
      .replace(/_{2,}/g, '_') // Replace multiple consecutive underscores with single underscore
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
      .substring(0, 100); // Limit length to prevent filesystem issues

    // If result is empty or only underscores, use default
    if (!sanitized || sanitized.length === 0) {
      return 'default';
    }

    return sanitized;
  }

  /**
   * Gets the file path for a client session.
   *
   * @param serverName - The server name for the client session
   * @returns Full file path for the client session file
   */
  private getClientSessionFilePath(serverName: string): string {
    const sanitizedServerName = this.sanitizeServerName(serverName);
    const fileName = `oauth_${sanitizedServerName}.json`;
    const filePath = path.resolve(this.clientSessionStoragePath, fileName);

    // Additional security check: ensure resolved path is within client session storage
    const normalizedStoragePath = path.resolve(this.clientSessionStoragePath);
    const normalizedFilePath = path.resolve(filePath);

    if (!normalizedFilePath.startsWith(normalizedStoragePath + path.sep)) {
      throw new Error('Invalid client session file path: outside storage directory');
    }

    return filePath;
  }

  /**
   * Creates or updates a client session.
   *
   * @param serverName - The server name for the client session
   * @param clientSessionData - The client session data to store
   * @returns The server name
   * @throws Error if client session creation fails
   */
  public createClientSession(serverName: string, clientSessionData: ClientSessionData): string {
    try {
      const filePath = this.getClientSessionFilePath(serverName);
      fs.writeFileSync(filePath, JSON.stringify(clientSessionData, null, 2));
      logger.info(`Created/updated client session for server: ${serverName}`);
      return serverName;
    } catch (error) {
      logger.error(`Failed to create client session for ${serverName}: ${error}`);
      throw error;
    }
  }

  /**
   * Retrieves client session data by server name.
   *
   * @param serverName - The server name to retrieve client session for
   * @returns Client session data if valid and not expired, null otherwise
   */
  public getClientSession(serverName: string): ClientSessionData | null {
    try {
      const filePath = this.getClientSessionFilePath(serverName);
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const data = fs.readFileSync(filePath, 'utf8');
      const clientSessionData: ClientSessionData = JSON.parse(data);

      if (clientSessionData.expires < Date.now()) {
        this.deleteClientSession(serverName);
        return null;
      }

      return clientSessionData;
    } catch (error) {
      logger.error(`Failed to read client session for ${serverName}: ${error}`);
      return null;
    }
  }

  /**
   * Deletes a client session by server name.
   *
   * @param serverName - The server name to delete client session for
   * @returns True if client session was deleted, false if it didn't exist
   */
  public deleteClientSession(serverName: string): boolean {
    try {
      const filePath = this.getClientSessionFilePath(serverName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`Deleted client session for server: ${serverName}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Failed to delete client session for ${serverName}: ${error}`);
      return false;
    }
  }

  /**
   * Cleans up expired client sessions.
   *
   * Scans the client session storage directory and removes all expired
   * client session files. Also handles corrupted files by removing them
   * to prevent future errors.
   */
  public cleanupExpiredClientSessions(): void {
    try {
      if (!fs.existsSync(this.clientSessionStoragePath)) {
        return;
      }

      const files = fs.readdirSync(this.clientSessionStoragePath);
      let cleanedCount = 0;

      for (const file of files) {
        if (file.endsWith('.json') && file.startsWith('oauth_')) {
          const filePath = path.join(this.clientSessionStoragePath, file);
          try {
            const data = fs.readFileSync(filePath, 'utf8');
            const clientSessionData = JSON.parse(data);

            if (clientSessionData.expires < Date.now()) {
              fs.unlinkSync(filePath);
              cleanedCount++;
            }
          } catch (error) {
            logger.warn(`Failed to process client session file ${file}: ${error}`);
            // Remove corrupted files
            try {
              fs.unlinkSync(filePath);
              cleanedCount++;
            } catch (unlinkError) {
              logger.error(`Failed to remove corrupted client session file ${file}: ${unlinkError}`);
            }
          }
        }
      }

      if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} expired client sessions`);
      }
    } catch (error) {
      logger.error(`Failed to cleanup expired client sessions: ${error}`);
    }
  }

  /**
   * Lists all client session files in the storage directory.
   *
   * @returns Array of server names that have client sessions
   */
  public listClientSessions(): string[] {
    try {
      if (!fs.existsSync(this.clientSessionStoragePath)) {
        return [];
      }

      const files = fs.readdirSync(this.clientSessionStoragePath);
      return files
        .filter((file) => file.endsWith('.json') && file.startsWith('oauth_'))
        .map((file) => file.substring(6, file.length - 5)); // Remove 'oauth_' prefix and '.json' suffix
    } catch (error) {
      logger.error(`Failed to list client sessions: ${error}`);
      return [];
    }
  }
}
