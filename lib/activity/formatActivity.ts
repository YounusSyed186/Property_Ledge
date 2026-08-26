export interface ActivityLogEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  user?: { full_name?: string | null; email?: string | null } | null;
  property?: { name?: string | null } | null;
}

const ENTITY_LABELS: Record<string, string> = {
  property: 'property',
  unit: 'unit',
  tenant: 'tenant',
  lease: 'lease',
  invoice: 'invoice',
  payment: 'payment',
  expense: 'expense',
  maintenance_request: 'maintenance request',
  inspection: 'inspection',
  document: 'document',
  task: 'task',
  workspace_member: 'team member',
  property_member: 'property member',
};

const ACTION_VERBS: Record<string, string> = {
  created: 'created',
  updated: 'updated',
  deleted: 'deleted',
  archived: 'archived',
  cancelled: 'cancelled',
  voided: 'voided',
  invited: 'invited',
  accepted: 'accepted',
  removed: 'removed',
};

function labelForEntity(entityType: string) {
  return ENTITY_LABELS[entityType] || entityType.replace(/_/g, ' ');
}

function verbForAction(action: string) {
  return ACTION_VERBS[action] || action.replace(/_/g, ' ');
}

function actorLabel(entry: ActivityLogEntry) {
  return entry.user?.full_name || entry.user?.email || 'Someone';
}

export function formatActivityEntry(entry: ActivityLogEntry): string {
  const entity = labelForEntity(entry.entity_type);
  const verb = verbForAction(entry.action);
  const actor = actorLabel(entry);
  const propertySuffix = entry.property?.name ? ` at ${entry.property.name}` : '';

  if (entry.entity_type === 'workspace_member' || entry.entity_type === 'property_member') {
    const invitee = (entry.metadata?.email as string) || (entry.metadata?.inviteeEmail as string);
    if (entry.action === 'invited' && invitee) {
      return `${actor} invited ${invitee} to the ${entity}${propertySuffix}`;
    }
  }

  if (entry.action === 'created' && entry.entity_type === 'maintenance_request') {
    const title = entry.metadata?.title as string | undefined;
    if (title) return `${actor} submitted maintenance request "${title}"${propertySuffix}`;
  }

  if (entry.action === 'created' && entry.entity_type === 'invoice') {
    const amount = entry.metadata?.amount as number | string | undefined;
    if (amount) return `${actor} created an invoice for ${amount}${propertySuffix}`;
  }

  const shortId = entry.entity_id ? ` (${entry.entity_id.slice(0, 8)})` : '';
  return `${actor} ${verb} ${entity}${shortId}${propertySuffix}`;
}

export function formatActivityTimestamp(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function humanizeActivityLog(entry: ActivityLogEntry) {
  return {
    id: entry.id,
    message: formatActivityEntry(entry),
    timestamp: formatActivityTimestamp(entry.created_at),
    raw: entry,
  };
}
