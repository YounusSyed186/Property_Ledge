const isDebugEnabled = process.env.NEXT_PUBLIC_DEBUG === 'true';

export type AuthLogEvent =
  | 'AUTH_SIGNUP_STARTED'
  | 'AUTH_SIGNUP_SUCCESS'
  | 'AUTH_SIGNUP_FAILED'
  | 'AUTH_LOGIN_STARTED'
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILED'
  | 'AUTH_LOGOUT_STARTED'
  | 'AUTH_LOGOUT_SUCCESS'
  | 'AUTH_PASSWORD_RESET_REQUESTED'
  | 'AUTH_PASSWORD_RESET_COMPLETED'
  | 'PROFILE_LOAD_STARTED'
  | 'PROFILE_LOAD_SUCCESS'
  | 'PROFILE_LOAD_FAILED'
  | 'ACCOUNT_CONTEXT_LOAD_STARTED'
  | 'ACCOUNT_CONTEXT_LOAD_SUCCESS'
  | 'ACCOUNT_CONTEXT_LOAD_FAILED'
  // Phase 2: Subscription & Entitlement Debug Events
  | 'SUBSCRIPTION_LOAD_STARTED'
  | 'SUBSCRIPTION_LOAD_SUCCESS'
  | 'SUBSCRIPTION_LOAD_FAILED'
  | 'ENTITLEMENTS_LOAD_STARTED'
  | 'ENTITLEMENTS_LOAD_SUCCESS'
  | 'ENTITLEMENTS_LOAD_FAILED'
  | 'CHECKOUT_STARTED'
  | 'CHECKOUT_CREATED'
  | 'CHECKOUT_FAILED'
  | 'BILLING_WEBHOOK_RECEIVED'
  | 'BILLING_WEBHOOK_VALIDATED'
  | 'BILLING_WEBHOOK_PROCESSED'
  | 'BILLING_WEBHOOK_DUPLICATE'
  | 'BILLING_WEBHOOK_FAILED'
  | 'ADMIN_ACTION_EXECUTED'
  | 'ADMIN_ACTION_FAILED';

export function logAuthEvent(event: AuthLogEvent, details?: Record<string, unknown>) {
  if (!isDebugEnabled) return;

  const timestamp = new Date().toISOString();
  console.log(`[V3_AUTH_DEBUG][${timestamp}] ${event}`, details ? JSON.stringify(details, null, 2) : '');
}
