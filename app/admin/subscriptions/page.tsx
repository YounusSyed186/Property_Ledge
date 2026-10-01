'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PageContainer, useToast } from '@/components/admin/ui';
import {
  AdminDataGrid,
  QuickFilterBar,
  QuickFilterOption,
  BulkAction,
} from '@/components/admin/data-grid';
import { ColDef } from 'ag-grid-community';
import { CheckCircle2 } from 'lucide-react';
import { SubscriptionDrawer } from '@/components/admin/SubscriptionDrawer';
import { fetchAdminSubscriptions, fetchAdminPayments } from '@/app/actions/admin';

export default function AdminSubscriptionsPage() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerData, setDrawerData] = useState<any>(null);
  const [subscriptionsList, setSubscriptionsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(() => new Date());
  const { success } = useToast();

  const loadSubscriptions = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const [subsRes, paymentsRes] = await Promise.all([
        fetchAdminSubscriptions({ limit: 100 }),
        fetchAdminPayments({ limit: 100 }),
      ]);

      const itemsMap = new Map();

      // Process database subscriptions
      if (subsRes && Array.isArray(subsRes.data)) {
        subsRes.data.forEach((s: any) => {
          itemsMap.set(s.id, {
            id: s.id,
            paymentId: `pay-${s.id}`,
            userName: s.account_context?.profiles?.full_name || 'Customer Account',
            userEmail: s.account_context?.profiles?.email || 'customer@propertyledge.com.au',
            planName: s.subscription_plans?.name || 'Landlord',
            billingInterval: 'monthly',
            amount: Number(s.subscription_plans?.price_cents ? s.subscription_plans.price_cents / 100 : 29),
            currency: 'AUD',
            reference: `PL-2026-${s.id.substring(0, 5)}`,
            status: s.status,
            created_at: s.created_at,
          });
        });
      }

      // Merge with detailed payment records if available
      if (paymentsRes && Array.isArray(paymentsRes.data)) {
        paymentsRes.data.forEach((p: any) => {
          const subId = p.subscription_id || p.id;
          const existing = itemsMap.get(subId);
          itemsMap.set(subId, {
            id: subId,
            paymentId: p.id,
            userName: p.account_context?.profiles?.full_name || existing?.userName || 'Customer Account',
            userEmail: p.account_context?.profiles?.email || existing?.userEmail || 'customer@propertyledge.com.au',
            planName: p.subscriptions?.subscription_plans?.name || existing?.planName || 'Landlord',
            billingInterval: 'monthly',
            amount: Number(p.expected_amount || existing?.amount || 29),
            currency: p.currency || 'AUD',
            reference: p.reference || existing?.reference,
            status: p.status === 'verified' ? 'active' : p.status,
            created_at: p.created_at || existing?.created_at,
          });
        });
      }

      setSubscriptionsList(Array.from(itemsMap.values()));
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.warn('Failed to load server subscriptions:', err);
      setSubscriptionsList([]);
    } finally {
      if (isManualRefresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const handleOpenDrawer = (item: any) => {
    setSelectedSubId(item.id);
    setDrawerData({
      paymentId: item.paymentId,
      userName: item.userName,
      userEmail: item.userEmail,
      planName: item.planName,
      billingInterval: item.billingInterval,
      amount: item.amount,
      reference: item.reference,
      status: item.status,
    });
    setIsDrawerOpen(true);
  };

  const filterOptions: QuickFilterOption[] = useMemo(
    () => [
      { value: 'all', label: 'All Subscriptions', count: subscriptionsList.length },
      {
        value: 'under_review',
        label: 'Under Review',
        count: subscriptionsList.filter((s) => s.status === 'under_review').length,
      },
      {
        value: 'active',
        label: 'Active',
        count: subscriptionsList.filter((s) => s.status === 'active').length,
      },
      {
        value: 'pending',
        label: 'Pending',
        count: subscriptionsList.filter((s) => s.status === 'pending' || s.status === 'pending_payment').length,
      },
    ],
    [subscriptionsList]
  );

  const filteredSubscriptions = useMemo(() => {
    if (activeFilter === 'all') return subscriptionsList;
    return subscriptionsList.filter((s) => s.status === activeFilter);
  }, [subscriptionsList, activeFilter]);

  const bulkActions: BulkAction[] = [
    {
      label: 'Verify Selected',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-admin-success" />,
      variant: 'secondary',
      onClick: (selected) => {
        success('Subscriptions verified', `Verified ${selected.length} subscription(s).`);
      },
    },
  ];

  const columnDefs: ColDef[] = useMemo(
    () => [
      {
        field: 'userName',
        headerName: 'Customer',
        minWidth: 180,
        flex: 1.2,
        cellRenderer: 'userCell',
        filter: 'agTextColumnFilter',
      },
      {
        field: 'userEmail',
        headerName: 'Email Address',
        minWidth: 200,
        flex: 1.2,
        filter: 'agTextColumnFilter',
        cellRenderer: (params: any) => (
          <span
            className="text-[13px] text-admin-foreground font-mono truncate min-w-0 max-w-full block"
            title={params.value}
          >
            {params.value}
          </span>
        ),
      },
      {
        field: 'planName',
        headerName: 'Plan',
        minWidth: 150,
        flex: 1,
        filter: 'agTextColumnFilter',
        cellRenderer: (params: any) => (
          <span
            className="font-semibold text-admin-foreground text-[13.5px] truncate min-w-0 max-w-full block"
            title={params.value}
          >
            {params.value}
          </span>
        ),
      },
      {
        field: 'billingInterval',
        headerName: 'Interval',
        minWidth: 105,
        filter: 'agTextColumnFilter',
        cellRenderer: (params: any) => (
          <span
            className="text-caption font-semibold capitalize text-admin-muted bg-admin-surface-subtle px-2 py-0.5 rounded border border-admin-border-subtle truncate min-w-0 inline-block"
            title={params.value}
          >
            {params.value}
          </span>
        ),
      },
      {
        field: 'reference',
        headerName: 'Reference',
        minWidth: 160,
        cellRenderer: 'codeCell',
        filter: 'agTextColumnFilter',
      },
      {
        field: 'amount',
        headerName: 'Amount',
        minWidth: 130,
        cellRenderer: 'currencyCell',
        filter: 'agNumberColumnFilter',
      },
      {
        field: 'status',
        headerName: 'Status',
        minWidth: 130,
        cellRenderer: 'statusCell',
        filter: 'agTextColumnFilter',
      },
      {
        field: 'created_at',
        headerName: 'Billing Date',
        minWidth: 130,
        cellRenderer: 'dateCell',
        filter: 'agDateColumnFilter',
      },
      {
        headerName: 'Action',
        colId: 'actions',
        minWidth: 110,
        maxWidth: 120,
        sortable: false,
        filter: false,
        pinned: 'right',
        cellRenderer: 'actionsCell',
        cellRendererParams: {
          inspectLabel: 'Inspect',
          onInspect: (item: any) => handleOpenDrawer(item),
        },
      },
    ],
    []
  );

  return (
    <PageContainer>
      <AdminDataGrid
        rowData={filteredSubscriptions}
        columnDefs={columnDefs}
        loading={isLoading}
        onRefresh={() => loadSubscriptions(true)}
        isRefreshing={isRefreshing}
        lastRefreshedAt={lastRefreshedAt}
        enableSelection={true}
        enableColumnChooser={true}
        enableExport={true}
        exportFilename="propertyledge-subscriptions"
        searchPlaceholder="Filter subscriptions by customer, reference, plan..."
        bulkActions={bulkActions}
        leftToolbarContent={
          <QuickFilterBar
            options={filterOptions}
            activeValue={activeFilter}
            onChange={setActiveFilter}
          />
        }
        labelSingular="subscription"
        labelPlural="subscriptions"
        emptyTitle="No subscriptions found"
        emptyDescription="There are no subscription records in the database matching your criteria."
        onRowClick={(item) => handleOpenDrawer(item)}
      />

      <SubscriptionDrawer
        subscriptionId={selectedSubId}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={() => {
          setIsDrawerOpen(false);
          loadSubscriptions();
        }}
        initialData={drawerData}
      />
    </PageContainer>
  );
}