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
import { Receipt, Eye } from 'lucide-react';
import { SubscriptionDrawer } from '@/components/admin/SubscriptionDrawer';

export default function AdminPaymentsPage() {
  const [search, setSearch] = useState('');
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerData, setDrawerData] = useState<any>(null);

  const payments = [
    {
      id: 'pay-001',
      subscription_id: 'sub-001',
      reference: 'PL-2026-84920',
      userName: 'Sarah Williams',
      userEmail: 'sarah.williams@propertyledge.com.au',
      planName: 'Property Manager',
      expected_amount: 79,
      submitted_amount: 79,
      status: 'under_review',
      created_at: '2026-08-22 19:30',
    },
    {
      id: 'pay-002',
      subscription_id: 'sub-002',
      reference: 'PL-2026-19402',
      userName: 'Michael Carter',
      userEmail: 'michael@carterproperties.com.au',
      planName: 'Landlord',
      expected_amount: 29,
      submitted_amount: 29,
      status: 'under_review',
      created_at: '2026-08-22 16:15',
    },
    {
      id: 'pay-003',
      subscription_id: 'sub-003',
      reference: 'PL-2026-50193',
      userName: 'David Miller',
      userEmail: 'david.miller@investments.com.au',
      planName: 'Landlord',
      expected_amount: 290,
      submitted_amount: 290,
      status: 'verified',
      created_at: '2026-08-21 11:20',
    },
  ];

  const filtered = payments.filter(
    (p) =>
      p.userName.toLowerCase().includes(search.toLowerCase()) ||
      p.reference.toLowerCase().includes(search.toLowerCase()) ||
      p.userEmail.toLowerCase().includes(search.toLowerCase())
  );

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

  const getStatusVariant = (status: string) => {
    if (status === 'verified') return 'success' as const;
    return 'warning' as const;
  };

  return (
    <PageContainer>
      <PageHeader
        title="Payments"
        description="Audit invoices, transaction logs, and manual bank transfers."
        breadcrumb={
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-caption text-admin-muted">
            <span>Platform</span>
            <span aria-hidden="true" className="text-admin-muted/50">/</span>
            <span className="text-admin-foreground font-medium">Payments</span>
          </nav>
        }
      />

      <Card>
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search payments by reference..."
          leftContent={
            <div className="flex items-center gap-2 text-caption text-admin-muted">
              <Receipt className="w-4 h-4 text-admin-primary" />
              <span className="font-semibold text-admin-foreground">{filtered.length}</span>
              <span>payments</span>
            </div>
          }
        />

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Receipt className="w-6 h-6" />}
            title="No payments found"
            description="No payments match your current search criteria."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <span className="font-mono text-caption text-admin-muted">{p.id}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-admin-primary/15 border border-admin-primary/30 flex items-center justify-center text-xs font-bold text-admin-primary shrink-0">
                        {p.userName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-admin-foreground">{p.userName}</p>
                        <p className="text-metadata text-admin-muted font-mono truncate">{p.userEmail}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-body-sm font-semibold text-admin-primary">{p.reference}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-bold text-admin-foreground">${p.submitted_amount.toFixed(2)} AUD</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(p.status)} dot>
                      {p.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenDrawer(p)}
                      leftIcon={<Eye className="w-3.5 h-3.5" />}
                    >
                      Inspect Receipt
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