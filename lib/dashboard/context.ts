import { createClient } from '@/lib/supabase/server';
import { verifyPropertyAccess } from '@/lib/properties/queries';

export interface FormContext {
  propertyId?: string;
  unitId?: string;
  tenantId?: string;
  leaseId?: string;
  propertyName?: string;
  unitName?: string;
  tenantName?: string;
}

export async function loadFormContext(
  userId: string,
  params: { propertyId?: string; unitId?: string; tenantId?: string; leaseId?: string }
): Promise<FormContext> {
  const supabase = await createClient();
  const ctx: FormContext = { ...params };

  if (params.propertyId) {
    const hasAccess = await verifyPropertyAccess(params.propertyId, userId);
    if (!hasAccess) throw new Error('Forbidden');

    const { data: property } = await supabase.from('properties').select('name').eq('id', params.propertyId).single();
    ctx.propertyName = (property as { name?: string } | null)?.name;
  }

  if (params.unitId) {
    const { data: unit } = await supabase.from('units').select('name, property_id').eq('id', params.unitId).single();
    const unitRow = unit as { name?: string; property_id?: string } | null;
    if (unitRow) {
      ctx.unitName = unitRow.name;
      if (!ctx.propertyId) ctx.propertyId = unitRow.property_id;
    }
  }

  if (params.tenantId) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('first_name, last_name, property_id')
      .eq('id', params.tenantId)
      .single();
    const tenantRow = tenant as { first_name?: string; last_name?: string; property_id?: string } | null;
    if (tenantRow) {
      ctx.tenantName = `${tenantRow.first_name || ''} ${tenantRow.last_name || ''}`.trim();
      if (!ctx.propertyId) ctx.propertyId = tenantRow.property_id;
    }
  }

  if (params.leaseId) {
    const { data: lease } = await supabase
      .from('leases')
      .select('property_id, unit_id')
      .eq('id', params.leaseId)
      .single();
    const leaseRow = lease as { property_id?: string; unit_id?: string | null } | null;
    if (leaseRow) {
      if (!ctx.propertyId) ctx.propertyId = leaseRow.property_id;
      if (!ctx.unitId && leaseRow.unit_id) ctx.unitId = leaseRow.unit_id;
    }
  }

  return ctx;
}
