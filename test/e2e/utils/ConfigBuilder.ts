import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

export interface TestServerConfig {
  name: string;
  transport: 'stdio' | 'http';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  endpoint?: string;
  tags?: string[];
}

export interface TestConfig {
  servers: TestServerConfig[];
  transport?: {
    stdio?: boolean;
    http?: {
      port?: number;
      host?: string;
    };
  };
  auth?: {
    enabled?: boolean;
    clientId?: string;
    clientSecret?: string;
  };
}

export class ConfigBuilder {
  private config: TestConfig = { servers: [] };
  private tempFiles: string[] = [];

  addServer(server: TestServerConfig): this {
    this.config.servers.push(server);
    return this;
  }

  addStdioServer(name: string, command: string, args?: string[], tags?: string[]): this {
    return this.addServer({
      name,
      transport: 'stdio',
      command,
      args,
      tags,
    });
  }

  addHttpServer(name: string, endpoint: string, tags?: string[]): this {
    return this.addServer({
      name,
      transport: 'http',
      endpoint,
      tags,
    });
  }

  enableStdioTransport(): this {
    if (!this.config.transport) {
      this.config.transport = {};
    }
    this.config.transport.stdio = true;
    return this;
  }

  enableHttpTransport(port?: number, host?: string): this {
    if (!this.config.transport) {
      this.config.transport = {};
    }
    this.config.transport.http = { port, host };
    return this;
  }

  enableAuth(clientId?: string, clientSecret?: string): this {
    this.config.auth = {
      enabled: true,
      clientId: clientId || 'test-client',
      clientSecret: clientSecret || 'test-secret',
    };
    return this;
  }

  build(): TestConfig {
    return JSON.parse(JSON.stringify(this.config));
  }

  writeToFile(filePath?: string): string {
    const configPath = filePath || this.generateTempPath();
    const dir = dirname(configPath);

    mkdirSync(dir, { recursive: true });
    writeFileSync(configPath, JSON.stringify(this.config, null, 2));

    if (!filePath) {
      this.tempFiles.push(configPath);
    }

    return configPath;
  }

  cleanup(): void {
    this.tempFiles.forEach((file) => {
      try {
        const fs = require('fs');
        fs.unlinkSync(file);
      } catch {
        // Ignore cleanup errors
      }
    });
    this.tempFiles = [];
  }

  private generateTempPath(): string {
    const id = randomBytes(8).toString('hex');
    return join(tmpdir(), `1mcp-test-config-${id}.json`);
  }

  static create(): ConfigBuilder {
    return new ConfigBuilder();
  }

  static createMinimal(): ConfigBuilder {
    return new ConfigBuilder().enableStdioTransport().enableHttpTransport(0); // 0 = random port
  }

  static createWithEchoServer(): ConfigBuilder {
    const fixturesPath = join(__dirname, '../fixtures');
    return ConfigBuilder.createMinimal().addStdioServer(
      'echo-server',
      'node',
      [join(fixturesPath, 'echo-server.js')],
      ['test', 'echo'],
    );
  }

  static createWithMultipleServers(): ConfigBuilder {
    const fixturesPath = join(__dirname, '../fixtures');
    return ConfigBuilder.createMinimal()
      .addStdioServer('echo-server', 'node', [join(fixturesPath, 'echo-server.js')], ['test', 'echo'])
      .addStdioServer('capability-server', 'node', [join(fixturesPath, 'capability-server.js')], ['test', 'capability'])
      .addStdioServer('error-server', 'node', [join(fixturesPath, 'error-server.js')], ['test', 'error']);
  }
}
