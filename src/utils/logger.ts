import pino from 'pino';

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

export const logger = pino({
  level: LOG_LEVEL,
  transport: process.env.NODE_ENV === 'production' 
    ? undefined 
    : { target: 'pino-pretty', options: { colorize: true } },
  redact: {
    paths: ['ST_CLIENT_ID', 'ST_CLIENT_SECRET', 'ST_APP_KEY', 'access_token', 'Authorization'],
    censor: '[REDACTED]',
  },
  base: {
    pid: process.pid,
    service: 'servicetitan-mcp',
  },
});

// Helper for tool-specific logging
export function createToolLogger(toolName: string) {
  return logger.child({ tool: toolName });
}

export default logger;