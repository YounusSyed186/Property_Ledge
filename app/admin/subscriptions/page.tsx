'use client';

import React, { useState } from 'react';
import {
  PageContainer,
  PageHeader,
  Card,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableToolbar,
  Badge,
  Button,
  EmptyState,
} from '@/components/admin/ui';
import { CreditCard, Search, Eye } from 'lucide-react';
import { SubscriptionDrawer } from '@/components/admin/SubscriptionDrawer';

export default function AdminSubscriptionsPage() {
  const [filter, setFilter] = useState<'all' | 'under_review' | 'active' | 'pending'>('all');
  const [search, setSearch] = useState('');
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerData, setDrawerData] = useState<any>(null);

  const subscriptions = [
    {
      id: 'sub-001',
      paymentId: 'pay-001',
      userName: 'Sarah Williams',
      userEmail: 'sarah.williams@propertyledge.com.au',
      planName: 'Property Manager',
      billingInterval: 'monthly',
      amount: 79,
      reference: 'PL-2026-84920',
      status: 'under_review',
      created_at: '2026-08-22',
    },
    {
      id: 'sub-002',
      paymentId: 'pay-002',
      userName: 'Michael Carter',
      userEmail: 'michael@carterproperties.com.au',
      planName: 'Landlord',
      billingInterval: 'monthly',
      amount: 29,
      reference: 'PL-2026-19402',
      status: 'under_review',
      created_at: '2026-08-22',
    },
    {
      id: 'sub-003',
      paymentId: 'pay-003',
      userName: 'David Miller',
      userEmail: 'david.miller@investments.com.au',
      planName: 'Landlord',
      billingInterval: 'yearly',
      amount: 290,
      reference: 'PL-2026-50193',
      status: 'active',
      created_at: '2026-08-21',
    },
    {
      id: 'sub-004',
      paymentId: 'pay-004',
      userName: 'Emma Thompson',
      userEmail: 'emma@thompsonrealestate.com.au',
      planName: 'Property Manager',
      billingInterval: 'monthly',
      amount: 79,
      reference: 'PL-2026-92817',
      status: 'active',
      created_at: '2026-08-20',
    },
  ];

  const filtered = subscriptions.filter((s) => {
    if (filter !== 'all' && s.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.userName.toLowerCase().includes(q) ||
        s.userEmail.toLowerCase().includes(q) ||
        s.reference.toLowerCase().includes(q) ||
        s.planName.toLowerCase().includes(q)
      );
    }
    return true;
  });

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

  const getStatusVariant = (status: string) => {
    if (status === 'active') return 'success' as const;
    if (status === 'under_review') return 'warning' as const;
    return 'danger' as const;
  };

  const filterTabs = [
    { value: 'all' as const, label: 'All' },
    { value: 'under_review' as const, label: 'Under Review' },
    { value: 'active' as const, label: 'Active' },
    { value: 'pending' as const, label: 'Pending' },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Subscriptions"
        description="Evaluate billing lifecycle and payments verification queue across the platform."
        breadcrumb={
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-caption text-admin-muted">
            <span>Platform</span>
            <span aria-hidden="true" className="text-admin-muted/50">/</span>
            <span className="text-admin-foreground font-medium">Subscriptions</span>
          </nav>
        }
      />

      <Card>
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Filter subscriptions..."
          leftContent={
            <div className="flex items-center gap-1 bg-admin-sidebar-surface p-1 rounded-lg border border-admin-border">
              {filterTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setFilter(tab.value)}
                  className={`px-3 py-1.5 rounded-md text-caption font-semibold transition-all duration-200 ${
                    filter === tab.value
                      ? 'bg-admin-primary text-black shadow-elevation-1'
                      : 'text-admin-muted hover:text-admin-foreground'
                  }`}
                  aria-pressed={filter === tab.value}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          }
          rightContent={
            <div className="flex items-center gap-2 text-caption text-admin-muted">
              <CreditCard className="w-4 h-4 text-admin-primary" />
              <span className="font-semibold text-admin-foreground">{filtered.length}</span>
              <span>subscriptions</span>
            </div>
          }
        />

        {filtered.length === 0 ? (
          <EmptyState
            icon={<CreditCard className="w-6 h-6" />}
            title="No subscriptions found"
            description="No subscriptions match your current filter criteria."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-admin-primary/15 border border-admin-primary/30 flex items-center justify-center text-xs font-bold text-admin-primary shrink-0">
                        {item.userName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-admin-foreground">{item.userName}</p>
                        <p className="text-metadata text-admin-muted font-mono truncate">{item.userEmail}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-body-sm text-admin-foreground">
                      {item.planName} <span className="text-admin-muted">({item.billingInterval})</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-body-sm text-admin-primary">{item.reference}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-bold text-admin-foreground">${item.amount.toFixed(2)} AUD</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(item.status)} dot>
                      {item.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenDrawer(item)}
                      leftIcon={<Eye className="w-3.5 h-3.5" />}
                    >
                      Inspect
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <SubscriptionDrawer
        subscriptionId={selectedSubId}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={() => setIsDrawerOpen(false)}
        initialData={drawerData}
      />
    </PageContainer>
  );
}