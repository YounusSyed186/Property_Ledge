'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, HelpCircle } from 'lucide-react';
import { PageContainer, Button, useToast } from '@/components/admin/ui';
import { AdminConfigPageHeader, AdminSummaryCards, HowItWorksDrawer } from '@/components/admin/config';
import { AdminEntitlementsGridView } from '@/components/admin/data-grid/views/AdminEntitlementsGridView';
import { CreateEntitlementDrawer } from '@/components/admin/entitlements/CreateEntitlementDrawer';
import { EntitlementDetailDrawer } from '@/components/admin/entitlements/EntitlementDetailDrawer';
import { EditEntitlementDrawer } from '@/components/admin/entitlements/EditEntitlementDrawer';
import { ImpactConfirmModal } from '@/components/admin/config';
import {
  handleDeleteEntitlement,
  fetchAdminEntitlementsWithUsage,
} from '@/app/actions/admin-config';
import { getEntitlementKind } from '@/lib/entitlements/capability-catalog';
import type { AdminEntitlementRow } from '@/lib/admin/types';

interface AdminEntitlementsPageViewProps {
  entitlements: AdminEntitlementRow[];
}

export function AdminEntitlementsPageView({ entitlements: initialEntitlements }: AdminEntitlementsPageViewProps) {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();
  const [entitlements, setEntitlements] = useState<AdminEntitlementRow[]>(initialEntitlements);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const fresh = await fetchAdminEntitlementsWithUsage();
      setEntitlements(fresh as AdminEntitlementRow[]);
      setLastRefreshedAt(new Date());
    } catch (e) {
      toastError('Could not refresh', e instanceof Error ? e.message : 'Refresh failed');
    } finally {
      setIsRefreshing(false);
    }
  };

  const [summaryFilter, setSummaryFilter] = useState('all');
  const [showHelp, setShowHelp] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [viewRow, setViewRow] = useState<AdminEntitlementRow | null>(null);
  const [editRow, setEditRow] = useState<AdminEntitlementRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<AdminEntitlementRow | null>(null);
  const [isDeleting, startDelete] = useTransition();

  const summaryCards = useMemo(() => [
    { id: 'all', label: 'Total', value: entitlements.length },
    { id: 'feature', label: 'Features', value: entitlements.filter((e) => getEntitlementKind(e.value_type) === 'feature').length },
    { id: 'limit', label: 'Limits', value: entitlements.filter((e) => getEntitlementKind(e.value_type) === 'limit').length },
    { id: 'plan-linked', label: 'Used by plans', value: entitlements.filter((e) => e.planCount > 0).length },
  ], [entitlements]);

  function handleDelete() {
    if (!deleteRow) return;
    startDelete(async () => {
      try {
        await handleDeleteEntitlement(deleteRow.id);
        toastSuccess('Entitlement deleted', `${deleteRow.name} was removed.`);
        setDeleteRow(null);
        setViewRow(null);
        router.refresh();
      } catch (e) {
        toastError('Could not delete', e instanceof Error ? e.message : 'Delete failed');
      }
    });
  }

  return (
    <PageContainer className="relative">
      <AdminConfigPageHeader
        title="Entitlements"
        description="Manage the capabilities and usage limits that can be assigned to subscription plans."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowHelp(true)} leftIcon={<HelpCircle className="w-4 h-4" />}>
              Learn how entitlements work
            </Button>
            <Button size="sm" onClick={() => setShowCreate(true)} leftIcon={<Plus className="w-4 h-4" />}>
              Create entitlement
            </Button>
          </>
        }
      />

      <AdminSummaryCards
        items={summaryCards.map((c) => ({ ...c, active: c.id === summaryFilter }))}
        onCardClick={(id) => setSummaryFilter(id === summaryFilter ? 'all' : id)}
      />

      <div className="flex-1 min-h-0">
        <AdminEntitlementsGridView
          entitlements={entitlements}
          summaryFilter={summaryFilter}
          onSummaryFilterChange={setSummaryFilter}
          onView={setViewRow}
          onEdit={(row) => { setViewRow(null); setEditRow(row); }}
          onDelete={setDeleteRow}
          onCreateClick={() => setShowCreate(true)}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          lastRefreshedAt={lastRefreshedAt}
        />
      </div>

      <HowItWorksDrawer topic="entitlements" isOpen={showHelp} onClose={() => setShowHelp(false)} />
      <CreateEntitlementDrawer
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        existingEntitlements={entitlements}
        onViewExisting={(row) => {
          setShowCreate(false);
          setViewRow(row);
        }}
        onCreated={(name) => {
          toastSuccess('Entitlement created', `${name} is now available for plan configuration.`);
        }}
      />
      <EntitlementDetailDrawer
        entitlement={viewRow}
        isOpen={!!viewRow}
        onClose={() => setViewRow(null)}
        onEdit={(row) => { setViewRow(null); setEditRow(row); }}
        onDelete={setDeleteRow}
      />
      <EditEntitlementDrawer entitlement={editRow} isOpen={!!editRow} onClose={() => setEditRow(null)} />

      <ImpactConfirmModal
        isOpen={!!deleteRow}
        onClose={() => setDeleteRow(null)}
        onConfirm={handleDelete}
        title={deleteRow ? `Delete "${deleteRow.name}"?` : ''}
        description={
          deleteRow && deleteRow.planCount > 0
            ? `This entitlement is currently used by ${deleteRow.planCount} plan${deleteRow.planCount !== 1 ? 's' : ''}. Deleting it may affect subscription limits. Remove it from all plans first.`
            : 'This action cannot be undone.'
        }
        impactLines={
          deleteRow && deleteRow.planCount > 0
            ? deleteRow.planNames.map((n) => `Used by plan: ${n}`)
            : undefined
        }
        confirmLabel="Delete entitlement"
        variant="danger"
        loading={isDeleting}
        hideConfirm={!!deleteRow && deleteRow.planCount > 0}
      />
    </PageContainer>
  );
}
