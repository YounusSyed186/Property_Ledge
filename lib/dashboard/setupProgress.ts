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

export async function getSetupProgress(userId: string): Promise<SetupProgress> {
  const supabase = await createClient();

  const [{ data: workspaces }, { data: properties }, subscription, { data: authUser }] = await Promise.all([
    supabase.from('workspaces').select('id').eq('owner_id', userId).eq('status', 'active').limit(1),
    supabase.from('properties').select('id, workspace_id').eq('owner_id', userId).eq('status', 'active'),
    getSubscription(userId),
    supabase.auth.getUser(),
  ]);

  const workspaceId = (workspaces?.[0] as { id?: string } | undefined)?.id;
  const propertyIds = (properties || []).map((p) => (p as { id: string }).id);
  const propertyList = properties || [];

  let unitCount = 0;
  let tenantCount = 0;
  let leaseCount = 0;
  let teamCount = 0;

  if (propertyIds.length > 0) {
    const [units, tenants, leases] = await Promise.all([
      supabase.from('units').select('id', { count: 'exact', head: true }).in('property_id', propertyIds),
      supabase.from('tenants').select('id', { count: 'exact', head: true }).in('property_id', propertyIds),
      supabase.from('leases').select('id', { count: 'exact', head: true }).in('property_id', propertyIds),
    ]);
    unitCount = units.count ?? 0;
    tenantCount = tenants.count ?? 0;
    leaseCount = leases.count ?? 0;
  }

  if (workspaceId) {
    const { count } = await supabase
      .from('workspace_members')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'active');
    teamCount = count ?? 0;
  }

  const onboardingMeta = authUser.user?.user_metadata?.onboarding as
    | { data?: { setupChecklistDismissed?: boolean } }
    | undefined;

  const hasWorkspace = !!workspaceId;
  const hasSubscription =
    !!subscription &&
    (isSubscriptionActive(subscription.status) ||
      subscription.status === 'pending_payment' ||
      subscription.status === 'under_review');
  const hasProperty = propertyList.length > 0;
  const hasUnits = unitCount > 0;
  const hasTenants = tenantCount > 0;
  const hasLeases = leaseCount > 0;
  const hasTeam = teamCount > 1;

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
}
