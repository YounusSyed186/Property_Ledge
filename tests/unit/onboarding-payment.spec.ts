import { test, expect } from '@playwright/test';
import {
  advanceStage,
  parseOnboardingProgress,
  DEFAULT_ONBOARDING_PROGRESS,
  getStageByPath,
  getProgressStepFromPath,
} from '@/lib/onboarding/state';
import { isSubscriptionActive } from '@/lib/subscriptions/utils';
import { BANK_DETAILS } from '@/lib/billing/types';

test.describe('Onboarding & Payment State Machine', () => {
  test('parseOnboardingProgress parses valid current stage and metadata', () => {
    const raw = {
      currentStage: 'subscription',
      completedStages: ['welcome', 'workspace'],
      data: { selectedPlanId: 'plan_manager', startMode: 'paid' },
    };
    const parsed = parseOnboardingProgress(raw);
    expect(parsed.currentStage).toBe('subscription');
    expect(parsed.completedStages).toEqual(['welcome', 'workspace']);
    expect(parsed.data.selectedPlanId).toBe('plan_manager');
  });

  test('parseOnboardingProgress correctly maps legacy step names', () => {
    const raw = {
      currentStep: 'plans',
      completedSteps: ['profile'],
    };
    const parsed = parseOnboardingProgress(raw);
    expect(parsed.currentStage).toBe('subscription');
    expect(parsed.completedStages).toEqual(['workspace']);
  });

  test('advanceStage preserves existing metadata and adds paymentSubmitted flag', () => {
    const initial = {
      currentStage: 'subscription' as const,
      completedStages: ['welcome' as const, 'workspace' as const],
      data: { planSlug: 'manager', checkoutSession: { paymentId: 'pay_123' } },
    };

    const next = advanceStage(initial, 'subscription', { paymentSubmitted: true });
    expect(next.completedStages).toContain('subscription');
    expect(next.currentStage).toBe('property');
    expect(next.data.paymentSubmitted).toBe(true);
    expect(next.data.planSlug).toBe('manager');
  });

  test('getStageByPath resolves internal sub-routes to subscription stage', () => {
    expect(getStageByPath('/onboarding/plans').id).toBe('subscription');
    expect(getStageByPath('/onboarding/payment').id).toBe('subscription');
    expect(getStageByPath('/onboarding/workspace').id).toBe('workspace');
    expect(getStageByPath('/onboarding/property').id).toBe('property');
  });

  test('getProgressStepFromPath provides readable labels for sub-routes', () => {
    const planStep = getProgressStepFromPath('/onboarding/plans');
    expect(planStep.label).toBe('Choose plan');
    expect(planStep.stageId).toBe('subscription');

    const paymentStep = getProgressStepFromPath('/onboarding/payment');
    expect(paymentStep.label).toBe('Payment');
    expect(paymentStep.stageId).toBe('subscription');
  });

  test('isSubscriptionActive accurately classifies subscription statuses', () => {
    expect(isSubscriptionActive('active')).toBe(true);
    expect(isSubscriptionActive('trialing')).toBe(true);
    expect(isSubscriptionActive('pending_payment')).toBe(false);
    expect(isSubscriptionActive('under_review')).toBe(false);
    expect(isSubscriptionActive('canceled')).toBe(false);
  });

  test('BANK_DETAILS maintains required Australian direct deposit defaults', () => {
    expect(BANK_DETAILS.accountName).toBeTruthy();
    expect(BANK_DETAILS.bsb).toBeTruthy();
    expect(BANK_DETAILS.accountNumber).toBeTruthy();
    expect(BANK_DETAILS.referencePrefix).toContain('PL-');
  });
});
