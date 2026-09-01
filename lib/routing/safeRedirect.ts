/**
 * Validates and sanitizes redirect paths to prevent open redirect vulnerabilities.
 * Only relative, internal paths beginning with a single '/' and not containing
 * protocol schemes or authority indicators (e.g. '//', '\\', 'javascript:') are permitted.
 */
export function safeRedirectPath(
  target: string | null | undefined,
  fallback = '/dashboard'
): string {
  if (!target || typeof target !== 'string') {
    return fallback;
  }

  const trimmed = target.trim();

  // Must start with '/' but not with '//' or '/\' (which browsers treat as protocol-relative)
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return fallback;
  }

  // Reject dangerous protocols and schemes encoded in path
  if (
    /^(?:[a-z0-9+.-]+:|\/\/|\\\\)/i.test(trimmed) ||
    /javascript:/i.test(trimmed) ||
    /data:/i.test(trimmed) ||
    /vbscript:/i.test(trimmed)
  ) {
    return fallback;
  }

  // Reject CR/LF header injection attempts
  if (/[\r\n]/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
