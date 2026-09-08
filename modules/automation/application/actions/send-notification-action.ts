import { IActionHandler, ActionContext, interpolateParams, interpolateVariables } from './action-registry';
import { ActionType, ActionResult } from '../../domain/types/action.types';
import { createAdminClient } from '@/lib/supabase/server';

export class SendNotificationAction implements IActionHandler {
  actionType: ActionType = 'send_notification';

  async execute(rawParams: Record<string, any>, context: ActionContext): Promise<ActionResult> {
    const startTime = Date.now();
    try {
      const mergedContext = {
        ...context.triggerContext,
        ...context.previousActionOutputs,
        workspaceId: context.workspaceId,
      };

      const params = interpolateParams(rawParams, mergedContext);
      const userId = params.userId || context.triggerContext?.userId;

      if (!userId) {
        throw new Error('SendNotificationAction requires a target userId');
      }

      const title = interpolateVariables(params.title || 'Notification', mergedContext);
      const message = interpolateVariables(params.message || '', mergedContext);
      const type = params.type || 'system';
      const propertyId = params.propertyId || null;

      const supabase = await createAdminClient();
      const { data, error } = await (supabase as any)
        .from('notifications')
        .insert({
          user_id: userId,
          property_id: propertyId,
          type,
          title,
          message,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to insert notification: ${error.message}`);
      }

      return {
        success: true,
        actionType: this.actionType,
        output: {
          notificationId: data?.id,
          userId,
          title,
        },
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        actionType: this.actionType,
        error: err.message || 'SendNotificationAction failed',
        durationMs: Date.now() - startTime,
      };
    }
  }
}
