type Level = 'debug' | 'info' | 'warn' | 'error';

function ts() {
  return new Date().toISOString();
}

function log(level: Level, ...args: any[]) {
  const prefix = `[${ts()}] [${level.toUpperCase()}]`;
  // eslint-disable-next-line no-console
  (console as any)[level] ? (console as any)[level](prefix, ...args) : console.log(prefix, ...args);
}

export const logger = {
  debug: (...args: any[]) => log('debug', ...args),
  info: (...args: any[]) => log('info', ...args),
  warn: (...args: any[]) => log('warn', ...args),
  error: (...args: any[]) => log('error', ...args),
};

export default logger;
