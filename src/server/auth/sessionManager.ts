import fs from 'fs';
import path from 'path';
import { randomUUID } from 'node:crypto';
import logger from '../../logger/logger.js';
import { AUTH_CONFIG, getGlobalConfigDir } from '../../constants.js';

export interface SessionData {
  clientId: string;
  resource: string;
  expires: number;
  createdAt: number;
}

export interface AuthCodeData {
  clientId: string;
  redirectUri: string;
  resource: string;
  expires: number;
  createdAt: number;
}

export class SessionManager {
  private sessionStoragePath: string;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(sessionStoragePath?: string) {
    this.sessionStoragePath = sessionStoragePath || path.join(getGlobalConfigDir(), AUTH_CONFIG.SESSION_STORAGE_DIR);
    this.ensureSessionDirectory();
    this.startCleanupInterval();
  }

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

  private getSessionFilePath(sessionId: string): string {
    return path.join(
      this.sessionStoragePath,
      `${AUTH_CONFIG.SESSION_FILE_PREFIX}${sessionId}${AUTH_CONFIG.SESSION_FILE_EXTENSION}`,
    );
  }

  private getAuthCodeFilePath(code: string): string {
    return path.join(this.sessionStoragePath, `auth_code_${code}${AUTH_CONFIG.SESSION_FILE_EXTENSION}`);
  }

  public createSession(clientId: string, resource: string, ttlMs: number): string {
    const sessionId = randomUUID();
    const sessionData: SessionData = {
      clientId,
      resource,
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

  public getSession(sessionId: string): SessionData | null {
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

  public deleteSession(sessionId: string): boolean {
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

  public createAuthCode(clientId: string, redirectUri: string, resource: string, ttlMs: number): string {
    const code = randomUUID();
    const authCodeData: AuthCodeData = {
      clientId,
      redirectUri,
      resource,
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

  public getAuthCode(code: string): AuthCodeData | null {
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

  public deleteAuthCode(code: string): boolean {
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

  private startCleanupInterval(): void {
    // Clean up expired sessions every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupExpiredSessions();
      },
      5 * 60 * 1000,
    );
  }

  private cleanupExpiredSessions(): void {
    try {
      const files = fs.readdirSync(this.sessionStoragePath);
      let cleanedCount = 0;

      for (const file of files) {
        if (file.endsWith(AUTH_CONFIG.SESSION_FILE_EXTENSION)) {
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
        logger.info(`Cleaned up ${cleanedCount} expired sessions`);
      }
    } catch (error) {
      logger.error(`Failed to cleanup expired sessions: ${error}`);
    }
  }

  public shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}
