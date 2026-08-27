export type AuthorizationErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'NOT_WORKSPACE_MEMBER'
  | 'MEMBERSHIP_SUSPENDED'
  | 'PERMISSION_DENIED'
  | 'FEATURE_NOT_INCLUDED'
  | 'ENTITLEMENT_MISSING'
  | 'LIMIT_REACHED'
  | 'INVALID_ROLE'
  | 'ROLE_NOT_IN_WORKSPACE'
  | 'SYSTEM_ROLE_PROTECTED'
  | 'INVITATION_EXPIRED'
  | 'INVITATION_REVOKED'
  | 'INVITATION_ALREADY_ACCEPTED'
  | 'RESOURCE_ACCESS_DENIED';

export class AuthorizationError extends Error {
  readonly code: AuthorizationErrorCode;
  readonly meta?: Record<string, unknown>;

  constructor(code: AuthorizationErrorCode, message: string, meta?: Record<string, unknown>) {
    super(message);
    this.name = 'AuthorizationError';
    this.code = code;
    this.meta = meta;
  }
}

export function isAuthorizationError(error: unknown): error is AuthorizationError {
  return error instanceof AuthorizationError;
}

export function getAuthorizationUserMessage(error: unknown): string {
  if (!isAuthorizationError(error)) {
    return error instanceof Error ? error.message : 'Something went wrong.';
  }

  switch (error.code) {
    case 'FEATURE_NOT_INCLUDED':
    case 'ENTITLEMENT_MISSING':
      return "This feature isn't included in your workspace's current plan.";
    case 'PERMISSION_DENIED':
      return "Your role doesn't have permission to do this. Contact your workspace administrator.";
    case 'LIMIT_REACHED':
      return error.message;
    case 'NOT_WORKSPACE_MEMBER':
      return "You don't have access to this workspace.";
    case 'MEMBERSHIP_SUSPENDED':
      return 'Your workspace membership is suspended.';
    default:
      return error.message;
  }
}
