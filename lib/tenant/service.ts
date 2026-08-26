import { createClient } from '@/lib/supabase/server';
import { requireTenantContext } from './queries';
import type { Database } from '@/types/database';

type Tables = Database['public']['Tables'];

export async function createTenantMaintenanceRequest(
  input: Pick<
  Tables['maintenance_requests']['Insert'],
  'title' | 'description' | 'priority'
  >
) {
  const { user, tenant } = await requireTenantContext();
  const supabase = await createClient();

  const propertyId = (tenant as { property_id: string }).property_id;
  const tenantId = (tenant as { id: string }).id;

  const { data, error } = await supabase
    .from('maintenance_requests')
    .insert({
      property_id: propertyId,
      tenant_id: tenantId,
      title: input.title,
      description: input.description || '',
      priority: input.priority || 'medium',
      status: 'open',
      created_by: user.id,
    } as never)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateTenantProfile(input: {
  phone?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
}) {
  const { tenant } = await requireTenantContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tenants')
    .update({
      phone: input.phone,
      emergency_contact_name: input.emergency_contact_name,
      emergency_contact_phone: input.emergency_contact_phone,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', (tenant as { id: string }).id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function markTenantNotificationRead(notificationId: string) {
  const { user } = await requireTenantContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() } as never)
    .eq('id', notificationId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function markAllTenantNotificationsRead() {
  const { user } = await requireTenantContext();
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: now } as never)
    .eq('user_id', user.id)
    .is('read_at', null);

  if (error) throw new Error(error.message);
  return { success: true };
}
