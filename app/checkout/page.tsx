import React from 'react';
import { getCurrentUser } from '@/lib/auth/queries';
import { SubscriptionCheckout } from '@/components/subscription/SubscriptionCheckout';

export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{ plan?: string }>;
}

export default async function CheckoutPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const user = await getCurrentUser();

  return (
    <SubscriptionCheckout
      initialPlanSlug={params.plan || 'pro'}
      userEmail={user?.email || ''}
      userName={user?.user_metadata?.full_name || ''}
      userPhone={user?.user_metadata?.phone || ''}
    />
  );
}
