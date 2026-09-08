import { SupabaseClient } from '@supabase/supabase-js';
import {
  IAutomationRepository,
} from '../../domain/repositories/automation-repository';
import {
  Automation,
  CreateAutomationProps,
  UpdateAutomationProps,
} from '../../domain/entities/automation';
import { TriggerType } from '../../domain/types/trigger.types';

export class SupabaseAutomationRepository implements IAutomationRepository {
  constructor(private supabase: SupabaseClient) {}

  private mapRowToEntity(row: any): Automation {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      automationType: row.automation_type || (row.lease_id ? 'lease' : 'invoice'),
      leaseId: row.lease_id,
      invoiceTemplateId: row.invoice_template_id,
      name: row.name,
      description: row.description,
      triggerType: row.trigger_type,
      triggerConfig: row.trigger_config || {},
      scheduleType: row.schedule_type,
      scheduleConfig: row.schedule_config,
      conditions: row.conditions || { operator: 'AND', rules: [] },
      actions: row.actions || [],
      metadata: row.metadata || {},
      isActive: row.is_active ?? true,
      status: row.status || (row.is_active ? 'active' : 'paused'),
      createdBy: row.created_by,
      lastRunAt: row.last_run_at,
      nextRunAt: row.next_run_at,
      runCount: row.run_count ?? 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findById(id: string): Promise<Automation | null> {
    const { data, error } = await (this.supabase as any)
      .from('automations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find automation by ID ${id}: ${error.message}`);
    }

    return data ? this.mapRowToEntity(data) : null;
  }

  async findByWorkspaceId(workspaceId: string): Promise<Automation[]> {
    const { data, error } = await (this.supabase as any)
      .from('automations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list automations for workspace ${workspaceId}: ${error.message}`);
    }

    return (data || []).map((row: any) => this.mapRowToEntity(row));
  }

  async findActiveByTriggerType(triggerType: TriggerType, workspaceId?: string): Promise<Automation[]> {
    let query = (this.supabase as any)
      .from('automations')
      .select('*')
      .eq('is_active', true)
      .eq('trigger_type', triggerType);

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to find active automations by trigger type ${triggerType}: ${error.message}`);
    }

    return (data || []).map((row: any) => this.mapRowToEntity(row));
  }

  async findActiveByEventName(eventName: string, workspaceId?: string): Promise<Automation[]> {
    let query = (this.supabase as any)
      .from('automations')
      .select('*')
      .eq('is_active', true)
      .eq('trigger_type', 'event');

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to find automations for event ${eventName}: ${error.message}`);
    }

    // Filter rows where trigger_config->>eventName matches
    const filtered = (data || []).filter((row: any) => {
      const config = row.trigger_config;
      return config && config.eventName === eventName;
    });

    return filtered.map((row: any) => this.mapRowToEntity(row));
  }

  async create(props: CreateAutomationProps): Promise<Automation> {
    const { data, error } = await (this.supabase as any)
      .from('automations')
      .insert({
        workspace_id: props.workspaceId,
        name: props.name,
        description: props.description,
        trigger_type: props.triggerType,
        trigger_config: props.triggerConfig,
        conditions: props.conditions,
        actions: props.actions,
        is_active: props.isActive !== undefined ? props.isActive : true,
        created_by: props.createdBy,
        run_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to create automation: ${error.message}`);
    }

    return this.mapRowToEntity(data);
  }

  async update(id: string, props: UpdateAutomationProps): Promise<Automation> {
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (props.name !== undefined) updates.name = props.name;
    if (props.description !== undefined) updates.description = props.description;
    if (props.triggerType !== undefined) updates.trigger_type = props.triggerType;
    if (props.triggerConfig !== undefined) updates.trigger_config = props.triggerConfig;
    if (props.conditions !== undefined) updates.conditions = props.conditions;
    if (props.actions !== undefined) updates.actions = props.actions;
    if (props.isActive !== undefined) updates.is_active = props.isActive;

    const { data, error } = await (this.supabase as any)
      .from('automations')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to update automation ${id}: ${error.message}`);
    }

    return this.mapRowToEntity(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await (this.supabase as any)
      .from('automations')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete automation ${id}: ${error.message}`);
    }
  }

  async incrementRunCount(id: string, lastRunAt?: string): Promise<void> {
    const updates: Record<string, any> = {
      last_run_at: lastRunAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Get current count
    const { data } = await (this.supabase as any)
      .from('automations')
      .select('run_count')
      .eq('id', id)
      .single();

    const currentCount = data?.run_count || 0;
    updates.run_count = currentCount + 1;

    await (this.supabase as any)
      .from('automations')
      .update(updates)
      .eq('id', id);
  }
}
