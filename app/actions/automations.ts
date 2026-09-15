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
import { getAuDateParts, DEFAULT_AU_TIMEZONE } from '@/lib/format/australian-time';
import { emailService } from '@/lib/email/service';
import { PdfLeaseAdapter } from '@/lib/pdf/pdf-lease-adapter';
import { container } from '@/composition/container';

const isUuid = (val?: string | null): boolean =>
  typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

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
  leaseId?: string | null;
  invoiceTemplateId?: string | null;
  name: string;
  description?: string | null;
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
    if (error) {
      console.error('[fetchAutomationsAction] Query Error:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    return (data || []).map((row: any) => {
      const l = row.lease;
      const tRel = l?.lease_tenants?.[0];
      const t = tRel?.tenant;
      const metaName = row.metadata?.customerName || row.actions?.[0]?.params?.customerName;
      const metaEmail = row.metadata?.customerEmail || row.metadata?.tenantEmail || row.actions?.[0]?.params?.customerEmail || row.actions?.[0]?.params?.recipientEmail;
      const tenantName = t ? `${t.first_name || ''} ${t.last_name || ''}`.trim() : (metaName || 'Tenant');
      const tenantEmail = t?.email || metaEmail || undefined;

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
              tenantEmail,
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

export interface IssuerDetailsDTO {
  issuerName?: string;
  issuerEmail?: string;
  issuerPhone?: string;
  issuerAddress?: string;
  issuerTaxId?: string;
}

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
  issuedByOverride?: IssuerDetailsDTO;
  paymentDueDays?: number;
  emailSubject?: string;
  customMessage?: string;
  emailMessage?: string;
  driveFolderUrl?: string;
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

    const emailBodyMsg = dto.customMessage || dto.emailMessage;

    const metadata: Record<string, any> = {
      ...(dto.recipientOverride || {}),
      customerName: tenantName,
      customerEmail: tenantEmail,
      customerPhone: dto.recipientOverride?.tenantPhone || t?.phone,
      amount: dto.recipientOverride?.rentAmount !== undefined ? dto.recipientOverride.rentAmount : Number(lease.rent_amount || 0),
      issuedBy: dto.issuedByOverride || undefined,
      paymentDueDays: dto.paymentDueDays || 14,
      emailSubject: dto.emailSubject || undefined,
      customMessage: emailBodyMsg || undefined,
      emailMessage: emailBodyMsg || undefined,
      driveFolderUrl: dto.driveFolderUrl || undefined,
    };

    const { data: inserted, error: insertErr } = await (supabase as any)
      .from('automations')
      .insert({
        workspace_id: context.workspaceId,
        automation_type: 'lease',
        lease_id: dto.leaseId,
        invoice_template_id: isUuid(dto.invoiceTemplateId) ? dto.invoiceTemplateId : null,
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
              issuedBy: dto.issuedByOverride || undefined,
              dueDays: dto.paymentDueDays || 14,
              emailSubject: dto.emailSubject || undefined,
              customMessage: emailBodyMsg || undefined,
              emailMessage: emailBodyMsg || undefined,
              driveFolderUrl: dto.driveFolderUrl || undefined,
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
  issuedByOverride?: IssuerDetailsDTO;
  paymentDueDays?: number;
  emailSubject?: string;
  customMessage?: string;
  emailMessage?: string;
  driveFolderUrl?: string;
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

    const emailBodyMsg = dto.customMessage || dto.emailMessage;

    const { data: inserted, error: insertErr } = await (supabase as any)
      .from('automations')
      .insert({
        workspace_id: context.workspaceId,
        automation_type: 'invoice',
        lease_id: null,
        invoice_template_id: isUuid(dto.invoiceTemplateId) ? dto.invoiceTemplateId : null,
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
          issuedBy: dto.issuedByOverride || undefined,
          paymentDueDays: dto.paymentDueDays || 14,
          emailSubject: dto.emailSubject || undefined,
          customMessage: emailBodyMsg || undefined,
          emailMessage: emailBodyMsg || undefined,
          driveFolderUrl: dto.driveFolderUrl || undefined,
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
              issuedBy: dto.issuedByOverride || undefined,
              dueDays: dto.paymentDueDays || 14,
              emailSubject: dto.emailSubject || undefined,
              customMessage: emailBodyMsg || undefined,
              emailMessage: emailBodyMsg || undefined,
              driveFolderUrl: dto.driveFolderUrl || undefined,
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

export async function bulkDeleteAutomationsAction(ids: string[]) {
  try {
    if (!ids || ids.length === 0) return { success: true, count: 0 };
    const { context } = await getContext();
    const supabase = await createAdminClient();

    const { error } = await (supabase as any)
      .from('automations')
      .delete()
      .in('id', ids)
      .eq('workspace_id', context.workspaceId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/dashboard/automations');
    return { success: true, count: ids.length };
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

/**
 * Evaluates and executes any automations that are active and whose next_run_at is in the past (due).
 * Can be called automatically by the UI or cron to ensure reliable dispatch without manual triggers.
 */
export async function evaluateDueAutomationsAction() {
  try {
    const { context } = await getContext();
    const supabase = await createAdminClient();
    const nowIso = new Date().toISOString();

    const { data: dueAutomations, error: fetchErr } = await (supabase as any)
      .from('automations')
      .select(`
        *,
        lease:leases(*)
      `)
      .eq('workspace_id', context.workspaceId)
      .eq('status', 'active')
      .lte('next_run_at', nowIso)
      .limit(20);

    if (fetchErr || !dueAutomations || dueAutomations.length === 0) {
      return { success: true, evaluated: 0 };
    }

    const { automationExecutionService } = await createServerServices();
    let executedCount = 0;

    for (const rawAuto of dueAutomations) {
      const auto = rawAuto as any;
      const scheduledFor = auto.next_run_at || nowIso;
      const idempotencyKey = `auto_${auto.id}_${new Date(scheduledFor).getTime()}`;

      try {
        await automationExecutionService.executeAutomation({
          automationId: auto.id,
          triggerSource: 'scheduled',
          context: {
            leaseId: auto.lease_id,
            invoiceTemplateId: auto.invoice_template_id,
            workspaceId: auto.workspace_id,
            scheduledFor,
            ...(auto.metadata || {}),
          },
          idempotencyKey,
          sourceEntityType: auto.automation_type === 'lease' ? 'lease' : 'invoice',
          sourceEntityId: auto.lease_id || auto.id,
        });

        const nextRunAt = ScheduleCalculator.calculateNextRun(
          auto.schedule_type || 'monthly',
          auto.schedule_config || {},
          auto.lease?.start_date,
          auto.lease?.end_date
        );

        await (supabase as any)
          .from('automations')
          .update({
            last_run_at: nowIso,
            next_run_at: nextRunAt,
            status: nextRunAt ? 'active' : 'completed',
            updated_at: nowIso,
          })
          .eq('id', auto.id);

        executedCount++;
      } catch (err: any) {
        console.error(`[evaluateDueAutomationsAction] Error executing automation ${auto.id}:`, err);
      }
    }

    revalidatePath('/dashboard/automations');
    revalidatePath('/dashboard/invoices');
    return { success: true, evaluated: executedCount };
  } catch (err: any) {
    console.error('[evaluateDueAutomationsAction] General error:', err);
    return { success: false, error: err.message };
  }
}

export interface SendAutomationTestEmailDTO {
  automationType: 'lease' | 'invoice';
  testRecipient: string;
  leaseId?: string;
  leaseActionType?: string;
  invoiceTemplateId?: string;
  customerName?: string;
  customerEmail?: string;
  customerAddress?: string;
  description?: string;
  amount?: number;
  currency?: string;
  recipientOverride?: {
    tenantName?: string;
    tenantEmail?: string;
    tenantPhone?: string;
    rentAmount?: number;
  };
  issuedByOverride?: any;
  paymentDueDays?: number;
  emailSubject?: string;
  customMessage?: string;
  driveFolderUrl?: string;
}

export async function sendAutomationTestEmailAction(dto: SendAutomationTestEmailDTO) {
  try {
    const { user } = await getContext();
    const targetEmail = dto.testRecipient?.trim() || user.email;
    if (!targetEmail) {
      throw new Error('Please provide a valid test recipient email address');
    }

    const supabase = await createAdminClient();

    // 1. Lease Automation - Sending Lease Agreement Summary
    if (dto.automationType === 'lease' && dto.leaseActionType === 'send_lease') {
      let propertyName = 'Sample Property';
      let propertyAddress = '123 Sample St, Sydney NSW 2000';
      let tenantName = dto.recipientOverride?.tenantName || 'Valued Tenant';
      let startDate = '01/07/2025';
      let endDate = '30/06/2026';
      let rentAmount = dto.recipientOverride?.rentAmount || 650;
      let rentFrequency = 'weekly';
      let securityDeposit = 2600;
      let termsNotes = 'Standard residential tenancy terms.';

      if (dto.leaseId) {
        const { data: lease } = await (supabase as any)
          .from('leases')
          .select('*, property:properties(*), lease_tenants:lease_tenants(tenant:tenants(*))')
          .eq('id', dto.leaseId)
          .maybeSingle();

        if (lease) {
          propertyName = lease.property?.name || propertyName;
          propertyAddress = lease.property?.address_line1 || lease.property?.address || propertyAddress;
          const tenant = lease.lease_tenants?.[0]?.tenant;
          if (tenant) {
            tenantName = dto.recipientOverride?.tenantName || `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() || tenantName;
          }
          startDate = lease.start_date ? new Date(lease.start_date).toLocaleDateString('en-AU') : startDate;
          endDate = lease.end_date ? new Date(lease.end_date).toLocaleDateString('en-AU') : 'Periodic (Month-to-Month)';
          rentAmount = dto.recipientOverride?.rentAmount || Number(lease.rent_amount) || rentAmount;
          rentFrequency = lease.rent_frequency || rentFrequency;
          securityDeposit = Number(lease.security_deposit) || securityDeposit;
          termsNotes = lease.notes || termsNotes;
        }
      }

      // Generate PDF Lease Agreement
      const pdfBytes = await PdfLeaseAdapter.generate({
        leaseNumber: dto.leaseId ? dto.leaseId.slice(0, 8).toUpperCase() : 'PREVIEW',
        propertyName,
        propertyAddress,
        tenantName,
        tenantEmail: targetEmail,
        startDate,
        endDate,
        rentAmount,
        rentFrequency,
        depositAmount: securityDeposit,
        termsNotes,
      });

      const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
      const subject = dto.emailSubject?.trim()
        ? `[TEST EMAIL] ${dto.emailSubject}`
        : `[TEST EMAIL] Lease Agreement Summary — ${propertyName}`;

      const res = await emailService.sendEmail({
        to: targetEmail,
        subject,
        templateType: 'invoice_plain',
        variables: {
          body: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="background: #e6fffa; border: 1px solid #008F83; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
              <strong style="color: #008F83;">🧪 AUTOMATION TEST PREVIEW</strong>
              <p style="margin: 4px 0 0; font-size: 13px; color: #4a5568;">
                This is a simulated test delivery of your lease automation. Before activating, verify that the attachment and property details meet your requirements.
              </p>
            </div>
            <h2 style="color: #22333b;">Lease Agreement Summary</h2>
            <p>Hello <strong>${tenantName}</strong>,</p>
            <p>Please find your official Lease Agreement Summary attached for <strong>${propertyName}</strong>.</p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #e9ecef;">
              <p style="margin: 5px 0;"><strong>Property:</strong> ${propertyName} ${propertyAddress ? `(${propertyAddress})` : ''}</p>
              <p style="margin: 5px 0;"><strong>Lease Period:</strong> ${startDate} – ${endDate}</p>
              <p style="margin: 5px 0;"><strong>Rent:</strong> $${rentAmount.toLocaleString()} / ${rentFrequency}</p>
              ${dto.driveFolderUrl ? `<p style="margin: 5px 0;"><strong>Drive Records:</strong> <a href="${dto.driveFolderUrl}">${dto.driveFolderUrl}</a></p>` : ''}
            </div>
            ${dto.customMessage ? `<p style="background: #f1f5f9; padding: 12px; border-radius: 6px; font-style: italic;">"${dto.customMessage}"</p>` : ''}
            <p>Regards,<br/><strong>Property Ledge Team</strong></p>
          </div>`,
        },
        attachments: [
          {
            filename: `Test_Lease_${propertyName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
            content: pdfBase64,
          },
        ],
      });

      if (!res.success) throw new Error(res.error?.message || 'Failed to deliver test email');
      return { success: true, messageId: res.messageId, recipient: targetEmail };
    }

    // 2. Invoice Automation (or Lease Recurring Invoice Automation)
    const amount = Number(dto.amount) || Number(dto.recipientOverride?.rentAmount) || 500;
    const customer = dto.customerName || dto.recipientOverride?.tenantName || 'Sample Customer';
    const desc = dto.description || 'Monthly Lease & Property Services';
    const currency = dto.currency || 'AUD';
    const dueDays = dto.paymentDueDays || 14;
    const dueDate = new Date(Date.now() + dueDays * 86400000).toLocaleDateString('en-AU');

    const subject = dto.emailSubject?.trim()
      ? `[TEST EMAIL] ${dto.emailSubject}`
      : `[TEST EMAIL] Invoice Preview — ${desc} (${currency} $${amount.toFixed(2)})`;

    const customMsg = dto.customMessage || 'Thank you for your business. Please find your automated invoice attached.';

    const res = await emailService.sendEmail({
      to: targetEmail,
      subject,
      templateType: 'invoice_plain',
      variables: {
        body: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="background: #e6fffa; border: 1px solid #008F83; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
            <strong style="color: #008F83;">🧪 INVOICE AUTOMATION TEST PREVIEW</strong>
            <p style="margin: 4px 0 0; font-size: 13px; color: #4a5568;">
              This is a test preview of your recurring invoice automation. No charges or live invoices were created.
            </p>
          </div>
          <h2 style="color: #0f172a; margin-top: 0;">Tax Invoice</h2>
          <p>Hello <strong>${customer}</strong>,</p>
          <p>${customMsg}</p>
          <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 18px 0; border: 1px solid #e2e8f0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b;"><strong>Invoice #:</strong></td>
                <td style="padding: 6px 0; text-align: right; font-family: monospace; font-weight: bold;">INV-AUTO-TEST</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;"><strong>Description:</strong></td>
                <td style="padding: 6px 0; text-align: right;">${desc}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;"><strong>Due Date:</strong></td>
                <td style="padding: 6px 0; text-align: right;">${dueDate} (${dueDays} days terms)</td>
              </tr>
              <tr style="border-top: 2px solid #cbd5e1;">
                <td style="padding: 8px 0; font-size: 16px; font-weight: bold; color: #0f172a;">Total Amount Due:</td>
                <td style="padding: 8px 0; text-align: right; font-size: 18px; font-weight: 900; color: #008F83;">${currency} $${amount.toFixed(2)}</td>
              </tr>
            </table>
          </div>
          ${dto.driveFolderUrl ? `<p style="font-size: 12px; color: #64748b;">Document Repository: <a href="${dto.driveFolderUrl}">${dto.driveFolderUrl}</a></p>` : ''}
          <p style="font-size: 13px; color: #64748b; margin-top: 24px;">Issued by <strong>${dto.issuedByOverride?.name || 'Property Ledge Management'}</strong></p>
        </div>`,
      },
    });

    if (!res.success) throw new Error(res.error?.message || 'Failed to deliver test email');
    return { success: true, messageId: res.messageId, recipient: targetEmail };
  } catch (err: any) {
    console.error('[sendAutomationTestEmailAction] Error:', err);
    return { success: false, error: err.message || 'Failed to send test email' };
  }
}

export interface SendLeaseAgreementTestEmailDTO {
  testRecipient: string;
  propertyId?: string;
  propertyName?: string;
  propertyAddress?: string;
  tenantName: string;
  tenantEmail?: string;
  tenantPhone?: string;
  startDate: string;
  endDate?: string | null;
  rentAmount: number;
  rentFrequency: string;
  securityDeposit?: number;
  notes?: string;
  customMessage?: string;
  subject?: string;
}

export async function sendLeaseAgreementTestEmailAction(dto: SendLeaseAgreementTestEmailDTO) {
  try {
    const { user } = await getContext();
    const targetEmail = dto.testRecipient?.trim() || user.email;
    if (!targetEmail) {
      throw new Error('Please provide a valid test recipient email address');
    }

    const propName = dto.propertyName || 'Property';
    const propAddress = dto.propertyAddress || '';
    const tenant = dto.tenantName.trim() || 'Valued Tenant';
    const start = dto.startDate || new Date().toISOString().split('T')[0];
    const end = dto.endDate || 'Periodic (Month-to-Month)';
    const rent = Number(dto.rentAmount) || 0;
    const freq = dto.rentFrequency || 'weekly';

    // Generate standard PDF Lease Agreement
    const pdfBytes = await PdfLeaseAdapter.generate({
      leaseNumber: 'DRAFT-PREVIEW',
      propertyName: propName,
      propertyAddress: propAddress,
      tenantName: tenant,
      tenantEmail: dto.tenantEmail || targetEmail,
      tenantPhone: dto.tenantPhone,
      startDate: start,
      endDate: end,
      rentAmount: rent,
      rentFrequency: freq,
      depositAmount: Number(dto.securityDeposit) || 0,
      termsNotes: dto.notes,
    });

    const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
    const subject = dto.subject?.trim()
      ? (dto.subject.startsWith('[TEST EMAIL]') ? dto.subject : `[TEST EMAIL] ${dto.subject}`)
      : `[TEST EMAIL] Official Tenancy Agreement Summary — ${propName}`;

    const res = await emailService.sendEmail({
      to: targetEmail,
      subject,
      templateType: 'invoice_plain',
      variables: {
        body: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="background: #e6fffa; border: 1px solid #008F83; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
            <strong style="color: #008F83;">🧪 LEASE AGREEMENT TEST PREVIEW</strong>
            <p style="margin: 4px 0 0; font-size: 13px; color: #4a5568;">
              This is a test preview of the lease agreement email. Review the attached PDF summary to ensure all tenancy particulars and financials are accurate.
            </p>
          </div>
          <h2 style="color: #22333b;">Residential Lease Agreement Summary</h2>
          <p>Hello <strong>${tenant}</strong>,</p>
          <p>Please find your official Lease Agreement Summary attached for <strong>${propName}</strong>.</p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #e9ecef;">
            <p style="margin: 5px 0;"><strong>Property:</strong> ${propName} ${propAddress ? `(${propAddress})` : ''}</p>
            <p style="margin: 5px 0;"><strong>Lease Period:</strong> ${start} – ${end}</p>
            <p style="margin: 5px 0;"><strong>Rent:</strong> $${rent.toLocaleString()} / ${freq}</p>
            ${dto.securityDeposit ? `<p style="margin: 5px 0;"><strong>Security Bond:</strong> $${Number(dto.securityDeposit).toLocaleString()}</p>` : ''}
          </div>
          ${dto.customMessage ? `<p style="background: #f1f5f9; padding: 12px; border-radius: 6px; font-style: italic;">"${dto.customMessage}"</p>` : ''}
          <p>Regards,<br/><strong>Property Ledge Team</strong></p>
        </div>`,
      },
      attachments: [
        {
          filename: `Lease_Summary_${propName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
          content: pdfBase64,
        },
      ],
    });

    if (!res.success) throw new Error(res.error?.message || 'Failed to deliver test email');
    return { success: true, messageId: res.messageId, recipient: targetEmail };
  } catch (err: any) {
    console.error('[sendLeaseAgreementTestEmailAction] Error:', err);
    return { success: false, error: err.message || 'Failed to send test email' };
  }
}

