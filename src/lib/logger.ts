// /lib/logger.ts
export const log = {
  info: (...a: any[]) => process.env.LOG_LEVEL !== 'warn' && console.log(...a),
  warn: (...a: any[]) => console.warn(...a),
  debug: (...a: any[]) => process.env.LOG_LEVEL === 'debug' && console.debug(...a),
};

