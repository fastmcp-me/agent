import fs from 'fs';
import path from 'path';
import winston from 'winston';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { MCPTransport } from './mcpTransport.js';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Map MCP log levels to Winston log levels
const MCP_TO_WINSTON_LEVEL: Record<string, string> = {
    debug: 'debug',
    info: 'info',
    notice: 'info',
    warning: 'warn',
    error: 'error',
    critical: 'error',
    alert: 'error',
    emergency: 'error',
};

// Custom format for console and file output
const customFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} [${level.toUpperCase()}] ${message}${metaStr}`;
    }),
);

// Create the logger without the MCP transport initially
const logger = winston.createLogger({
    level: 'info',
    format: customFormat,
    defaultMeta: { service: '1mcp-agent' },
    transports: [
        new winston.transports.Console({
            format: customFormat,
        }),
        //
        // - Write all logs with importance level of `error` or higher to `error.log`
        //   (i.e., error, fatal, but not other levels)
        //
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            format: customFormat,
        }),
        //
        // - Write all logs with importance level of `info` or higher to `combined.log`
        //   (i.e., fatal, error, warn, and info, but not trace)
        //
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            format: customFormat,
        }),
    ],
    // Prevent logger from exiting on error
    exitOnError: false,
});

// Store a reference to the MCP transport
let mcpTransport: MCPTransport | null = null;

/**
 * Adds the MCP transport to the logger
 * @param server The MCP server instance
 * @param loggerName Optional name for the logger in MCP notifications
 */
export function addMCPTransport(server: Server, loggerName?: string): void {
    // Add the MCP transport to the logger
    mcpTransport = new MCPTransport({
        server,
        loggerName: loggerName || '1mcp-agent',
        level: 'info',
    });
    logger.add(mcpTransport);
}

/**
 * Set the connection status of the MCP transport
 * @param connected Whether the server is connected
 */
export function setMCPTransportConnected(connected: boolean): void {
    if (mcpTransport) {
        mcpTransport.setConnected(connected);
    }
}

/**
 * Set the log level for the logger
 * @param mcpLevel The MCP log level to set
 */
export function setLogLevel(mcpLevel: string): void {
    // Convert MCP log level to Winston log level
    const winstonLevel = MCP_TO_WINSTON_LEVEL[mcpLevel] || 'info';

    // Set the log level for all transports
    logger.level = winstonLevel;
    logger.transports.forEach((transport) => {
        transport.level = winstonLevel;
    });

    // Also set the level for the MCP transport if it exists
    if (mcpTransport) {
        mcpTransport.level = winstonLevel;
    }
}

export default logger;
