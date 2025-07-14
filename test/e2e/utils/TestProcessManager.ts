import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import logger from '@src/logger/logger.js';

export interface ProcessConfig {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  startupTimeout?: number; // Timeout for process startup phase
}

export interface ProcessInfo {
  pid: number;
  config: ProcessConfig;
  startTime: number;
  process: ChildProcess;
}

export class TestProcessManager extends EventEmitter {
  private processes = new Map<string, ProcessInfo>();
  private cleanupHandlers: Array<() => Promise<void>> = [];

  async startProcess(id: string, config: ProcessConfig): Promise<ProcessInfo> {
    if (this.processes.has(id)) {
      throw new Error(`Process with id ${id} already exists`);
    }

    const childProcess = spawn(config.command, config.args || [], {
      cwd: config.cwd,
      env: { ...process.env, ...config.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const processInfo: ProcessInfo = {
      pid: childProcess.pid!,
      config,
      startTime: Date.now(),
      process: childProcess,
    };

    this.processes.set(id, processInfo);

    // Set up event handlers
    childProcess.on('error', (error) => {
      logger.error(`Process ${id} error:`, error);
      this.emit('processError', id, error);
    });

    childProcess.on('exit', (code, signal) => {
      logger.info(`Process ${id} exited with code ${code}, signal ${signal}`);
      this.processes.delete(id);
      this.emit('processExit', id, code, signal);
    });

    // Handle timeout
    if (config.timeout) {
      setTimeout(() => {
        if (this.processes.has(id)) {
          this.killProcess(id, 'SIGTERM');
        }
      }, config.timeout);
    }

    // Wait for process to be ready
    await this.waitForProcessReady(childProcess, config.startupTimeout);

    return processInfo;
  }

  async stopProcess(id: string, signal: 'SIGTERM' | 'SIGKILL' | 'SIGINT' = 'SIGTERM'): Promise<void> {
    const processInfo = this.processes.get(id);
    if (!processInfo) {
      return;
    }

    return new Promise((resolve) => {
      const { process } = processInfo;

      process.once('exit', () => {
        this.processes.delete(id);
        resolve();
      });

      process.kill(signal);

      // Force kill after 5 seconds
      setTimeout(() => {
        if (!process.killed) {
          process.kill('SIGKILL');
        }
      }, 5000);
    });
  }

  killProcess(id: string, signal: 'SIGTERM' | 'SIGKILL' | 'SIGINT' = 'SIGKILL'): void {
    const processInfo = this.processes.get(id);
    if (processInfo) {
      processInfo.process.kill(signal);
      this.processes.delete(id);
    }
  }

  getProcess(id: string): ProcessInfo | undefined {
    return this.processes.get(id);
  }

  getAllProcesses(): Map<string, ProcessInfo> {
    return new Map(this.processes);
  }

  isProcessRunning(id: string): boolean {
    return this.processes.has(id);
  }

  async cleanup(): Promise<void> {
    const stopPromises = Array.from(this.processes.keys()).map((id) => this.stopProcess(id));

    await Promise.all([...stopPromises, ...this.cleanupHandlers.map((handler) => handler())]);

    this.processes.clear();
    this.cleanupHandlers = [];
  }

  addCleanupHandler(handler: () => Promise<void>): void {
    this.cleanupHandlers.push(handler);
  }

  private async waitForProcessReady(process: ChildProcess, startupTimeout?: number): Promise<void> {
    const timeoutMs = startupTimeout || 2000; // Default to 2 seconds instead of 10

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Process failed to start within timeout'));
      }, timeoutMs);

      // Consider process ready when it doesn't exit immediately
      setTimeout(() => {
        if (!process.killed && process.pid) {
          clearTimeout(timeout);
          resolve();
        }
      }, 50); // Reduced from 100ms to 50ms

      process.once('exit', () => {
        clearTimeout(timeout);
        reject(new Error('Process exited during startup'));
      });
    });
  }
}
