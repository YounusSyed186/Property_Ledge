import { createAdminClient } from '@/lib/supabase/server';
import { getAppBaseUrl } from '@/lib/routing/env';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  templateType:
    | 'subscription_requested'
    | 'subscription_requested_user'
    | 'subscription_accepted'
    | 'subscription_rejected'
    | 'tenant-invite'
    | 'team-invite'
    | 'invoice'
    | string;
  variables: Record<string, any>;
  replyTo?: string;
  attachments?: Array<{ filename: string; content: string }>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

const formatDate = (dateStr: string | undefined | null): string => {
  if (!dateStr) return 'Not Specified';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Not Specified';
    return d.toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return 'Not Specified';
  }
};

/**
 * Renders HTML content based on V1 dark-mode email design system
 */
export function buildEmailHtml(templateType: string, variables: Record<string, any>): string {
  const currentYear = new Date().getFullYear();

  const wrapLayout = (title: string, content: string) => `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:0;background-color:#0b0b0f;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#f3f4f6;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0b0b0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background:#141419;border:1px solid #2a2a35;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:40px 40px 20px;text-align:center;">
          <h2 style="margin:0;font-size:24px;font-weight:900;color:#ffffff;letter-spacing:1px;">PROPERTY<span style="color:#a9927d;">LEDGE</span></h2>
        </td></tr>
        <tr><td style="padding:20px 40px 40px;">
          ${content}
        </td></tr>
        <tr><td style="padding:16px 40px;border-top:1px solid #2a2a35;text-align:center;background:#101014;">
          <p style="font-size:11px;color:#4b5563;margin:0;">&copy; ${currentYear} PropertyLedge. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // Template for Admin Notification when User requests subscription
  if (templateType === 'subscription_requested') {
    const { accountName, accountEmail, planName, amount, reference, requestDate, adminUrl } = variables;
    return wrapLayout('New Subscription Request', `
      <div style="background:#22333b;padding:24px;border-radius:12px;text-align:center;margin-bottom:24px;">
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#ffffff;">New Subscription Request 📋</h1>
        <p style="margin:0;font-size:14px;color:#f2f4f3;opacity:0.9;">A customer has requested a subscription and uploaded payment proof.</p>
      </div>
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#1e1e2a;border:1px solid #2a2a35;border-radius:12px;padding:20px;margin-bottom:24px;">
        <tr><td style="padding-bottom:10px;font-size:11px;color:#a9927d;font-weight:bold;text-transform:uppercase;">Customer</td></tr>
        <tr><td style="padding-bottom:16px;font-size:16px;color:#ffffff;font-weight:bold;">${accountName || 'Customer'} (${accountEmail || 'N/A'})</td></tr>
        <tr><td style="padding-bottom:10px;font-size:11px;color:#a9927d;font-weight:bold;text-transform:uppercase;">Requested Plan</td></tr>
        <tr><td style="padding-bottom:16px;font-size:18px;color:#ffffff;font-weight:bold;">${planName || 'Landlord'} ($${amount || '29'}.00 AUD)</td></tr>
        <tr><td style="padding-bottom:10px;font-size:11px;color:#a9927d;font-weight:bold;text-transform:uppercase;">Payment Reference</td></tr>
        <tr><td style="font-size:15px;color:#ffffff;font-family:monospace;font-weight:bold;">${reference || 'N/A'}</td></tr>
      </table>
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="text-align:center;margin-bottom:24px;">
        <tr><td>
          <a href="${adminUrl || `${getAppBaseUrl()}/admin/subscriptions`}" target="_blank" style="background:#a9927d;color:#141419;padding:14px 28px;border-radius:12px;font-size:15px;font-weight:bold;text-decoration:none;display:inline-block;letter-spacing:0.5px;">Review in Admin Panel</a>
        </td></tr>
      </table>
    `);
  }

  // Template for User Confirmation when User requests subscription / submits payment proof
  if (templateType === 'subscription_requested_user') {
    const { userName, planName, amount, reference, statusUrl } = variables;
    return wrapLayout('Subscription Request Received', `
      <div style="background:#22333b;padding:24px;border-radius:12px;text-align:center;margin-bottom:24px;">
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#ffffff;">Subscription Request Received 📩</h1>
        <p style="margin:0;font-size:14px;color:#f2f4f3;opacity:0.9;">We have received your payment proof and subscription request.</p>
      </div>
      <p style="font-size:15px;line-height:1.6;color:#d1d5db;margin-bottom:24px;">
        Hello <strong>${userName || 'Customer'}</strong>,<br/><br/>
        Thank you for submitting your subscription request for PropertyLedge <strong>${planName || 'Landlord'}</strong> ($${amount || '29'}.00 AUD).
        Our administration team is currently verifying your bank transfer against reference number:
      </p>
      <div style="background:#1e1e2a;border:1px solid #2a2a35;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
        <div style="font-size:11px;color:#a9927d;font-weight:bold;text-transform:uppercase;margin-bottom:6px;">Payment Reference Number</div>
        <div style="font-size:20px;color:#ffffff;font-family:monospace;font-weight:bold;letter-spacing:1px;">${reference || 'N/A'}</div>
      </div>
      <p style="font-size:14px;line-height:1.6;color:#9ca3af;margin-bottom:24px;">
        Verification typically completes within <strong>1-4 business hours</strong>. You will receive an immediate confirmation email as soon as your workspace is activated.
      </p>
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="text-align:center;margin-bottom:24px;">
        <tr><td>
          <a href="${statusUrl || `${getAppBaseUrl()}/subscription`}" target="_blank" style="background:#a9927d;color:#141419;padding:14px 28px;border-radius:12px;font-size:15px;font-weight:bold;text-decoration:none;display:inline-block;letter-spacing:0.5px;">View Subscription Status</a>
        </td></tr>
      </table>
    `);
  }

  // Template for User when Subscription is Accepted & Activated
  if (templateType === 'subscription_accepted') {
    const { userName, planName, effectiveDate, appUrl } = variables;
    return wrapLayout('Subscription Activated', `
      <div style="background:#1e3d2f;padding:24px;border-radius:12px;text-align:center;margin-bottom:24px;">
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#ffffff;">Payment Verified & Activated 🎉</h1>
        <p style="margin:0;font-size:14px;color:#d1fae5;opacity:0.9;">Your PropertyLedge subscription is now active.</p>
      </div>
      <p style="font-size:15px;line-height:1.6;color:#d1d5db;margin-bottom:20px;">
        Hello <strong>${userName || 'Customer'}</strong>,<br/><br/>
        Great news! Your manual bank payment has been approved. Your <strong>${planName || 'Landlord'}</strong> subscription is now active starting <strong>${formatDate(effectiveDate)}</strong>.
      </p>
      <div style="background:#1e1e2a;border:1px solid #2a2a35;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;color:#a9927d;font-weight:bold;">Your Plan Features are Ready:</p>
        <ul style="margin:12px 0 0;padding-left:20px;color:#d1d5db;font-size:14px;line-height:1.8;">
          <li>Full property portfolio management unlocked</li>
          <li>Real-time automated reports & financial exports</li>
          <li>Priority account support</li>
        </ul>
      </div>
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="text-align:center;margin-bottom:24px;">
        <tr><td>
          <a href="${appUrl || getAppBaseUrl()}" target="_blank" style="background:#a9927d;color:#141419;padding:14px 28px;border-radius:12px;font-size:15px;font-weight:bold;text-decoration:none;display:inline-block;letter-spacing:0.5px;">Go to Workspace</a>
        </td></tr>
      </table>
    `);
  }

  // Template for User when Subscription is Rejected
  if (templateType === 'subscription_rejected') {
    const { userName, planName, reason, supportUrl } = variables;
    return wrapLayout('Subscription Request Not Approved', `
      <div style="background:#3d1e1e;padding:24px;border-radius:12px;text-align:center;margin-bottom:24px;">
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#ffffff;">Subscription Request Not Approved</h1>
        <p style="margin:0;font-size:14px;color:#fecaca;opacity:0.9;">We were unable to activate your subscription at this time.</p>
      </div>
      <p style="font-size:15px;line-height:1.6;color:#d1d5db;margin-bottom:20px;">
        Hello <strong>${userName || 'Customer'}</strong>,<br/><br/>
        Thank you for your interest in PropertyLedge <strong>${planName || 'Landlord'}</strong>. After review, we were unable to approve your subscription request.
      </p>
      <div style="background:#1e1e2a;border:1px solid #2a2a35;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 12px;font-size:14px;color:#a9927d;font-weight:bold;">Reason:</p>
        <p style="margin:0;font-size:14px;color:#fecaca;">${reason || 'The administration team was unable to verify your payment.'}</p>
      </div>
      <p style="font-size:14px;line-height:1.6;color:#9ca3af;margin-bottom:24px;">
        If you believe this is an error or would like to try again, please contact our support team.
      </p>
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="text-align:center;margin-bottom:24px;">
        <tr><td>
          <a href="${supportUrl || `${getAppBaseUrl()}/support`}" target="_blank" style="background:#a9927d;color:#141419;padding:14px 28px;border-radius:12px;font-size:15px;font-weight:bold;text-decoration:none;display:inline-block;letter-spacing:0.5px;">Contact Support</a>
        </td></tr>
      </table>
    `);
  }

  // Fallback template
  return wrapLayout(variables.title || 'PropertyLedge Notification', `
    <h2 style="color:#ffffff;margin-top:0;">${variables.title || 'Notification'}</h2>
    <p style="color:#d1d5db;line-height:1.6;">${variables.body || 'You have a new update in PropertyLedge.'}</p>
  `);
}

class EmailService {
  private isValidEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.trim());
  }

  async sendEmail(options: SendEmailOptions): Promise<EmailResult> {
    const { to, subject, templateType, variables, replyTo, attachments } = options;

    const recipients = Array.isArray(to) ? to : [to];
    for (const recipient of recipients) {
      if (!this.isValidEmail(recipient)) {
        console.warn(`[EmailService] Invalid recipient email address: "${recipient}"`);
        return {
          success: false,
          error: {
            code: 'INVALID_EMAIL_FORMAT',
            message: `Invalid email address format: ${recipient}`,
          },
        };
      }
    }

    const htmlContent = buildEmailHtml(templateType, variables);
    const primaryRecipient = recipients[0];

    // Log pending email event in database using admin client
    let emailEventId: string | null = null;
    try {
      const supabase = await createAdminClient();
      const { data: logData } = await (supabase as any)
        .from('email_events')
        .insert({
          recipient: primaryRecipient,
          subject,
          template_type: templateType,
          variables,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .maybeSingle();

      if (logData) emailEventId = logData.id;
    } catch (dbErr) {
      console.warn('[EmailService] Failed to record pending email event in DB:', dbErr);
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.warn('[EmailService] RESEND_API_KEY environment variable not set. Email simulated/logged in DB.');

      if (emailEventId) {
        try {
          const supabase = await createAdminClient();
          await (supabase as any)
            .from('email_events')
            .update({
              status: 'sent',
              provider_message_id: `sim_${Math.random().toString(36).substring(2, 10)}`,
              updated_at: new Date().toISOString(),
            })
            .eq('id', emailEventId);
        } catch (e) {
          // ignore
        }
      }

      return {
        success: true,
        messageId: `sim_${Math.random().toString(36).substring(2, 10)}`,
      };
    }

    // Call Resend API
    try {
      const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';
      const fromName = process.env.EMAIL_FROM_NAME || 'PropertyLedge';
      const fromField = fromEmail.includes('<') ? fromEmail : `${fromName} <${fromEmail}>`;

      // If EMAIL_REDIRECT_TO is set, route all emails to your Resend account email for testing without custom domain!
      const redirectRecipient = process.env.EMAIL_REDIRECT_TO;
      const actualRecipients = redirectRecipient ? [redirectRecipient] : recipients;
      const finalSubject = redirectRecipient && redirectRecipient !== primaryRecipient
        ? `[For: ${primaryRecipient}] ${subject}`
        : subject;

      const payload: any = {
        from: fromField,
        to: actualRecipients,
        subject: finalSubject,
        html: htmlContent,
      };

      if (replyTo) payload.reply_to = replyTo;
      if (attachments && attachments.length > 0) payload.attachments = attachments;

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[EmailService] Resend API error (${response.status}):`, errorText);

        if (emailEventId) {
          const supabase = await createAdminClient();
          await (supabase as any)
            .from('email_events')
            .update({
              status: 'failed',
              error_message: `Resend API (${response.status}): ${errorText}`,
              updated_at: new Date().toISOString(),
            })
            .eq('id', emailEventId);
        }

        return {
          success: false,
          error: {
            code: 'RESEND_API_ERROR',
            message: `Resend API error (${response.status}): ${errorText}`,
          },
        };
      }

      const resData = await response.json();
      const messageId = resData.id || resData.message_id || 'sent';

      if (emailEventId) {
        const supabase = await createAdminClient();
        await (supabase as any)
          .from('email_events')
          .update({
            status: 'sent',
            provider_message_id: messageId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', emailEventId);
      }

      return {
        success: true,
        messageId,
      };
    } catch (err: any) {
      console.error('[EmailService] Unexpected error sending email via Resend:', err);

      if (emailEventId) {
        try {
          const supabase = await createAdminClient();
          await (supabase as any)
            .from('email_events')
            .update({
              status: 'failed',
              error_message: err.message || 'Unexpected exception',
              updated_at: new Date().toISOString(),
            })
            .eq('id', emailEventId);
        } catch (e) {
          // ignore
        }
      }

      return {
        success: false,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: err.message || 'Unexpected error while sending email',
        },
      };
    }
  }
}

export const emailService = new EmailService();
