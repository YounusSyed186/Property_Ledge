import { requireAuthenticatedUser as requireAuthUser } from '@/lib/auth/authorization';
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

export { requireAuthenticatedUser } from '@/lib/auth/authorization';

export async function requirePropertyAccess(propertyId: string) {
  const user = await requireAuthUser();
  const hasAccess = await verifyPropertyAccess(propertyId, user.id);
  if (!hasAccess) {
    throw new Error('Forbidden: no access to this property');
  }
  return user;
}

export async function requirePropertyPermission(propertyId: string, permission: PropertyPermission) {
  const user = await requirePropertyAccess(propertyId);
  const { createClient } = await import('@/lib/supabase/server');
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
