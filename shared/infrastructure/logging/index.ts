/**
 * Centralized Logging Abstraction.
 * Ensures contextual, structured logging without scattering unstructured console calls
 * or leaking passwords, tokens, or personal identifiers.
 */

export interface LogContext {
  requestId?: string;
  userId?: string;
  workspaceId?: string;
  module?: string;
  operation?: string;
  [key: string]: unknown;
}

export interface ILogger {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: unknown, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'secret',
  'authorization',
  'apiKey',
  'serviceRoleKey',
  'anonKey',
  'creditCard',
  'otp',
]);

function sanitize(obj: unknown, depth = 0): unknown {
  if (depth > 4 || obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitize(item, depth + 1));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitize(value, depth + 1);
    } else {
      result[key] = value;
    }
  }
  return result;
}

class StandardLogger implements ILogger {
  constructor(private readonly defaultContext?: LogContext) {}

  public forModule(moduleName: string): ILogger {
    return new StandardLogger({ ...this.defaultContext, module: moduleName });
  }

  public info(message: string, context?: LogContext): void {
    const payload = sanitize({ ...this.defaultContext, ...context });
    console.log(`[INFO] ${message}`, Object.keys(payload as object).length ? payload : '');
  }

  public warn(message: string, context?: LogContext): void {
    const payload = sanitize({ ...this.defaultContext, ...context });
    console.warn(`[WARN] ${message}`, Object.keys(payload as object).length ? payload : '');
  }

  public error(message: string, error?: unknown, context?: LogContext): void {
    const errMessage = error instanceof Error ? error.message : String(error || '');
    const stack = error instanceof Error ? error.stack : undefined;
    const payload = sanitize({
      ...this.defaultContext,
      ...context,
      errorMessage: errMessage,
      stack,
    });
    console.error(`[ERROR] ${message}`, payload);
  }

  public debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_DEBUG === 'true') {
      const payload = sanitize({ ...this.defaultContext, ...context });
      console.debug(`[DEBUG] ${message}`, Object.keys(payload as object).length ? payload : '');
    }
  }
}

export const logger = new StandardLogger();
export function createModuleLogger(moduleName: string): ILogger {
  return new StandardLogger({ module: moduleName });
}
