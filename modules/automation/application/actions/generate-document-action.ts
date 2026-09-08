import { IActionHandler, ActionContext, interpolateParams } from './action-registry';
import { ActionType, ActionResult } from '../../domain/types/action.types';
import { InvoiceDocumentService } from '../../../invoices/application/services/invoice-document-service';

export class GenerateDocumentAction implements IActionHandler {
  actionType: ActionType = 'generate_document';

  constructor(private documentService: InvoiceDocumentService) {}

  async execute(rawParams: Record<string, any>, context: ActionContext): Promise<ActionResult> {
    const startTime = Date.now();
    try {
      const mergedContext = {
        ...context.triggerContext,
        ...context.previousActionOutputs,
        workspaceId: context.workspaceId,
      };

      const params = interpolateParams(rawParams, mergedContext);
      const invoiceId = params.invoiceId || context.previousActionOutputs?.invoiceId || context.triggerContext?.invoiceId;

      if (!invoiceId) {
        throw new Error('GenerateDocumentAction requires an invoiceId');
      }

      const format = (params.format === 'docx' ? 'docx' : 'pdf') as 'pdf' | 'docx';

      const doc = await this.documentService.generateDocument({
        invoiceId,
        format,
      });

      return {
        success: true,
        actionType: this.actionType,
        output: {
          documentId: doc.id,
          format: doc.format,
          storagePath: doc.storagePath,
          documentUrl: doc.documentUrl,
        },
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        actionType: this.actionType,
        error: err.message || 'GenerateDocumentAction failed',
        durationMs: Date.now() - startTime,
      };
    }
  }
}
