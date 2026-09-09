import { SupabaseClient } from '@supabase/supabase-js';
import {
  IAutomationExecutionRepository,
  ExecutionFilters,
} from '../../domain/repositories/automation-execution-repository';
import {
  AutomationExecution,
  CreateExecutionProps,
} from '../../domain/entities/automation-execution';

export class SupabaseAutomationExecutionRepository implements IAutomationExecutionRepository {
  constructor(private supabase: SupabaseClient) {}

  private mapRowToEntity(row: any): AutomationExecution {
    const summary = row.result_summary || {};
    return {
      id: row.id,
      automationId: row.automation_id,
      workspaceId: row.workspace_id,
      triggerSource: row.trigger_source,
      sourceEntityType: row.source_entity_type || null,
      sourceEntityId: row.source_entity_id || null,
      status: row.status,
      conditionsEvaluated: row.conditions_evaluated || summary.conditionsEvaluated || {},
      actionsExecuted: row.actions_executed || summary.actionsExecuted || [],
      errorMessage: row.error_message,
      executionDurationMs: row.execution_duration_ms || null,
      idempotencyKey: row.idempotency_key,
      createdAt: row.created_at,
    };
  }

  async findById(id: string): Promise<AutomationExecution | null> {
    const { data, error } = await (this.supabase as any)
      .from('automation_executions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find execution by ID ${id}: ${error.message}`);
    }

    return data ? this.mapRowToEntity(data) : null;
  }

  async findByWorkspaceId(filters: ExecutionFilters): Promise<{ items: AutomationExecution[]; total: number }> {
    let query = (this.supabase as any)
      .from('automation_executions')
      .select('*', { count: 'exact' })
      .eq('workspace_id', filters.workspaceId);

    if (filters.automationId) {
      query = query.eq('automation_id', filters.automationId);
    }

    query = query.order('created_at', { ascending: false });

    if (filters.limit) {
      const offset = filters.offset || 0;
      query = query.range(offset, offset + filters.limit - 1);
    }

    const { data, error, count } = await query;
    if (error) {
      throw new Error(`Failed to find executions: ${error.message}`);
    }

    return {
      items: (data || []).map((row: any) => this.mapRowToEntity(row)),
      total: count || 0,
    };
  }

  async findByAutomationId(automationId: string, limit = 20): Promise<AutomationExecution[]> {
    const { data, error } = await (this.supabase as any)
      .from('automation_executions')
      .select('*')
      .eq('automation_id', automationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to find executions for automation ${automationId}: ${error.message}`);
    }

    return (data || []).map((row: any) => this.mapRowToEntity(row));
  }

  async findByIdempotencyKey(key: string): Promise<AutomationExecution | null> {
    const { data, error } = await (this.supabase as any)
      .from('automation_executions')
      .select('*')
      .eq('idempotency_key', key)
      .maybeSingle();

    if (error) {
      return null;
    }

    return data ? this.mapRowToEntity(data) : null;
  }

  async create(props: CreateExecutionProps): Promise<AutomationExecution> {
    const payload: Record<string, any> = {
      automation_id: props.automationId,
      workspace_id: props.workspaceId,
      trigger_source: props.triggerSource,
      source_entity_type: props.sourceEntityType || null,
      source_entity_id: props.sourceEntityId || null,
      status: props.status,
      conditions_evaluated: props.conditionsEvaluated || {},
      actions_executed: props.actionsExecuted || [],
      error_message: props.errorMessage || null,
      execution_duration_ms: props.executionDurationMs || null,
      idempotency_key: props.idempotencyKey || null,
      result_summary: {
        actionsExecuted: props.actionsExecuted || [],
        conditionsEvaluated: props.conditionsEvaluated || {},
      },
      created_at: new Date().toISOString(),
    };

    let { data, error } = await (this.supabase as any)
      .from('automation_executions')
      .insert(payload)
      .select('*')
      .single();

    if (error && (error.message?.includes("'actions_executed'") || error.message?.includes("'source_entity_type'"))) {
      // Fallback for database schema cache before migration 0076 is applied
      delete payload.source_entity_type;
      delete payload.source_entity_id;
      delete payload.conditions_evaluated;
      delete payload.actions_executed;
      delete payload.execution_duration_ms;

      const fallback = await (this.supabase as any)
        .from('automation_executions')
        .insert(payload)
        .select('*')
        .single();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      throw new Error(`Failed to create execution log: ${error.message}`);
    }

    return this.mapRowToEntity(data);
  }

  async update(
    id: string,
    updates: Partial<Pick<AutomationExecution, 'status' | 'actionsExecuted' | 'errorMessage' | 'executionDurationMs'>>
  ): Promise<AutomationExecution> {
    const payload: Record<string, any> = {};
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.actionsExecuted !== undefined) {
      payload.actions_executed = updates.actionsExecuted;
      payload.result_summary = { actionsExecuted: updates.actionsExecuted };
    }
    if (updates.errorMessage !== undefined) payload.error_message = updates.errorMessage;
    if (updates.executionDurationMs !== undefined) payload.execution_duration_ms = updates.executionDurationMs;

    let { data, error } = await (this.supabase as any)
      .from('automation_executions')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error && error.message?.includes("'actions_executed'")) {
      delete payload.actions_executed;
      delete payload.execution_duration_ms;

      const fallback = await (this.supabase as any)
        .from('automation_executions')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      throw new Error(`Failed to update execution log ${id}: ${error.message}`);
    }

    return this.mapRowToEntity(data);
  }
}
