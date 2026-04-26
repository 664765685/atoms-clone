type LogLevel = 'info' | 'warn' | 'error'

/** Simple structured logger */
const log = (level: LogLevel, message: string, meta?: unknown): void => {
  const timestamp = new Date().toISOString()
  const entry = {
    timestamp,
    level,
    message,
    ...(meta !== undefined ? { meta } : {}),
  }
  if (level === 'error') {
    process.stderr.write(JSON.stringify(entry) + '\n')
  } else {
    process.stdout.write(JSON.stringify(entry) + '\n')
  }
}

/**
 * Application logger with info/warn/error methods.
 */
export const logger = {
  /**
   * Log an informational message.
   * @param message - Log message
   * @param meta - Optional metadata
   */
  info: (message: string, meta?: unknown): void => log('info', message, meta),

  /**
   * Log a warning message.
   * @param message - Log message
   * @param meta - Optional metadata
   */
  warn: (message: string, meta?: unknown): void => log('warn', message, meta),

  /**
   * Log an error message.
   * @param message - Log message
   * @param meta - Optional metadata (include error objects here)
   */
  error: (message: string, meta?: unknown): void => log('error', message, meta),
}
