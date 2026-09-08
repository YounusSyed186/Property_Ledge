import { IActionHandler, ActionContext, interpolateParams, interpolateVariables } from './action-registry';
import { ActionType, ActionResult } from '../../domain/types/action.types';
import { createAdminClient } from '@/lib/supabase/server';

export class CreateTaskAction implements IActionHandler {
  actionType: ActionType = 'create_task';

  async execute(rawParams: Record<string, any>, context: ActionContext): Promise<ActionResult> {
    const startTime = Date.now();
    try {
      const mergedContext = {
        ...context.triggerContext,
        ...context.previousActionOutputs,
        workspaceId: context.workspaceId,
      };

      const params = interpolateParams(rawParams, mergedContext);
      const title = interpolateVariables(params.title || 'Follow-up Task', mergedContext);
      const description = interpolateVariables(params.description || '', mergedContext);
      const propertyId = params.propertyId || context.triggerContext?.propertyId;
      const assignedTo = params.assignedTo || context.triggerContext?.userId || null;
      const priority = params.priority || 'medium';
      const dueDate = params.dueDate || null;

      if (!propertyId) {
        // If there's no property associated, we skip creating a property-bound task
        return {
          success: true,
          actionType: this.actionType,
          output: {
            skipped: true,
            reason: 'Task creation skipped: no property_id associated with event context',
          },
          durationMs: Date.now() - startTime,
        };
      }

      const supabase = await createAdminClient();
      const { data, error } = await (supabase as any)
        .from('tasks')
        .insert({
          property_id: propertyId,
          title,
          description,
          assigned_to: assignedTo,
          priority,
          status: 'pending',
          due_date: dueDate,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to create task: ${error.message}`);
      }

      return {
        success: true,
        actionType: this.actionType,
        output: {
          taskId: data?.id,
          title,
          priority,
        },
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        actionType: this.actionType,
        error: err.message || 'CreateTaskAction failed',
        durationMs: Date.now() - startTime,
      };
    }
  }
}
