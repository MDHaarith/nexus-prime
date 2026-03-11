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

  private log(level: LogLevel, message: string, data?: any, meta?: { phaseId?: string, taskId?: string, duration_ms?: number }): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      agent: this.agentName,
      message,
      data,
      ...meta
    };

    // Output structured JSON for SRE observability
    if (level === LogLevel.ERROR) {
      console.error(JSON.stringify(entry));
    } else {
      console.log(JSON.stringify(entry));
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
