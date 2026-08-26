'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { NotFoundState, StatusBadge } from '@/components/admin/ui';
import { cn } from '@/lib/utils';
import {
  PageLayout,
  PageContent,
  EntityDetailHeader,
  SectionPanel,
  EntityActions,
  PageSkeleton,
  WORKSPACE_PAGE_HEADER,
} from '@/components/workspace';
import { PropertyRequired } from '@/components/dashboard/PropertyRequired';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { fetchDashboardMaintenanceDetail } from '@/app/actions/dashboard';

const WORKFLOW_STEPS = [
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'completed', label: 'Completed' },
] as const;

function MaintenanceWorkflow({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const activeIndex = WORKFLOW_STEPS.findIndex((s) => s.key === normalized);
  const currentIndex = activeIndex >= 0 ? activeIndex : 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {WORKFLOW_STEPS.map((step, index) => {
        const isComplete = index < currentIndex || normalized === 'completed';
        const isCurrent = index === currentIndex && normalized !== 'completed';
        return (
          <div key={step.key} className="flex items-center gap-2">
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-caption font-medium',
                isComplete && 'border-admin-success/30 bg-admin-success-soft text-admin-success',
                isCurrent && 'border-admin-primary-border bg-admin-primary-soft text-admin-primary',
                !isComplete && !isCurrent && 'border-admin-border bg-admin-surface text-admin-muted'
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                  isComplete && 'bg-admin-success text-white',
                  isCurrent && 'bg-admin-primary text-white',
                  !isComplete && !isCurrent && 'bg-admin-surface-subtle text-admin-muted'
                )}
              >
                {index + 1}
              </span>
              {step.label}
            </div>
            {index < WORKFLOW_STEPS.length - 1 && (
              <span className="hidden h-px w-4 bg-admin-border sm:block" aria-hidden />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function MaintenanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { selectedProperty } = usePropertyContext();
  const [request, setRequest] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!selectedProperty) return;
    fetchDashboardMaintenanceDetail(selectedProperty.propertyId, id)
      .then((data) => setRequest(data ? (data as unknown as Record<string, unknown>) : null))
      .finally(() => setIsLoading(false));
  }, [selectedProperty?.propertyId, id]);

  return (
    <PropertyRequired>
      {selectedProperty && (
        <PageLayout>
          {isLoading ? (
            <PageContent><PageSkeleton /></PageContent>
          ) : !request ? (
            <PageContent>
              <NotFoundState title="Maintenance request not found" action={<Link href="/dashboard/maintenance" className="text-admin-primary text-sm">Back</Link>} />
            </PageContent>
          ) : (
            <>
              <div className={cn('shrink-0', WORKSPACE_PAGE_HEADER)}>
                <EntityDetailHeader
                  breadcrumb={[
                    { label: 'Maintenance', href: '/dashboard/maintenance' },
                    { label: String(request.title || 'Request') },
                  ]}
                  title={String(request.title || 'Maintenance Request')}
                  subtitle={selectedProperty.propertyName}
                  status={
                    <div className="flex gap-2">
                      <StatusBadge domain="maintenance" status={String(request.status || 'open')} />
                      <StatusBadge domain="maintenance" status={String(request.priority || 'medium')} />
                    </div>
                  }
                  actions={<EntityActions onEdit={() => router.push('/dashboard/maintenance')} />}
                />
              </div>
              <PageContent>
                <SectionPanel title="Workflow progress" className="mb-4">
                  <MaintenanceWorkflow status={String(request.status || 'open')} />
                </SectionPanel>
                <div className="grid gap-4 lg:grid-cols-2">
                  <SectionPanel title="Issue">
                    <p className="text-body-sm text-admin-foreground">{String(request.description || '—')}</p>
                  </SectionPanel>
                  <SectionPanel title="Details">
                    <div className="space-y-2 text-body-sm">
                      <p><span className="text-admin-muted">Status:</span> {String(request.status)}</p>
                      <p><span className="text-admin-muted">Priority:</span> {String(request.priority)}</p>
                      <p><span className="text-admin-muted">Created:</span> {String(request.created_at)}</p>
                    </div>
                  </SectionPanel>
                </div>
              </PageContent>
            </>
          )}
        </PageLayout>
      )}
    </PropertyRequired>
  );
}
