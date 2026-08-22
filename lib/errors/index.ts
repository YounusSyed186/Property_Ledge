export function mapAuthError(error: unknown): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  const message = typeof error === 'string' ? error : (error as { message?: string }).message || '';

  if (message.includes('Invalid login credentials')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }

  if (message.includes('Email not confirmed')) {
    return 'Your email address has not been verified yet. Please check your inbox for the verification email.';
  }

  if (message.includes('User already registered')) {
    return 'An account with this email address already exists. Please log in instead.';
  }

  if (message.includes('Password should be at least')) {
    return 'Password is too weak. It must be at least 6 characters long.';
  }

  if (message.includes('Token has expired')) {
    return 'The verification or reset link has expired. Please request a new one.';
  }

  if (message.includes('FetchError') || message.includes('Failed to fetch')) {
    return 'Network connection error. Please check your internet connection and try again.';
  }

  // Phase 2 Errors
  if (message.includes('SUBSCRIPTION_NOT_FOUND')) {
    return 'We couldn\'t load your subscription details.';
  }

  if (message.includes('FEATURE_NOT_AVAILABLE')) {
    return 'This feature isn\'t available on your current plan.';
  }

  if (message.includes('LIMIT_EXCEEDED')) {
    return 'You\'ve reached the current limit for this feature on your plan.';
  }

  if (message.includes('UNAUTHORIZED_ADMIN')) {
    return 'You do not have administrative permissions to perform this operation.';
  }

  return message || 'An unexpected error occurred. Please try again.';
}
