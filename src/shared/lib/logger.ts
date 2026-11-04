type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function log(level: LogLevel, message: string, meta?: unknown): void {
  const prefix = `[CabFlo][${level}]`;
  if (meta !== undefined) {
    // eslint-disable-next-line no-console
    console[level === 'debug' ? 'log' : level](prefix, message, meta);
  } else {
    // eslint-disable-next-line no-console
    console[level === 'debug' ? 'log' : level](prefix, message);
  }
}

export const logger = {
  debug: (message: string, meta?: unknown) => log('debug', message, meta),
  info: (message: string, meta?: unknown) => log('info', message, meta),
  warn: (message: string, meta?: unknown) => log('warn', message, meta),
  error: (message: string, meta?: unknown) => log('error', message, meta),
};
