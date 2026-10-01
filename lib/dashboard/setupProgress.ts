import { createClient } from '@/lib/supabase/server';
import { getSubscription } from '@/lib/subscriptions/queries';
import { isSubscriptionActive } from '@/lib/subscriptions/utils';

export interface SetupTask {
  id: string;
  label: string;
  description: string;
  href: string;
  completed: boolean;
}

export interface SetupProgress {
  tasks: SetupTask[];
  completedCount: number;
  totalCount: number;
  percent: number;
  allComplete: boolean;
  dismissed: boolean;
}

import { cache } from 'react';
import { getCurrentUser } from '@/lib/auth/queries';

export const getSetupProgress = cache(async function getSetupProgress(userId: string): Promise<SetupProgress> {
  const authUser = await getCurrentUser();
  const onboardingMeta = authUser?.user_metadata?.onboarding as
    | { data?: { setupChecklistDismissed?: boolean } }
    | undefined;

  const isDismissed = !!onboardingMeta?.data?.setupChecklistDismissed;
  if (isDismissed) {
    return {
      tasks: [],
      completedCount: 7,
      totalCount: 7,
      percent: 100,
      allComplete: true,
      dismissed: true,
    };
  }

  const supabase = await createClient();

  const [{ data: workspaces }, { data: properties }, subscription] = await Promise.all([
    supabase.from('workspaces').select('id').eq('owner_id', userId).eq('status', 'active').limit(1),
    supabase.from('properties').select('id, workspace_id').eq('owner_id', userId).eq('status', 'active'),
    getSubscription(userId),
  ]);

  const workspaceId = (workspaces?.[0] as { id?: string } | undefined)?.id;
  const propertyIds = (properties || []).map((p) => (p as { id: string }).id);
  const propertyList = properties || [];

  // Consolidate second tier into a single parallel batch using fast existence checks (.limit(1) / .limit(2))
  // rather than expensive full-table/index count scans
  const [unitsRes, tenantsRes, leasesRes, membersRes] = await Promise.all([
    propertyIds.length > 0
      ? (supabase as any).from('units').select('id').in('property_id', propertyIds).limit(1)
      : Promise.resolve({ data: [] }),
    propertyIds.length > 0
      ? (supabase as any).from('tenants').select('id').in('property_id', propertyIds).limit(1)
      : Promise.resolve({ data: [] }),
    propertyIds.length > 0
      ? (supabase as any).from('leases').select('id').in('property_id', propertyIds).limit(1)
      : Promise.resolve({ data: [] }),
    workspaceId
      ? (supabase as any).from('workspace_members').select('id').eq('workspace_id', workspaceId).eq('status', 'active').limit(2)
      : Promise.resolve({ data: [] }),
  ]);

  const hasUnits = (unitsRes.data?.length ?? 0) > 0;
  const hasTenants = (tenantsRes.data?.length ?? 0) > 0;
  const hasLeases = (leasesRes.data?.length ?? 0) > 0;
  const hasTeam = (membersRes.data?.length ?? 0) > 1;

  const hasWorkspace = !!workspaceId;

  const hasSubscription =
    !!subscription &&
    (isSubscriptionActive(subscription.status) ||
      subscription.status === 'pending_payment' ||
      subscription.status === 'under_review');
  const hasProperty = propertyList.length > 0;

  const tasks: SetupTask[] = [
    {
      id: 'workspace',
      label: 'Create workspace',
      description: 'Set up your PropertyLedge workspace',
      href: '/dashboard/settings',
      completed: hasWorkspace,
    },
    {
      id: 'subscription',
      label: 'Choose subscription',
      description: 'Select a plan or start a trial',
      href: '/dashboard/settings/subscription',
      completed: hasSubscription,
    },
    {
      id: 'property',
      label: 'Add first property',
      description: 'Add your first managed property',
      href: '/dashboard/properties?new=true',
      completed: hasProperty,
    },
    {
      id: 'units',
      label: 'Add units',
      description: 'Add the units within your property',
      href: '/dashboard/units',
      completed: hasUnits,
    },
    {
      id: 'tenants',
      label: 'Add tenants',
      description: 'Start managing your tenants',
      href: '/dashboard/people',
      completed: hasTenants,
    },
    {
      id: 'leases',
      label: 'Add your first lease',
      description: 'Track lease dates, rent, and terms',
      href: '/dashboard/leases',
      completed: hasLeases,
    },
    {
      id: 'team',
      label: 'Invite your team',
      description: 'Give your team access to PropertyLedge',
      href: '/dashboard/team',
      completed: hasTeam,
    },
  ];

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return {
    tasks,
    completedCount,
    totalCount,
    percent,
    allComplete: completedCount === totalCount,
    dismissed: !!onboardingMeta?.data?.setupChecklistDismissed,
  };
});
