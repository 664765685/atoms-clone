/**
 * Application error with HTTP status code and error code.
 * Use this for all business logic errors.
 */
export class AppError extends Error {
  /**
   * @param code - Machine-readable error code (e.g. "NOT_FOUND")
   * @param message - Human-readable error message
   * @param statusCode - HTTP status code (default: 400)
   */
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

/**
 * Type guard to check if a value is an AppError.
 * @param err - The value to check
 */
export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError
}

/**
 * Format any error into a standard API error response shape.
 * @param err - The error to format
 */
export function formatError(err: unknown): { error: string; code: string } {
  if (isAppError(err)) {
    return { error: err.message, code: err.code }
  }
  if (err instanceof Error) {
    return { error: err.message, code: 'INTERNAL_ERROR' }
  }
  return { error: 'An unexpected error occurred', code: 'UNKNOWN_ERROR' }
}
