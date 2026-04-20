/**
 * Simple logger with timestamps and log levels
 */

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

function log(level: LogLevel, message: string, data?: unknown): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}]`;

  if (data !== undefined) {
    console.log(`${prefix} ${message}`, typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

export const logger = {
  info: (message: string, data?: unknown) => log('INFO', message, data),
  warn: (message: string, data?: unknown) => log('WARN', message, data),
  error: (message: string, data?: unknown) => log('ERROR', message, data),
  debug: (message: string, data?: unknown) => log('DEBUG', message, data),
};
