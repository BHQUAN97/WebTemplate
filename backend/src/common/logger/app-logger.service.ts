import { Injectable, LoggerService, LogLevel } from '@nestjs/common';

interface LogEntry {
  timestamp: string;
  level: string;
  context: string;
  message: string;
  metadata?: Record<string, any>;
}

interface AccessLogData {
  method: string;
  url: string;
  status: number;
  duration: number;
  ip: string;
  userAgent: string;
  userId?: string;
}

/**
 * Structured JSON logger for the application.
 * Outputs logs in a consistent format suitable for log aggregation tools.
 *
 * @example
 * ```ts
 * // In main.ts
 * const app = await NestFactory.create(AppModule, {
 *   logger: new AppLoggerService(),
 * });
 * ```
 */
@Injectable()
export class AppLoggerService implements LoggerService {
  private context = 'App';

  setContext(context: string): void {
    this.context = context;
  }

  log(message: any, context?: string): void {
    this.printLog('info', message, context);
  }

  error(message: any, trace?: string, context?: string): void {
    this.printLog('error', message, context, { trace });
  }

  warn(message: any, context?: string): void {
    this.printLog('warn', message, context);
  }

  debug(message: any, context?: string): void {
    if (process.env.NODE_ENV === 'production') return;
    this.printLog('debug', message, context);
  }

  verbose(message: any, context?: string): void {
    if (process.env.NODE_ENV === 'production') return;
    this.printLog('verbose', message, context);
  }

  /**
   * Log an HTTP access entry in structured format.
   */
  access(data: AccessLogData): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'access',
      context: 'HTTP',
      message: `${data.method} ${data.url} ${data.status} ${data.duration}ms`,
      metadata: {
        method: data.method,
        url: data.url,
        status: data.status,
        duration: data.duration,
        ip: data.ip,
        userAgent: data.userAgent,
        userId: data.userId || 'anonymous',
      },
    };

    process.stdout.write(JSON.stringify(entry) + '\n');
  }

  private printLog(
    level: string,
    message: any,
    context?: string,
    metadata?: Record<string, any>,
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: context || this.context,
      message: typeof message === 'string' ? message : JSON.stringify(message),
    };

    if (metadata && Object.keys(metadata).length > 0) {
      entry.metadata = metadata;
    }

    // Production: JSON output cho log aggregation
    // Development: console output voi mau sac
    if (process.env.NODE_ENV === 'production') {
      process.stdout.write(JSON.stringify(entry) + '\n');
    } else {
      const color = this.getColor(level);
      const levelStr = level.toUpperCase().padEnd(7);
      const contextStr = `[${entry.context}]`;
      console.log(
        `${color}${entry.timestamp} ${levelStr}\x1b[0m ${contextStr} ${entry.message}`,
        metadata ? metadata : '',
      );
    }
  }

  private getColor(level: string): string {
    const colors: Record<string, string> = {
      error: '\x1b[31m', // red
      warn: '\x1b[33m', // yellow
      info: '\x1b[32m', // green
      debug: '\x1b[36m', // cyan
      verbose: '\x1b[35m', // magenta
      access: '\x1b[34m', // blue
    };
    return colors[level] || '\x1b[0m';
  }
}
