'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, DollarSign, TrendingUp, AlertCircle, Receipt, Wallet } from 'lucide-react';
import { ColDef } from 'ag-grid-community';
import { Button, useToast } from '@/components/admin/ui';
import { AdminDataGrid } from '@/components/admin/data-grid';
import { PropertyRequired } from '@/components/dashboard/PropertyRequired';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { ListPage, ListPageGrid, CompactKpiCard, SectionPanel, ProgressBar, HubTabs, PageSkeleton } from '@/components/workspace';
import { createEntityDrawer } from '@/components/dashboard/entities/createEntityDrawer';
import {
  invoiceFields,
  invoiceColumns,
  paymentFields,
  paymentColumns,
  expenseFields,
  expenseColumns,
} from '@/components/dashboard/entities/config';
import { formatCurrency } from '@/lib/format/currency';
import {
  fetchDashboardInvoices,
  fetchDashboardPayments,
  fetchDashboardExpenses,
  fetchDashboardReports,
  handleCreateInvoice,
  handleUpdateInvoice,
  handleDeleteInvoice,
  handleCreatePayment,
  handleUpdatePayment,
  handleDeletePayment,
  handleCreateExpense,
  handleUpdateExpense,
  handleDeleteExpense,
} from '@/app/actions/dashboard';

const InvoiceDrawer = createEntityDrawer('Invoice', invoiceFields, {
  onCreate: handleCreateInvoice,
  onUpdate: handleUpdateInvoice,
  onDelete: handleDeleteInvoice,
}, { status: 'draft', subtotal: 0, tax_amount: 0, balance_due: 0 });

const PaymentDrawer = createEntityDrawer('Payment', paymentFields, {
  onCreate: handleCreatePayment,
  onUpdate: handleUpdatePayment,
  onDelete: handleDeletePayment,
}, { status: 'completed' });

const ExpenseDrawer = createEntityDrawer('Expense', expenseFields, {
  onCreate: handleCreateExpense,
  onUpdate: handleUpdateExpense,
  onDelete: handleDeleteExpense,
}, { status: 'pending' });

type MoneyTab = 'overview' | 'invoices' | 'payments' | 'expenses';

function FinanceOverview() {
  const { selectedProperty } = usePropertyContext();
  const [reports, setReports] = useState<Awaited<ReturnType<typeof fetchDashboardReports>> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedProperty) return;
    setReports(null);
    setIsLoading(true);
    setError(null);
    fetchDashboardReports(selectedProperty.propertyId)
      .then(setReports)
      .catch(() => setError('Could not load financial summary.'))
      .finally(() => setIsLoading(false));
  }, [selectedProperty?.propertyId]);

  if (isLoading) {
    return <PageSkeleton rows={4} />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-admin-border bg-admin-surface p-6 text-center">
        <p className="text-[13px] text-admin-muted">{error}</p>
      </div>
    );
  }

  if (!reports) return null;

  const collected = reports.totalRevenue;
  const outstanding = reports.outstandingBalance;
  const expected = collected + outstanding;
  const pct = expected > 0 ? Math.round((collected / expected) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <CompactKpiCard label="Expected Rent" value={formatCurrency(expected)} icon={TrendingUp} accent="blue" />
        <CompactKpiCard label="Collected" value={formatCurrency(collected)} icon={Wallet} accent="teal" />
        <CompactKpiCard label="Outstanding" value={formatCurrency(outstanding)} icon={AlertCircle} accent="amber" />
        <CompactKpiCard label="Expenses" value={formatCurrency(reports.totalExpenses)} icon={Receipt} accent="neutral" />
        <CompactKpiCard label="Net Income" value={formatCurrency(collected - reports.totalExpenses)} icon={DollarSign} accent="indigo" />
      </div>
      <SectionPanel title="Rent collection">
        <p className="text-[13px] text-admin-muted mb-2">{formatCurrency(collected)} collected · {formatCurrency(outstanding)} outstanding</p>
        <ProgressBar value={pct} />
        <p className="mt-2 text-[12px] font-medium text-admin-foreground">{pct}% collected</p>
      </SectionPanel>
    </div>
  );
}

const TAB_CONFIG: Record<Exclude<MoneyTab, 'overview'>, {
  title: string;
  label: string;
  labelPlural: string;
  fetchAction: (propertyId: string) => Promise<Array<{ id: string }>>;
  columnDefs: ColDef[];
  Drawer: ReturnType<typeof createEntityDrawer>;
}> = {
  invoices: {
    title: 'Invoices',
    label: 'invoice',
    labelPlural: 'invoices',
    fetchAction: fetchDashboardInvoices,
    columnDefs: invoiceColumns,
    Drawer: InvoiceDrawer,
  },
  payments: {
    title: 'Payments',
    label: 'payment',
    labelPlural: 'payments',
    fetchAction: fetchDashboardPayments,
    columnDefs: paymentColumns,
    Drawer: PaymentDrawer,
  },
  expenses: {
    title: 'Expenses',
    label: 'expense',
    labelPlural: 'expenses',
    fetchAction: fetchDashboardExpenses,
    columnDefs: expenseColumns,
    Drawer: ExpenseDrawer,
  },
};

function MoneyTabContent({ tab, openCreate }: { tab: Exclude<MoneyTab, 'overview'>; openCreate?: boolean }) {
  const { selectedProperty } = usePropertyContext();
  const router = useRouter();
  const { error: showError } = useToast();
  const config = TAB_CONFIG[tab];
  const [rows, setRows] = useState<Array<{ id: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState<{ id: string } | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreate, setIsCreate] = useState(false);

  const loadData = async () => {
    if (!selectedProperty) return;
    setIsLoading(true);
    try {
      const data = await config.fetchAction(selectedProperty.propertyId);
      setRows(data);
    } catch (err) {
      console.error(`Failed to load ${config.labelPlural}:`, err);
      showError('Load failed', `Could not load ${config.labelPlural}.`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedProperty) return;
    setRows([]);
    loadData();
  }, [selectedProperty?.propertyId, tab]);

  useEffect(() => {
    if (openCreate) {
      setSelectedEntity(null);
      setIsCreate(true);
      setIsDrawerOpen(true);
      router.replace(`/dashboard/money?tab=${tab}`, { scroll: false });
    }
  }, [openCreate, tab, router]);

  const columns = useMemo<ColDef[]>(
    () => [
      ...config.columnDefs,
      {
        headerName: '',
        field: 'actions',
        width: 80,
        sortable: false,
        filter: false,
        cellRenderer: (params: { data: { id: string } }) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedEntity(params.data);
              setIsCreate(false);
              setIsDrawerOpen(true);
            }}
            className="text-xs text-admin-primary hover:underline"
          >
            Edit
          </button>
        ),
      },
    ],
    [config.columnDefs]
  );

  const DrawerComponent = config.Drawer;

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <p className="text-caption text-admin-muted">
            {selectedProperty?.propertyName} — {rows.length} {rows.length === 1 ? config.label : config.labelPlural}
          </p>
          <Button
            onClick={() => {
              setSelectedEntity(null);
              setIsCreate(true);
              setIsDrawerOpen(true);
            }}
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add {config.title.replace(/s$/, '')}
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <AdminDataGrid
            rowData={rows}
            columnDefs={columns}
            loading={isLoading}
            labelSingular={config.label}
            labelPlural={config.labelPlural}
            searchPlaceholder={`Search ${config.labelPlural}...`}
            onRowClick={(row) => {
              setSelectedEntity(row);
              setIsCreate(false);
              setIsDrawerOpen(true);
            }}
            getRowId={(params) => params.data.id}
          />
        </div>
      </div>

      {selectedProperty && (
        <DrawerComponent
          entity={selectedEntity}
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          onSuccess={() => {
            setIsDrawerOpen(false);
            loadData();
          }}
          propertyId={selectedProperty.propertyId}
          isCreate={isCreate}
        />
      )}
    </>
  );
}

export default function MoneyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab');
  const openCreate = searchParams.get('create') === '1';
  const activeTab: MoneyTab =
    tabParam === 'invoices' || tabParam === 'payments' || tabParam === 'expenses'
      ? tabParam
      : 'overview';

  const handleTabChange = (value: string) => {
    if (value === 'overview') {
      router.replace('/dashboard/money', { scroll: false });
    } else {
      router.replace(`/dashboard/money?tab=${value}`, { scroll: false });
    }
  };

  return (
    <PropertyRequired>
      <ListPage
        title="Finances"
        description="Track rent collection, invoices, payments, and expenses."
        fill={activeTab !== 'overview'}
        actions={
          activeTab === 'invoices' ? (
            <Button size="sm" onClick={() => router.push('/dashboard/money?tab=invoices&create=1')}>
              <Plus className="mr-1 h-3 w-3" /> Create Invoice
            </Button>
          ) : undefined
        }
      >
        <HubTabs
          tabs={[
            { value: 'overview', label: 'Overview' },
            { value: 'invoices', label: 'Invoices' },
            { value: 'payments', label: 'Payments' },
            { value: 'expenses', label: 'Expenses' },
          ]}
          value={activeTab}
          onChange={handleTabChange}
          className="shrink-0"
        />
        {activeTab === 'overview' ? (
          <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar">
            <FinanceOverview />
          </div>
        ) : (
          <ListPageGrid>
            <MoneyTabContent tab={activeTab} openCreate={openCreate && activeTab === 'invoices'} />
          </ListPageGrid>
        )}
      </ListPage>
    </PropertyRequired>
  );
}
