export function mapAdminError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('duplicate key') || message.includes('entitlements_key_key')) {
    return 'An entitlement with this capability already exists.';
  }
  if (message.includes('ROLE_IN_USE')) {
    const match = message.match(/ROLE_IN_USE: (\d+)/);
    const count = match?.[1] || 'some';
    return `This role is still assigned to ${count} users and cannot be deleted.`;
  }
  if (message.includes('SYSTEM_ROLE')) {
    return 'System roles are managed by PropertyLedge and cannot be deleted.';
  }
  if (message.includes('foreign key') || message.includes('plan_entitlements')) {
    return 'This entitlement is still assigned to plans and cannot be deleted. Remove it from all plans first.';
  }
  if (message.includes('FORBIDDEN') || message.includes('UNAUTHORIZED')) {
    return "You don't have permission to perform this action.";
  }
  if (message.includes('NOT_FOUND')) {
    return 'The requested item could not be found.';
  }
  if (message.includes('PLAN_LINKED')) {
    return 'This entitlement is assigned to plans. Machine key and value type cannot be changed.';
  }

  return message;
}

export function formatEntitlementValue(
  valueType: string,
  rawValue: unknown
): string {
  if (rawValue === null || rawValue === undefined) return '—';
  let parsed = rawValue;
  if (typeof rawValue === 'string') {
    try {
      parsed = JSON.parse(rawValue);
    } catch {
      parsed = rawValue;
    }
  }
  if (valueType === 'boolean') {
    const bool = parsed === true || parsed === 'true' || parsed === 1;
    return bool ? 'Enabled' : 'Disabled';
  }
  if (valueType === 'number') {
    const num = Number(parsed);
    if (Number.isNaN(num)) return String(parsed);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)} TB`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)} GB`;
    return String(num);
  }
  return String(parsed);
}
