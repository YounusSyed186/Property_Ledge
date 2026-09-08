import { IActionHandler, ActionContext, interpolateParams, interpolateVariables } from './action-registry';
import { ActionType, ActionResult } from '../../domain/types/action.types';
import { emailService } from '@/lib/email/service';

export class SendEmailAction implements IActionHandler {
  actionType: ActionType = 'send_email';

  async execute(rawParams: Record<string, any>, context: ActionContext): Promise<ActionResult> {
    const startTime = Date.now();
    try {
      const mergedContext = {
        ...context.triggerContext,
        ...context.previousActionOutputs,
        workspaceId: context.workspaceId,
      };

      const params = interpolateParams(rawParams, mergedContext);
      const to = params.to;
      if (!to) {
        throw new Error('SendEmailAction requires a "to" recipient');
      }

      const subject = interpolateVariables(params.subject || 'Automated Notification', mergedContext);
      const body = interpolateVariables(params.body || '', mergedContext);

      const result = await emailService.sendEmail({
        to,
        subject,
        templateType: params.templateType || 'default',
        variables: {
          title: subject,
          body,
          ...params.variables,
        },
      });

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to send automated email');
      }

      return {
        success: true,
        actionType: this.actionType,
        output: {
          to,
          subject,
          messageId: result.messageId,
        },
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        actionType: this.actionType,
        error: err.message || 'SendEmailAction failed',
        durationMs: Date.now() - startTime,
      };
    }
  }
}
