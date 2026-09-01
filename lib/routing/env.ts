export interface EnvContext {
  NEXT_PUBLIC_APP_URL?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  NEXT_PUBLIC_VERCEL_URL?: string;
  VERCEL_URL?: string;
  NODE_ENV?: string;
}

/**
 * Validates and sanitizes a candidate base URL.
 * Returns the normalized URL string without trailing slashes, or null if invalid.
 */
export function validateAndSanitizeUrl(
  rawCandidate: string | undefined | null,
  options?: { requireHttpsInProduction?: boolean; isProduction?: boolean }
): string | null {
  if (!rawCandidate) return null;

  const trimmed = rawCandidate.trim();
  if (!trimmed) return null;

  // Reject CRLF or control characters (0x00-0x1F, 0x7F)
  if (/[\r\n\t\x00-\x1F\x7F]/.test(trimmed)) {
    return null;
  }

  // Reject protocol-relative attempts (e.g. "//evil.com" or "/\\evil.com")
  if (trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return null;
  }

  // If candidate has any scheme prefix (anything with a colon before a slash)
  const schemeMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  let withScheme = trimmed;
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase();
    if (scheme !== 'http' && scheme !== 'https') {
      return null;
    }
  } else {
    // No scheme provided - candidate should be a domain name or host:port
    withScheme = `https://${trimmed}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return null;
  }

  // Enforce http: or https: protocol
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null;
  }

  // Disallow user credentials
  if (parsed.username || parsed.password) {
    return null;
  }

  // Disallow empty host or space in hostname
  if (!parsed.hostname || parsed.hostname.includes(' ')) {
    return null;
  }

  const isProd = options?.isProduction ?? (process.env.NODE_ENV === 'production');
  const requireHttps = options?.requireHttpsInProduction ?? true;

  // In production:
  if (isProd) {
    // Require HTTPS
    if (requireHttps && parsed.protocol !== 'https:') {
      return null;
    }
    // Reject localhost / loopback in production
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return null;
    }
    // Reject bare words without domain dots in production (e.g. "not-a-valid-url")
    if (!parsed.hostname.includes('.')) {
      return null;
    }
  }

  // Remove trailing slashes and return clean base URL
  const pathname = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, '');
  const normalized = `${parsed.origin}${pathname}`;
  return normalized;
}

/**
 * Centralized deterministic application base URL resolver.
 *
 * Precedence:
 * 1. NEXT_PUBLIC_APP_URL (Explicit canonical public app URL)
 * 2. NEXT_PUBLIC_SITE_URL (Explicit site URL)
 * 3. NEXT_PUBLIC_VERCEL_URL (Vercel deployment domain)
 * 4. VERCEL_URL (Vercel system deployment domain)
 *
 * In Production:
 * - A valid public HTTPS URL MUST be resolved.
 * - If no valid public URL exists, an explicit Configuration Error is thrown.
 * - NEVER falls back to localhost:3000.
 *
 * In Development:
 * - If configured, uses the valid configured URL.
 * - If omitted, falls back to http://localhost:3000.
 */
export function getAppBaseUrl(envOverrides?: EnvContext): string {
  const env = envOverrides ?? process.env;
  const isProduction = (env.NODE_ENV ?? process.env.NODE_ENV) === 'production';

  // 1. Try NEXT_PUBLIC_APP_URL
  const appUrl = validateAndSanitizeUrl(env.NEXT_PUBLIC_APP_URL, { isProduction });
  if (appUrl) return appUrl;

  // 2. Try NEXT_PUBLIC_SITE_URL
  const siteUrl = validateAndSanitizeUrl(env.NEXT_PUBLIC_SITE_URL, { isProduction });
  if (siteUrl) return siteUrl;

  // 3. Try NEXT_PUBLIC_VERCEL_URL
  const publicVercelUrl = validateAndSanitizeUrl(env.NEXT_PUBLIC_VERCEL_URL, { isProduction });
  if (publicVercelUrl) return publicVercelUrl;

  // 4. Try VERCEL_URL
  const vercelUrl = validateAndSanitizeUrl(env.VERCEL_URL, { isProduction });
  if (vercelUrl) return vercelUrl;

  // In Production: Fail fast with an explicit configuration error
  if (isProduction) {
    throw new Error(
      'Missing or invalid production application URL. Configure NEXT_PUBLIC_APP_URL or NEXT_PUBLIC_SITE_URL with a valid HTTPS domain (e.g., https://propertyledge.com).'
    );
  }

  // In Development: Fall back to localhost
  return 'http://localhost:3000';
}
