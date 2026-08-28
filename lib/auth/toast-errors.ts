import { getAuthorizationUserMessage, isAuthorizationError } from '@/lib/auth/errors';

type ToastFn = (title: string, message: string) => void;

export function toastAuthorizationError(error: unknown, toastError: ToastFn) {
  const message = getAuthorizationUserMessage(error);
  const title = isAuthorizationError(error)
    ? error.code === 'FEATURE_NOT_INCLUDED' || error.code === 'ENTITLEMENT_MISSING'
      ? 'Upgrade required'
      : error.code === 'LIMIT_REACHED'
        ? 'Limit reached'
        : error.code === 'PERMISSION_DENIED'
          ? 'Permission denied'
          : 'Access denied'
    : 'Error';
  toastError(title, message);
}

export function getActionErrorMessage(error: unknown): string {
  return getAuthorizationUserMessage(error);
}
