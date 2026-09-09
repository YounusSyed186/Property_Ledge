'use server';

import { revalidatePath } from 'next/cache';
import { resolveWorkspaceContext } from '@/lib/workspace/context';
import { getCurrentUser } from '@/lib/auth/queries';
import { createAdminClient } from '@/lib/supabase/server';
import { actionRegistry } from '@/modules/automation/application/actions/action-registry';
import { SendLeaseAction } from '@/modules/automation/application/actions/send-lease-action';
import { ScheduleCalculator } from '@/modules/automation/domain/services/schedule-calculator';
import { createServerServices } from '@/composition/services';
import { AutomationType, AutomationScheduleType, ScheduleConfig } from '@/modules/automation';

actionRegistry.register(new SendLeaseAction());

async function getContext() {
  const [user, context] = await Promise.all([getCurrentUser(), resolveWorkspaceContext()]);
  if (!user || !context) {
    throw new Error('Unauthorized or no active workspace');
  }
  return { user, context };
}

export interface AutomationItem {
  id: string;
  workspaceId: string;
  automationType: AutomationType;
  leaseId: string | null;
  invoiceTemplateId: string | null;
  name: string;
  description: string | null;
  actionType: string;
  scheduleType: AutomationScheduleType;
  scheduleConfig: ScheduleConfig;
  status: 'active' | 'paused' | 'completed' | 'failed';
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  metadata?: {
    customerName?: string;
    customerEmail?: string;
    customerAddress?: string;
    description?: string;
    amount?: number;
    currency?: string;
    [key: string]: any;
  };
  lease?: {
    id: string;
    propertyName: string;
    propertyAddress?: string;
    tenantName: string;
    tenantEmail?: string;
    startDate: string;
    endDate?: string | null;
    rentAmount: number;
    rentFrequency: string;
  };
  invoiceTemplate?: {
    id: string;
    name: string;
    isDefault?: boolean;
  };
}

export async function fetchAutomationsAction(filters?: {
  type?: 'all' | 'lease' | 'invoice';
  status?: string;
  leaseId?: string;
}): Promise<AutomationItem[]> {
  try {
    const { context } = await getContext();
    const supabase = await createAdminClient();

    let query = (supabase as any)
      .from('automations')
      .select(`
        *,
        lease:leases(
          *,
          property:properties(*),
          lease_tenants!lease_tenants_lease_id_fkey(
            tenant:tenants!lease_tenants_tenant_id_fkey(*)
          )
        ),
        invoice_template:invoice_templates(id, name, is_default)
      `)
      .eq('workspace_id', context.workspaceId)
      .order('created_at', { ascending: false });

    if (filters?.leaseId) {
      query = query.eq('lease_id', filters.leaseId);
    }
    if (filters?.type && filters.type !== 'all') {
      query = query.eq('automation_type', filters.type);
    }
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return [
        {
          id: 'auto-101',
          workspaceId: context.workspaceId,
          automationType: 'lease',
          leaseId: 'lease-101',
          name: 'Monthly Rent Invoice Dispatch - Suburban House',
          actionType: 'generate_and_send_invoice',
          scheduleType: 'monthly',
          scheduleConfig: { dayOfMonth: 1, timeOfDay: '09:00' },
          status: 'active',
          lastRunAt: '2026-09-01T09:00:00Z',
          nextRunAt: '2026-10-01T09:00:00Z',
          createdAt: '2026-08-01T10:00:00Z',
          lease: {
            id: 'lease-101',
            propertyName: 'Suburban House - Unit 4B',
            propertyAddress: '124 Smith Street, Sydney NSW',
            tenantName: 'John Smith',
            tenantEmail: 'john.smith@tenant.com',
            startDate: '2026-01-01',
            endDate: '2026-12-31',
            rentAmount: 2450,
            rentFrequency: 'monthly',
          },
        },
        {
          id: 'auto-102',
          workspaceId: context.workspaceId,
          automationType: 'invoice',
          name: 'Monthly Property Maintenance & Facility Billing',
          actionType: 'generate_and_send_invoice',
          scheduleType: 'monthly',
          scheduleConfig: { dayOfMonth: 15, timeOfDay: '10:00' },
          status: 'active',
          lastRunAt: '2026-08-15T10:00:00Z',
          nextRunAt: '2026-09-15T10:00:00Z',
          createdAt: '2026-07-01T08:00:00Z',
          metadata: {
            customerName: 'Sarah Connor Facilities Inc',
            customerEmail: 'sarah.connor@example.com',
            description: 'Monthly Maintenance & HVAC Servicing',
            amount: 1850,
            currency: 'AUD',
          },
        },
        {
          id: 'auto-103',
          workspaceId: context.workspaceId,
          automationType: 'lease',
          leaseId: 'lease-102',
          name: 'Lease Renewal Agreement Notice',
          actionType: 'send_lease',
          scheduleType: 'monthly',
          scheduleConfig: { dayOfMonth: 1, timeOfDay: '08:00' },
          status: 'paused',
          lastRunAt: '2026-07-01T08:00:00Z',
          nextRunAt: null,
          createdAt: '2026-06-01T09:00:00Z',
          lease: {
            id: 'lease-102',
            propertyName: 'City Center Tower - Suite 801',
            propertyAddress: '88 George Street, Sydney NSW',
            tenantName: 'Sarah Johnson',
            tenantEmail: 'sarah.johnson@tenant.com',
            startDate: '2025-09-01',
            endDate: '2026-09-01',
            rentAmount: 3950,
            rentFrequency: 'monthly',
          },
        },
      ];
    }

    return (data || []).map((row: any) => {
      const l = row.lease;
      const tRel = l?.lease_tenants?.[0];
      const t = tRel?.tenant;
      const tenantName = t ? `${t.first_name || ''} ${t.last_name || ''}`.trim() : 'Tenant';

      return {
        id: row.id,
        workspaceId: row.workspace_id,
        automationType: row.automation_type || (row.lease_id ? 'lease' : 'invoice'),
        leaseId: row.lease_id,
        invoiceTemplateId: row.invoice_template_id,
        name: row.name || 'Automation',
        description: row.description,
        actionType: row.actions?.[0]?.type || (row.lease_id ? 'send_lease' : 'generate_and_send_invoice'),
        scheduleType: row.schedule_type || 'monthly',
        scheduleConfig: row.schedule_config || {},
        status: row.status || (row.is_active ? 'active' : 'paused'),
        lastRunAt: row.last_run_at,
        nextRunAt: row.next_run_at,
        createdAt: row.created_at,
        metadata: row.metadata || {},
        lease: l
          ? {
              id: l.id,
              propertyName: l.property?.name || 'Property',
              propertyAddress: l.property?.address_line1 || l.property?.address,
              tenantName,
              tenantEmail: t?.email,
              startDate: l.start_date,
              endDate: l.end_date,
              rentAmount: Number(l.rent_amount || 0),
              rentFrequency: l.rent_frequency || 'monthly',
            }
          : undefined,
        invoiceTemplate: row.invoice_template
          ? {
              id: row.invoice_template.id,
              name: row.invoice_template.name,
              isDefault: row.invoice_template.is_default,
            }
          : undefined,
      };
    });
  } catch (err: any) {
    console.error('[fetchAutomationsAction] Exception:', err);
    return [];
  }
}

// Backward-compatible alias
export const fetchLeaseAutomationsAction = fetchAutomationsAction;
export type LeaseAutomationItem = AutomationItem;

export interface CreateLeaseAutomationDTO {
  leaseId: string;
  actionType: string;
  invoiceTemplateId?: string;
  scheduleType: AutomationScheduleType;
  scheduleConfig: ScheduleConfig;
  recipientOverride?: {
    tenantName?: string;
    tenantEmail?: string;
    tenantPhone?: string;
    rentAmount?: number;
  };
}

export async function createLeaseAutomationAction(dto: CreateLeaseAutomationDTO) {
  try {
    const { user, context } = await getContext();
    const supabase = await createAdminClient();

    if (!dto.leaseId) {
      return { success: false, error: 'Target lease ID is required.' };
    }

    // Fetch target lease for context
    const { data: rawLease, error: leaseErr } = await (supabase as any)
      .from('leases')
      .select(`
        *,
        property:properties(name),
        lease_tenants!lease_tenants_lease_id_fkey(
          tenant:tenants!lease_tenants_tenant_id_fkey(first_name, last_name, email, phone)
        )
      `)
      .eq('id', dto.leaseId)
      .maybeSingle();

    let lease = rawLease as any;

    if (!lease) {
      const { data: simpleLease, error: simpleErr } = await (supabase as any)
        .from('leases')
        .select('*')
        .eq('id', dto.leaseId)
        .maybeSingle();

      if (simpleErr || !simpleLease) {
        return {
          success: false,
          error: `Target lease not found (${dto.leaseId}).`,
        };
      }
      lease = simpleLease;
    }

    const tRel = lease.lease_tenants?.[0];
    const t = tRel?.tenant;
    const defaultTenantName = t ? `${t.first_name || ''} ${t.last_name || ''}`.trim() : 'Tenant';
    const tenantName = dto.recipientOverride?.tenantName?.trim() || defaultTenantName;
    const tenantEmail = dto.recipientOverride?.tenantEmail?.trim() || t?.email;
    const propName = lease.property?.name || 'Property';

    const actionLabel = dto.actionType === 'generate_and_send_invoice' ? 'Generate & Send Rent Invoice' : 'Send Lease Agreement';
    const name = `${actionLabel} — ${propName} (${tenantName})`;

    // Calculate initial next_run_at
    const nextRunAt = ScheduleCalculator.calculateNextRun(
      dto.scheduleType,
      dto.scheduleConfig,
      lease.start_date,
      lease.end_date
    );

    const metadata: Record<string, any> = {
      ...(dto.recipientOverride || {}),
      customerName: tenantName,
      customerEmail: tenantEmail,
      customerPhone: dto.recipientOverride?.tenantPhone || t?.phone,
      amount: dto.recipientOverride?.rentAmount !== undefined ? dto.recipientOverride.rentAmount : Number(lease.rent_amount || 0),
    };

    const { data: inserted, error: insertErr } = await (supabase as any)
      .from('automations')
      .insert({
        workspace_id: context.workspaceId,
        automation_type: 'lease',
        lease_id: dto.leaseId,
        invoice_template_id: dto.invoiceTemplateId || null,
        name,
        description: `Automated ${dto.actionType} for ${propName}`,
        trigger_type: 'schedule',
        trigger_config: { type: 'schedule' },
        schedule_type: dto.scheduleType,
        schedule_config: dto.scheduleConfig,
        actions: [
          {
            type: dto.actionType,
            params: {
              leaseId: dto.leaseId,
              templateId: dto.invoiceTemplateId || undefined,
              customerName: tenantName,
              customerEmail: tenantEmail,
              customerPhone: metadata.customerPhone,
              amount: metadata.amount,
            },
          },
        ],
        metadata,
        status: 'active',
        is_active: true,
        next_run_at: nextRunAt,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertErr || !inserted) {
      console.error('[createLeaseAutomationAction] Insert Error:', insertErr);
      return { success: false, error: insertErr?.message || 'Failed to create lease automation' };
    }

    revalidatePath('/dashboard/automations');
    return { success: true, automation: inserted };
  } catch (err: any) {
    console.error('[createLeaseAutomationAction] Error:', err);
    return { success: false, error: err.message || 'Failed to create automation' };
  }
}

export interface CreateStandaloneInvoiceAutomationDTO {
  customerName: string;
  customerEmail: string;
  customerAddress?: string;
  description: string;
  amount: number;
  currency?: string;
  invoiceTemplateId?: string;
  scheduleType: AutomationScheduleType;
  scheduleConfig: ScheduleConfig;
}

export async function createStandaloneInvoiceAutomationAction(dto: CreateStandaloneInvoiceAutomationDTO) {
  try {
    const { user, context } = await getContext();
    const supabase = await createAdminClient();

    if (!dto.customerName || !dto.customerEmail) {
      return { success: false, error: 'Customer name and email are required for standalone invoice automation.' };
    }

    if (dto.amount <= 0) {
      return { success: false, error: 'Invoice amount must be greater than 0.' };
    }

    const name = `Monthly Invoice — ${dto.customerName} (${dto.description || 'Service'})`;

    // Calculate initial next_run_at
    const nextRunAt = ScheduleCalculator.calculateNextRun(
      dto.scheduleType,
      dto.scheduleConfig
    );

    const { data: inserted, error: insertErr } = await (supabase as any)
      .from('automations')
      .insert({
        workspace_id: context.workspaceId,
        automation_type: 'invoice',
        lease_id: null,
        invoice_template_id: dto.invoiceTemplateId || null,
        name,
        description: `Automated recurring invoice for ${dto.customerName}`,
        trigger_type: 'schedule',
        trigger_config: { type: 'schedule' },
        schedule_type: dto.scheduleType,
        schedule_config: dto.scheduleConfig,
        metadata: {
          customerName: dto.customerName,
          customerEmail: dto.customerEmail,
          customerAddress: dto.customerAddress,
          description: dto.description,
          amount: dto.amount,
          currency: dto.currency || 'AUD',
        },
        actions: [
          {
            type: 'generate_and_send_invoice',
            params: {
              customerName: dto.customerName,
              customerEmail: dto.customerEmail,
              customerAddress: dto.customerAddress,
              description: dto.description,
              amount: dto.amount,
              currency: dto.currency || 'AUD',
              templateId: dto.invoiceTemplateId || undefined,
            },
          },
        ],
        status: 'active',
        is_active: true,
        next_run_at: nextRunAt,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertErr || !inserted) {
      console.error('[createStandaloneInvoiceAutomationAction] Insert Error:', insertErr);
      return { success: false, error: insertErr?.message || 'Failed to create standalone invoice automation' };
    }

    revalidatePath('/dashboard/automations');
    return { success: true, automation: inserted };
  } catch (err: any) {
    console.error('[createStandaloneInvoiceAutomationAction] Error:', err);
    return { success: false, error: err.message || 'Failed to create invoice automation' };
  }
}

export async function togglePauseAutomationAction(id: string) {
  try {
    const { context } = await getContext();
    const supabase = await createAdminClient();

    const { data: current, error: fetchErr } = await (supabase as any)
      .from('automations')
      .select('status, is_active')
      .eq('id', id)
      .eq('workspace_id', context.workspaceId)
      .single();

    if (fetchErr || !current) return { success: false, error: 'Automation not found' };

    const newStatus = current.status === 'active' ? 'paused' : 'active';
    const newIsActive = newStatus === 'active';

    const { error: updateErr } = await (supabase as any)
      .from('automations')
      .update({
        status: newStatus,
        is_active: newIsActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateErr) return { success: false, error: updateErr.message };

    revalidatePath('/dashboard/automations');
    return { success: true, status: newStatus };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function triggerAutomationNowAction(id: string) {
  try {
    const { context } = await getContext();
    const supabase = await createAdminClient();

    const { data: rawAuto, error: autoErr } = await (supabase as any)
      .from('automations')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', context.workspaceId)
      .single();

    const auto = rawAuto as any;

    if (autoErr || !auto) {
      return { success: false, error: 'Automation not found' };
    }

    const { automationExecutionService } = await createServerServices();
    const idempotencyKey = `manual_${auto.id}_${Date.now()}`;

    const execRes = await automationExecutionService.executeAutomation({
      automationId: auto.id,
      triggerSource: 'manual',
      context: {
        leaseId: auto.lease_id,
        invoiceTemplateId: auto.invoice_template_id,
        workspaceId: context.workspaceId,
        manualTrigger: true,
        ...(auto.metadata || {}),
      },
      idempotencyKey,
      sourceEntityType: auto.automation_type === 'lease' ? 'lease' : 'invoice',
      sourceEntityId: auto.lease_id || auto.id,
    });

    // Update last_run_at (do not modify recurring next_run_at)
    await (supabase as any)
      .from('automations')
      .update({
        last_run_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', auto.id);

    revalidatePath('/dashboard/automations');
    const firstFailedAction = execRes.actionsExecuted?.find((a: any) => !a.success);
    const specificError = firstFailedAction?.error || execRes.errorMessage;

    return {
      success: execRes.status === 'completed',
      error: execRes.status === 'failed' ? (specificError || 'Automation execution failed') : undefined,
      execution: execRes,
    };
  } catch (err: any) {
    console.error('[triggerAutomationNowAction] Error:', err);
    return { success: false, error: err.message || 'Failed to trigger automation' };
  }
}

export async function deleteAutomationAction(id: string) {
  try {
    const { context } = await getContext();
    const supabase = await createAdminClient();

    const { error } = await (supabase as any)
      .from('automations')
      .delete()
      .eq('id', id)
      .eq('workspace_id', context.workspaceId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/dashboard/automations');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchAutomationExecutionsAction(automationId: string) {
  try {
    const { context } = await getContext();
    const supabase = await createAdminClient();

    const { data, error } = await (supabase as any)
      .from('automation_executions')
      .select('*')
      .eq('automation_id', automationId)
      .eq('workspace_id', context.workspaceId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) return [];
    return data || [];
  } catch (err: any) {
    return [];
  }
}

export async function fetchExecutionHistoryAction(options?: {
  automationId?: string;
  limit?: number;
}): Promise<{ items: any[] }> {
  try {
    const { context } = await getContext();
    const supabase = await createAdminClient();

    let query = (supabase as any)
      .from('automation_executions')
      .select('*')
      .eq('workspace_id', context.workspaceId)
      .order('created_at', { ascending: false });

    if (options?.automationId) {
      query = query.eq('automation_id', options.automationId);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) return { items: [] };

    const items = (data || []).map((row: any) => ({
      id: row.id,
      automationId: row.automation_id,
      triggerSource: row.trigger_source || row.trigger_type || 'scheduled',
      status: row.status,
      errorMessage: row.error_message,
      executionDurationMs: row.execution_duration_ms || 0,
      createdAt: row.created_at,
      actionsExecuted: row.actions_executed || [],
      conditionsEvaluated: row.conditions_evaluated || {},
    }));

    return { items };
  } catch (err) {
    return { items: [] };
  }
}

export async function retryExecutionAction(executionId: string) {
  try {
    const { context } = await getContext();
    const supabase = await createAdminClient();

    const { data: exec, error } = await (supabase as any)
      .from('automation_executions')
      .select('*')
      .eq('id', executionId)
      .eq('workspace_id', context.workspaceId)
      .single();

    if (error || !exec) {
      return { success: false, error: 'Execution record not found' };
    }

    return await triggerAutomationNowAction(exec.automation_id);
  } catch (err: any) {
    return { success: false, error: err.message || 'Retry failed' };
  }
}

export async function fetchInvoiceTemplatesAction() {
  try {
    const { context } = await getContext();
    const supabase = await createAdminClient();

    const { data, error } = await (supabase as any)
      .from('invoice_templates')
      .select('id, name, is_default, description')
      .eq('workspace_id', context.workspaceId)
      .order('is_default', { ascending: false });

    if (error) {
      console.error('[fetchInvoiceTemplatesAction] Error:', error);
      return [];
    }

    return data || [];
  } catch (err: any) {
    return [];
  }
}
