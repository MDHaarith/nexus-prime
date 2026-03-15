export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
  METRIC = 'METRIC'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  agent?: string;
  phaseId?: string;
  taskId?: string;
  message: string;
  data?: any;
  duration_ms?: number;
}

export class Logger {
  private static instance: Logger;
  private agentName: string = 'system';
  private entries: LogEntry[] = [];
  private listeners: Set<(entry: LogEntry) => void> = new Set();
  private consoleOutputEnabled: boolean = process.env.NEXUS_CONSOLE_LOGS === '1';

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public setAgent(name: string): void {
    this.agentName = name;
  }

  public setConsoleOutput(enabled: boolean): void {
    this.consoleOutputEnabled = enabled;
  }

  public subscribe(listener: (entry: LogEntry) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getEntries(): LogEntry[] {
    return [...this.entries];
  }

  public reset(): void {
    this.entries = [];
    this.listeners.clear();
    this.agentName = 'system';
  }

  private log(level: LogLevel, message: string, data?: any, meta?: { phaseId?: string, taskId?: string, duration_ms?: number }): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      agent: this.agentName,
      message,
      data,
      ...meta
    };

    this.entries.push(entry);

    if (this.consoleOutputEnabled) {
      if (level === LogLevel.ERROR) {
        console.error(JSON.stringify(entry));
      } else {
        console.log(JSON.stringify(entry));
      }
    }

    for (const listener of this.listeners) {
      listener(entry);
    }
  }

  public info(message: string, data?: any, meta?: any): void {
    this.log(LogLevel.INFO, message, data, meta);
  }

  public warn(message: string, data?: any, meta?: any): void {
    this.log(LogLevel.WARN, message, data, meta);
  }

  public error(message: string, data?: any, meta?: any): void {
    this.log(LogLevel.ERROR, message, data, meta);
  }

  public debug(message: string, data?: any, meta?: any): void {
    this.log(LogLevel.DEBUG, message, data, meta);
  }

  public metric(name: string, value: any, meta?: any): void {
    this.log(LogLevel.METRIC, `METRIC:${name}`, value, meta);
  }

  public tokens(taskId: string, usage: { input: number, output: number, cached?: number }): void {
    this.log(LogLevel.METRIC, `TOKENS:${taskId}`, usage, { taskId });
  }
}
