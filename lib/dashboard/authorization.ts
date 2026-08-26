import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/queries';
import { verifyPropertyAccess } from '@/lib/properties/queries';

export type PropertyPermission =
  | 'property.view'
  | 'property.update'
  | 'property.delete'
  | 'tenant.create'
  | 'tenant.update'
  | 'tenant.manage'
  | 'lease.create'
  | 'lease.update'
  | 'lease.manage'
  | 'financial.manage'
  | 'maintenance.create'
  | 'maintenance.manage'
  | 'inspection.create'
  | 'inspection.manage'
  | 'document.create'
  | 'document.manage'
  | 'task.create'
  | 'task.manage';

export async function requireAuthenticatedUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function requirePropertyAccess(propertyId: string) {
  const user = await requireAuthenticatedUser();
  const hasAccess = await verifyPropertyAccess(propertyId, user.id);
  if (!hasAccess) {
    throw new Error('Forbidden: no access to this property');
  }
  return user;
}

export async function requirePropertyPermission(propertyId: string, permission: PropertyPermission) {
  const user = await requirePropertyAccess(propertyId);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    'has_property_permission' as never,
    { p_property_id: propertyId, p_permission: permission } as never
  );

  if (error || !data) {
    throw new Error(`Forbidden: missing permission ${permission}`);
  }

  return user;
}
