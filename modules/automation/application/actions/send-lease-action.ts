import { ActionType, ActionResult } from '../../domain/types/action.types';
import { IActionHandler, ActionContext, interpolateVariables } from './action-registry';
import { emailService } from '@/lib/email/service';
import { PdfLeaseAdapter } from '@/lib/pdf/pdf-lease-adapter';
import { createClient } from '@/lib/supabase/server';

export class SendLeaseAction implements IActionHandler {
  public actionType: ActionType = 'send_lease';

  public async execute(params: Record<string, any>, context: ActionContext): Promise<ActionResult> {
    try {
      const leaseId = context.triggerContext.leaseId || params.leaseId || context.triggerContext.lease_id;
      if (!leaseId) {
        return {
          success: false,
          actionType: this.actionType,
          error: 'Action failed: No leaseId provided in execution context.',
        };
      }

      const supabase = await createClient();

      // Fetch Lease details with property & tenants
      const { data: rawLease, error: leaseErr } = await (supabase as any)
        .from('leases')
        .select(`
          *,
          property:properties(*),
          lease_tenants:lease_tenants(
            tenant:tenants(*)
          )
        `)
        .eq('id', leaseId)
        .single();

      const lease = rawLease as any;

      if (leaseErr || !lease) {
        return {
          success: false,
          actionType: this.actionType,
          error: `Action failed: Lease '${leaseId}' not found. ${leaseErr?.message || ''}`,
        };
      }

      // Check if lease is active/valid
      if (lease.status === 'terminated' || lease.status === 'archived') {
        return {
          success: false,
          actionType: this.actionType,
          error: `Action skipped: Lease is in '${lease.status}' status.`,
        };
      }

      // Resolve tenant details
      const tenantRel = lease.lease_tenants?.[0];
      const tenant = tenantRel?.tenant;
      if (!tenant || !tenant.email) {
        return {
          success: false,
          actionType: this.actionType,
          error: `Action failed: No valid tenant email associated with Lease #${lease.id}.`,
        };
      }

      const tenantName = `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() || 'Valued Tenant';
      const propertyName = lease.property?.name || 'Your Property';
      const propertyAddress = lease.property?.address_line1 || lease.property?.address || '';
      const startDate = lease.start_date ? new Date(lease.start_date).toLocaleDateString() : 'N/A';
      const endDate = lease.end_date ? new Date(lease.end_date).toLocaleDateString() : 'Month-to-Month';
      const rentAmount = Number(lease.rent_amount || 0);
      const rentFrequency = lease.rent_frequency || 'monthly';

      // Build Dynamic Template Context
      const templateData = {
        tenant_name: tenantName,
        tenant_email: tenant.email,
        property_name: propertyName,
        property_address: propertyAddress,
        lease_start_date: startDate,
        lease_end_date: endDate,
        rent_amount: `$${rentAmount.toLocaleString()} / ${rentFrequency}`,
      };

      // Default Subject & Body
      const subjectTemplate = params.subject || `Lease Agreement Summary — ${propertyName}`;
      const bodyTemplate =
        params.message ||
        params.body ||
        `Hello {{tenant_name}},

Please find your official Lease Agreement Summary attached for {{property_name}}.

Lease Period: {{lease_start_date}} – {{lease_end_date}}
Rent Amount: {{rent_amount}}

If you have any questions, please contact your property manager.

Best regards,
Property Ledge Team`;

      const subject = interpolateVariables(subjectTemplate, templateData);
      const bodyText = interpolateVariables(bodyTemplate, templateData);

      // Generate PDF Attachment
      const pdfBytes = await PdfLeaseAdapter.generate({
        leaseNumber: String(lease.id).substring(0, 8).toUpperCase(),
        propertyName,
        propertyAddress,
        tenantName,
        tenantEmail: tenant.email,
        startDate,
        endDate,
        rentAmount,
        rentFrequency,
        depositAmount: Number(lease.security_deposit || 0),
        termsNotes: lease.notes || undefined,
      });

      const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

      // Dispatch Email via EmailService with PDF attachment
      const emailRes = await emailService.sendEmail({
        to: tenant.email,
        subject,
        templateType: 'invoice_plain',
        variables: {
          body: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #22333b;">Lease Agreement Summary</h2>
            <p>Hello <strong>${tenantName}</strong>,</p>
            <p>Please find your official Lease Agreement Summary attached for <strong>${propertyName}</strong>.</p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #e9ecef;">
              <p style="margin: 5px 0;"><strong>Property:</strong> ${propertyName} ${propertyAddress ? `(${propertyAddress})` : ''}</p>
              <p style="margin: 5px 0;"><strong>Lease Period:</strong> ${startDate} – ${endDate}</p>
              <p style="margin: 5px 0;"><strong>Rent:</strong> $${rentAmount.toLocaleString()} / ${rentFrequency}</p>
            </div>
            <p>Regards,<br/><strong>Property Ledge Team</strong></p>
          </div>`,
        },
        attachments: [
          {
            filename: `Lease_Summary_${propertyName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
            content: pdfBase64,
          },
        ],
      });

      if (!emailRes.success) {
        return {
          success: false,
          actionType: this.actionType,
          error: `Email delivery failed: ${emailRes.error?.message || 'Unknown error'}`,
        };
      }

      return {
        success: true,
        actionType: this.actionType,
        output: {
          messageId: emailRes.messageId,
          recipient: tenant.email,
          subject,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        actionType: this.actionType,
        error: `SendLeaseAction Exception: ${err.message || String(err)}`,
      };
    }
  }
}
