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
import { CheckCircle } from 'lucide-react';
import { SubscriptionDrawer } from '@/components/admin/SubscriptionDrawer';
import { fetchAdminPayments } from '@/app/actions/admin';

export default function AdminPaymentsPage() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerData, setDrawerData] = useState<any>(null);
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(() => new Date());
  const { success } = useToast();

  const loadPayments = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const res = await fetchAdminPayments({ limit: 100 });
      if (res && Array.isArray(res.data) && res.data.length > 0) {
        const formatted = res.data.map((p: any) => ({
          id: p.id,
          subscription_id: p.subscription_id,
          reference: p.reference,
          userName: p.account_context?.profiles?.full_name || 'Customer',
          userEmail: p.account_context?.profiles?.email || 'customer@propertyledge.com.au',
          planName: p.subscriptions?.subscription_plans?.name || 'Landlord',
          expected_amount: Number(p.expected_amount || 0),
          submitted_amount: Number(p.submitted_amount || p.expected_amount || 0),
          currency: p.currency || 'AUD',
          status: p.status,
          created_at: p.created_at,
        }));
        setPaymentsList(formatted);
      } else {
        setPaymentsList([]);
      }
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.warn('Failed to load server payments:', err);
      setPaymentsList([]);
    } finally {
      if (isManualRefresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const handleOpenDrawer = (p: any) => {
    setSelectedSubId(p.subscription_id);
    setDrawerData({
      paymentId: p.id,
      userName: p.userName,
      userEmail: p.userEmail,
      planName: p.planName,
      billingInterval: 'monthly',
      amount: p.submitted_amount,
      reference: p.reference,
      status: p.status,
    });
    setIsDrawerOpen(true);
  };

  const filterOptions: QuickFilterOption[] = useMemo(
    () => [
      { value: 'all', label: 'All Payments', count: paymentsList.length },
      {
        value: 'under_review',
        label: 'Under Review',
        count: paymentsList.filter((p) => p.status === 'under_review').length,
      },
      {
        value: 'verified',
        label: 'Verified',
        count: paymentsList.filter((p) => p.status === 'verified').length,
      },
      {
        value: 'pending',
        label: 'Pending',
        count: paymentsList.filter((p) => p.status === 'pending').length,
      },
    ],
    [paymentsList]
  );

  const filteredPayments = useMemo(() => {
    if (activeFilter === 'all') return paymentsList;
    return paymentsList.filter((p) => p.status === activeFilter);
  }, [paymentsList, activeFilter]);

  const bulkActions: BulkAction[] = [
    {
      label: 'Verify Selected',
      icon: <CheckCircle className="w-3.5 h-3.5 text-admin-success" />,
      variant: 'secondary',
      onClick: (selected) => {
        success('Payments verified', `Verified ${selected.length} manual payment transfer(s).`);
      },
    },
  ];

  const columnDefs: ColDef[] = useMemo(
    () => [
      {
        field: 'id',
        headerName: 'Payment ID',
        minWidth: 120,
        maxWidth: 140,
        cellRenderer: 'codeCell',
        filter: 'agTextColumnFilter',
      },
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
        field: 'reference',
        headerName: 'Reference',
        minWidth: 160,
        cellRenderer: 'codeCell',
        filter: 'agTextColumnFilter',
      },
      {
        field: 'expected_amount',
        headerName: 'Expected',
        minWidth: 120,
        cellRenderer: 'currencyCell',
        filter: 'agNumberColumnFilter',
      },
      {
        field: 'submitted_amount',
        headerName: 'Amount Paid',
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
        headerName: 'Payment Date',
        minWidth: 130,
        cellRenderer: 'dateCell',
        filter: 'agDateColumnFilter',
      },
      {
        headerName: 'Action',
        colId: 'actions',
        minWidth: 130,
        maxWidth: 140,
        sortable: false,
        filter: false,
        pinned: 'right',
        cellRenderer: 'actionsCell',
        cellRendererParams: {
          inspectLabel: 'Inspect Receipt',
          onInspect: (p: any) => handleOpenDrawer(p),
        },
      },
    ],
    []
  );

  return (
    <PageContainer>
      <AdminDataGrid
        rowData={filteredPayments}
        columnDefs={columnDefs}
        loading={isLoading}
        onRefresh={() => loadPayments(true)}
        isRefreshing={isRefreshing}
        lastRefreshedAt={lastRefreshedAt}
        enableSelection={true}
        enableColumnChooser={true}
        enableExport={true}
        exportFilename="propertyledge-payments"
        searchPlaceholder="Search payments by reference, customer..."
        bulkActions={bulkActions}
        leftToolbarContent={
          <QuickFilterBar
            options={filterOptions}
            activeValue={activeFilter}
            onChange={setActiveFilter}
          />
        }
        labelSingular="payment"
        labelPlural="payments"
        emptyTitle="No payments found"
        emptyDescription="There are no payment transfer records in the database matching your criteria."
        onRowClick={(p) => handleOpenDrawer(p)}
      />

      <SubscriptionDrawer
        subscriptionId={selectedSubId}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={() => {
          setIsDrawerOpen(false);
          loadPayments();
        }}
        initialData={drawerData}
      />
    </PageContainer>
  );
}