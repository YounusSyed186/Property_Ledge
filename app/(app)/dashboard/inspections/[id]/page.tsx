'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  PageLayout,
  PageContent,
  EntityDetailHeader,
  SectionPanel,
  ProgressBar,
  PageSkeleton,
  WORKSPACE_PAGE_HEADER,
} from '@/components/workspace';
import { NotFoundState, StatusBadge } from '@/components/admin/ui';
import { PropertyRequired } from '@/components/dashboard/PropertyRequired';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { fetchDashboardInspectionDetail } from '@/app/actions/dashboard';

export default function InspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { selectedProperty } = usePropertyContext();
  const [inspection, setInspection] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!selectedProperty) return;
    fetchDashboardInspectionDetail(selectedProperty.propertyId, id)
      .then((data) => setInspection(data ? (data as unknown as Record<string, unknown>) : null))
      .finally(() => setIsLoading(false));
  }, [selectedProperty?.propertyId, id]);

  const items = (inspection?.inspection_items as Array<{ id: string; room: string; status: string }>) || [];
  const passed = items.filter((i) => i.status === 'passed').length;
  const progress = items.length > 0 ? Math.round((passed / items.length) * 100) : 0;

  return (
    <PropertyRequired>
      {selectedProperty && (
        <PageLayout>
          {isLoading ? (
            <PageContent><PageSkeleton /></PageContent>
          ) : !inspection ? (
            <PageContent>
              <NotFoundState title="Inspection not found" action={<Link href="/dashboard/inspections" className="text-admin-primary text-sm">Back</Link>} />
            </PageContent>
          ) : (
            <>
              <div className={cn('shrink-0', WORKSPACE_PAGE_HEADER)}>
                <EntityDetailHeader
                  breadcrumb={[
                    { label: 'Inspections', href: '/dashboard/inspections' },
                    { label: String(inspection.inspection_type || 'Inspection') },
                  ]}
                  title={String(inspection.inspection_type || 'Inspection')}
                  subtitle={`${selectedProperty.propertyName} · ${String(inspection.scheduled_at || '')}`}
                  status={<StatusBadge domain="task" status={String(inspection.status || 'scheduled')} />}
                />
              </div>
              <PageContent>
                <SectionPanel title="Inspection progress" className="rounded-xl">
                  <div className="mb-2 flex items-center justify-between text-caption">
                    <span className="text-admin-muted">{passed} of {items.length} passed</span>
                    <span className="font-semibold text-admin-foreground">{progress}%</span>
                  </div>
                  <ProgressBar value={progress} accent="teal" />
                </SectionPanel>
                <SectionPanel title="Checklist" className="mt-4">
                  <ul className="space-y-2">
                    {items.map((item) => (
                      <li key={item.id} className="flex items-center justify-between rounded-lg border border-admin-border bg-admin-surface px-3 py-2.5 text-body-sm">
                        <span>{item.room}</span>
                        <StatusBadge domain="task" status={item.status === 'passed' ? 'completed' : item.status === 'attention' ? 'open' : 'cancelled'} />
                      </li>
                    ))}
                    {items.length === 0 && <p className="text-[13px] text-admin-muted">No checklist items yet.</p>}
                  </ul>
                </SectionPanel>
              </PageContent>
            </>
          )}
        </PageLayout>
      )}
    </PropertyRequired>
  );
}
