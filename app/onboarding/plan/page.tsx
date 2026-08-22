import React from 'react';
import { getCurrentUser } from '@/lib/auth/queries';
import { SubscriptionCheckout } from '@/components/subscription/SubscriptionCheckout';

export const revalidate = 0;

export default async function OnboardingPlanPage() {
  const user = await getCurrentUser();

  return (
    <SubscriptionCheckout
      initialPlanSlug="pro"
      userEmail={user?.email || ''}
      userName={user?.user_metadata?.full_name || ''}
      userPhone={user?.user_metadata?.phone || ''}
    />
  );
}
