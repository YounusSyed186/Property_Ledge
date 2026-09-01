import { emailService } from '@/lib/email/service';
import { getAppBaseUrl } from '@/lib/routing/env';

export interface SubscriptionRequestedNotificationParams {
  accountName: string;
  accountEmail: string;
  planName: string;
  amount: number;
  reference: string;
}

export interface SubscriptionAcceptedNotificationParams {
  accountName: string;
  accountEmail: string;
  planName: string;
  effectiveDate: string;
}

class NotificationService {
  /**
   * Generates SUBSCRIPTION_REQUESTED event and notifies both administrator and user
   */
  async notifySubscriptionRequested(params: SubscriptionRequestedNotificationParams) {
    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || 'admin@propertyledge.com.au';
    const baseUrl = getAppBaseUrl();

    // 1. Send notification email to Administrator
    try {
      await emailService.sendEmail({
        to: adminEmail,
        subject: `New Subscription Request: ${params.planName} - ${params.accountName}`,
        templateType: 'subscription_requested',
        variables: {
          accountName: params.accountName,
          accountEmail: params.accountEmail,
          planName: params.planName,
          amount: params.amount,
          reference: params.reference,
          requestDate: new Date().toISOString(),
          adminUrl: `${baseUrl}/admin/subscriptions`,
        },
      });
    } catch (err) {
      console.error('[NotificationService] Failed to send subscription requested email to admin:', err);
    }

    // 2. Send acknowledgment email to User saying they will be notified shortly
    if (params.accountEmail && params.accountEmail !== adminEmail) {
      try {
        await emailService.sendEmail({
          to: params.accountEmail,
          subject: `Subscription Request Received - PropertyLedge ${params.planName}`,
          templateType: 'subscription_requested_user',
          variables: {
            userName: params.accountName,
            planName: params.planName,
            amount: params.amount,
            reference: params.reference,
            statusUrl: `${baseUrl}/subscription`,
          },
        });
      } catch (err) {
        console.error('[NotificationService] Failed to send subscription request acknowledgment email to user:', err);
      }
    }
  }

  /**
   * Generates SUBSCRIPTION_ACCEPTED event and notifies user
   */
  async notifySubscriptionAccepted(params: SubscriptionAcceptedNotificationParams) {
    const baseUrl = getAppBaseUrl();

    try {
      await emailService.sendEmail({
        to: params.accountEmail,
        subject: `Subscription Approved - PropertyLedge ${params.planName}`,
        templateType: 'subscription_accepted',
        variables: {
          userName: params.accountName,
          planName: params.planName,
          effectiveDate: params.effectiveDate,
          appUrl: `${baseUrl}/subscription`,
        },
      });
    } catch (err) {
      console.error('[NotificationService] Failed to send subscription accepted email:', err);
    }
  }
}

export const notificationService = new NotificationService();
