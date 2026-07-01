import pino from 'pino';
import { env } from './env';

export const logger = pino({
  level: env.LOG_LEVEL,
  transport:
    env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  base: {
    env: env.NODE_ENV,
    service: 'smart-pharmacy-api',
  },
  redact: {
    paths: ['req.headers.authorization', 'body.password', 'body.new_password'],
    censor: '[REDACTED]',
  },
});
