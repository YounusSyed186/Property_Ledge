/**
 * Centralized Configuration Layer.
 * Validates and provides typed access to environment variables,
 * preventing scattered process.env calls and secret leaks to client components.
 */

export const config = {
  supabase: {
    get url(): string {
      const val = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!val && typeof window === 'undefined') {
        return process.env.SUPABASE_URL || '';
      }
      return val || '';
    },
    get anonKey(): string {
      const val = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!val && typeof window === 'undefined') {
        return process.env.SUPABASE_ANON_KEY || '';
      }
      return val || '';
    },
    get serviceRoleKey(): string {
      if (typeof window !== 'undefined') {
        throw new Error('Security violation: Attempted to access SUPABASE_SERVICE_ROLE_KEY on the client.');
      }
      return process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    },
  },
  app: {
    get url(): string {
      return (
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000')
      );
    },
    get isDebug(): boolean {
      return process.env.NEXT_PUBLIC_DEBUG === 'true';
    },
    get isProduction(): boolean {
      return process.env.NODE_ENV === 'production';
    },
  },
  bank: {
    get accountName(): string {
      return process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME || 'PROPERTYLEDGE PTY LTD';
    },
    get bankName(): string {
      return process.env.NEXT_PUBLIC_BANK_NAME || 'National Australia Bank (NAB)';
    },
    get bsb(): string {
      return process.env.NEXT_PUBLIC_BANK_BSB || '083-004';
    },
    get accountNumber(): string {
      return process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER || '9876 54321';
    },
    get referencePrefix(): string {
      return process.env.NEXT_PUBLIC_BANK_REFERENCE_PREFIX || 'PL-2026-';
    },
  },
  email: {
    get resendApiKey(): string {
      if (typeof window !== 'undefined') return '';
      return process.env.RESEND_API_KEY || '';
    },
    get from(): string {
      return process.env.EMAIL_FROM || 'onboarding@resend.dev';
    },
    get fromName(): string {
      return process.env.EMAIL_FROM_NAME || 'PropertyLedge';
    },
    get redirectTo(): string | undefined {
      return process.env.EMAIL_REDIRECT_TO || undefined;
    },
  },
  admin: {
    get notifyEmail(): string {
      return process.env.ADMIN_NOTIFY_EMAIL || 'admin@propertyledge.com.au';
    },
    get adminEmails(): string[] {
      const raw = process.env.ADMIN_EMAILS || '';
      return raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
    },
  },
  billing: {
    get webhookSecret(): string {
      if (typeof window !== 'undefined') return '';
      return process.env.BILLING_WEBHOOK_SECRET || '';
    },
  },
};
