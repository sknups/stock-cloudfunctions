import { format, createLogger, transports } from 'winston';

const simpleFormat = format.printf(({ severity, message, timestamp, stack }) => {
  return `${timestamp} ${severity} ${message}${stack ? '\n' : ''}${stack || ''}`;
});

const gcpLogFormat = format((info) => {
  info.severity = info.level.toUpperCase();
  delete info.level;
  if (!info.stack && info.meta?.stack) {
    info.stack = info.meta.stack;
  }
  return info;
});

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  format: format.combine(
    gcpLogFormat(),
    format.timestamp(),
    format.errors({ stack: true }),
    (process.env.LOG_FORMAT || 'json') == 'json' ? format.json() : simpleFormat
  ),
  transports: [
    new transports.Console({ handleExceptions: true })
  ],
});

export default logger;
