import { requireAuthenticatedUser as requireAuthUser } from '@/lib/auth/authorization';
import { verifyPropertyAccess } from '@/lib/properties/queries';

export type PropertyPermission =
  | 'property.view'
  | 'property.update'
  | 'property.delete'
  | 'tenant.view'
  | 'tenant.create'
  | 'tenant.update'
  | 'tenant.delete'
  | 'tenant.manage'
  | 'lease.view'
  | 'lease.create'
  | 'lease.update'
  | 'lease.delete'
  | 'lease.manage'
  | 'financial.view'
  | 'financial.create'
  | 'financial.update'
  | 'financial.delete'
  | 'financial.manage'
  | 'maintenance.view'
  | 'maintenance.create'
  | 'maintenance.update'
  | 'maintenance.delete'
  | 'maintenance.manage'
  | 'inspection.view'
  | 'inspection.create'
  | 'inspection.update'
  | 'inspection.delete'
  | 'inspection.manage'
  | 'document.view'
  | 'document.create'
  | 'document.update'
  | 'document.delete'
  | 'document.manage'
  | 'task.view'
  | 'task.create'
  | 'task.update'
  | 'task.delete'
  | 'task.manage'
  | 'unit.view'
  | 'unit.create'
  | 'unit.update'
  | 'unit.delete'
  | 'unit.manage';

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
