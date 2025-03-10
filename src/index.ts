#!/usr/bin/env node

import express from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

import { server } from './server.js';
import logger from './logger.js';

const app = express();

// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

const transportMap = new Map<string, SSEServerTransport>();

app.get('/sse', async (req: express.Request, res: express.Response) => {
    logger.info('sse', { query: req.query, headers: req.headers });
    const transport = new SSEServerTransport('/messages', res);
    await server.connect(transport);
    transportMap.set(transport.sessionId, transport);
    transport.onclose = () => {
        transportMap.delete(transport.sessionId);
        logger.info('transport closed', transport.sessionId);
    };
});

app.post('/messages', async (req: express.Request, res: express.Response) => {
    logger.info('message', { body: req.body, query: req.query, headers: req.headers });
    const transport = transportMap.get(req.query.sessionId as string);
    if (transport) {
        await transport.handlePostMessage(req, res);
        return;
    }
    res.status(404).send('Transport not found');
});

/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
    // const transport = new StdioServerTransport();
    // await server.connect(transport);
    app.listen(3050, () => {
        logger.info('Server is running on port 3050');
    });
}

main().catch((error) => {
    logger.error('Server error:', error);
    process.exit(1);
});
