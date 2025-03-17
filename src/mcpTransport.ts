import Transport from 'winston-transport';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

// Map Winston log levels to MCP log levels
const LOG_LEVEL_MAP: Record<string, string> = {
  error: 'error',
  warn: 'warning',
  info: 'info',
  verbose: 'debug',
  debug: 'debug',
  silly: 'debug',
};

interface MCPTransportOptions extends Transport.TransportStreamOptions {
  server: Server;
  loggerName?: string;
}

/**
 * Winston transport for sending logs to MCP clients
 */
export class MCPTransport extends Transport {
  private server: Server;
  private loggerName: string;
  private connected: boolean = false;

  constructor(options: MCPTransportOptions) {
    super(options);
    this.server = options.server;
    this.loggerName = options.loggerName || '1mcp';

    // Set up connection status handlers
    this.setupConnectionHandlers();
  }

  /**
   * Set up handlers for connection status changes
   */
  private setupConnectionHandlers(): void {
    // Handle connection close
    this.server.onclose = () => {
      this.setConnected(false);
    };
  }

  /**
   * Set the connection status of the transport
   * @param connected Whether the server is connected
   */
  setConnected(connected: boolean): void {
    const previousState = this.connected;
    this.connected = connected;

    // Log connection state changes
    if (previousState !== connected) {
      console.debug(`MCP Transport connection state changed to: ${connected ? 'connected' : 'disconnected'}`);
    }
  }

  /**
   * Send a log notification to the MCP client
   * @param info The log info object
   * @returns true if the notification was sent, false otherwise
   */
  private sendLogNotification(info: any): boolean {
    if (!this.server || !this.connected) {
      return false;
    }

    // Map Winston log level to MCP log level
    const level = LOG_LEVEL_MAP[info.level] || 'info';

    const sanitizedData = this.sanitizeData(info);

    // Extract message and metadata
    const { message, level: _, ...meta } = sanitizedData;

    // Create MCP logging notification
    const notification = {
      method: 'notifications/message',
      params: {
        level,
        message: typeof message === 'string' ? message : JSON.stringify(message),
        logger: this.loggerName,
        data: Object.keys(meta).length > 0 ? meta : undefined,
      },
    };

    // Send notification to MCP clients
    try {
      this.server.notification(notification);
      return true;
    } catch (error) {
      console.error('Failed to send log notification to MCP client:', error);
      return false;
    }
  }

  /**
   * Sanitize log data to remove sensitive information
   * @param data The data to sanitize
   * @returns Sanitized data
   */
  private sanitizeData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    // List of potentially sensitive field names
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'credential',
      'auth',
      'apiKey',
      'api_key',
      'accessToken',
      'access_token',
      'jwt',
      'ssn',
      'creditCard',
      'credit_card',
      'cvv',
      'pin',
    ];

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeData(item));
    }

    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      // Check if this is a sensitive field
      const isSensitive = sensitiveFields.some((field) => key.toLowerCase().includes(field.toLowerCase()));

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  log(info: any, callback: () => void) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    // Only try to send if connected
    if (this.connected) {
      try {
        this.sendLogNotification(info);
      } catch (error) {
        // Ignore any errors during log sending
      }
    }

    // Always call the callback to prevent blocking
    callback();
  }

  /**
   * Clean up resources when the transport is closed
   */
  close(): void {
    this.setConnected(false);
    this.server.onclose = undefined;
  }
}
