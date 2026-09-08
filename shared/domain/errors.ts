/**
 * Centralized Domain and Application Error Hierarchy.
 * Shields presentation and consumer code from raw database / provider errors.
 */

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'DATABASE_ERROR'
  | 'EXTERNAL_SERVICE_ERROR'
  | 'UNKNOWN_ERROR';

export abstract class DomainError extends Error {
  public abstract readonly code: ErrorCode;
  public readonly status: number;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, status: number = 400, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      status: this.status,
      details: this.details,
    };
  }
}

export class ValidationError extends DomainError {
  public readonly code: ErrorCode = 'VALIDATION_ERROR';
  constructor(message: string = 'Validation failed', details?: Record<string, unknown>) {
    super(message, 400, details);
  }
}

export class NotFoundError extends DomainError {
  public readonly code: ErrorCode = 'NOT_FOUND';
  constructor(entity: string, id?: string) {
    const message = id ? `${entity} with id "${id}" was not found.` : `${entity} was not found.`;
    super(message, 404, { entity, id });
  }
}

export class UnauthorizedError extends DomainError {
  public readonly code: ErrorCode = 'UNAUTHORIZED';
  constructor(message: string = 'Authentication is required.') {
    super(message, 401);
  }
}

export class ForbiddenError extends DomainError {
  public readonly code: ErrorCode = 'FORBIDDEN';
  constructor(message: string = 'You do not have permission to perform this action.') {
    super(message, 403);
  }
}

export class ConflictError extends DomainError {
  public readonly code: ErrorCode = 'CONFLICT';
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 409, details);
  }
}

export class DatabaseError extends DomainError {
  public readonly code: ErrorCode = 'DATABASE_ERROR';
  constructor(message: string = 'An unexpected database error occurred.', details?: Record<string, unknown>) {
    super(message, 500, details);
  }
}

export class ExternalServiceError extends DomainError {
  public readonly code: ErrorCode = 'EXTERNAL_SERVICE_ERROR';
  constructor(serviceName: string, message: string, details?: Record<string, unknown>) {
    super(`Service ${serviceName} error: ${message}`, 502, { serviceName, ...details });
  }
}

/**
 * Sanitizes any raw exception into a safe DomainError.
 * Prevents internal PostgreSQL, Supabase or server details from leaking to users.
 */
export function toSafeDomainError(error: unknown): DomainError {
  if (error instanceof DomainError) {
    return error;
  }

  const rawMessage = error instanceof Error ? error.message : String(error);

  // Common PostgreSQL/Supabase constraint detection
  if (rawMessage.includes('unique constraint') || rawMessage.includes('duplicate key')) {
    return new ConflictError('A record with this identifier or unique value already exists.');
  }

  if (rawMessage.includes('violates foreign key constraint')) {
    return new ConflictError('The operation references a related record that does not exist or has been deleted.');
  }

  if (rawMessage.includes('row-level security') || rawMessage.includes('RLS')) {
    return new ForbiddenError('Access denied by workspace security policy.');
  }

  if (rawMessage.includes('not found') || rawMessage.includes('JSON object requested, multiple (or no) rows returned')) {
    return new NotFoundError('Record');
  }

  return new DatabaseError('An internal processing error occurred.');
}
