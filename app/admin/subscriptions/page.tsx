'use client';

import React, { useState } from 'react';
import { Search, Filter, CreditCard, ArrowRight, Clock, CheckCircle, AlertCircle } from 'lucide-react';
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

  return (
    <div className="space-y-6 text-left pb-8 font-sans">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-admin-surface border border-admin-border rounded-xl p-4 shadow-xs">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-admin-sidebar-surface p-1 rounded-lg border border-admin-border text-xs">
          {(['all', 'under_review', 'active', 'pending'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md font-semibold capitalize transition-all ${
                filter === f
                  ? 'bg-admin-primary text-black font-bold shadow-xs'
                  : 'text-admin-muted hover:text-admin-foreground'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-admin-muted absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter subscriptions..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-admin-sidebar-surface border border-admin-border text-xs text-admin-foreground focus:outline-none focus:border-admin-primary"
          />
        </div>
      </div>

      {/* Subscriptions Data Table */}
      <div className="bg-admin-surface border border-admin-border rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-admin-border/60 flex items-center justify-between">
          <h2 className="text-sm font-bold font-heading text-white uppercase tracking-wider">
            Subscription Lifecycle ({filtered.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-admin-border/60 bg-admin-sidebar-surface/40 text-admin-muted uppercase font-mono text-[10px]">
                <th className="p-3.5 font-semibold">Customer</th>
                <th className="p-3.5 font-semibold">Plan</th>
                <th className="p-3.5 font-semibold">Reference</th>
                <th className="p-3.5 font-semibold">Amount</th>
                <th className="p-3.5 font-semibold">Status</th>
                <th className="p-3.5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border/40 text-admin-foreground">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-admin-sidebar-surface/40 transition-colors">
                  <td className="p-3.5">
                    <p className="font-bold text-white">{item.userName}</p>
                    <p className="text-[10px] text-admin-muted font-mono">{item.userEmail}</p>
                  </td>
                  <td className="p-3.5 font-medium">{item.planName} ({item.billingInterval})</td>
                  <td className="p-3.5 font-mono text-admin-primary">{item.reference}</td>
                  <td className="p-3.5 font-extrabold text-white">${item.amount.toFixed(2)} AUD</td>
                  <td className="p-3.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border ${
                        item.status === 'active'
                          ? 'bg-admin-success-soft text-admin-success border-admin-success/30'
                          : item.status === 'under_review'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-admin-danger/10 text-admin-danger border-admin-danger/30'
                      }`}
                    >
                      {item.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleOpenDrawer(item)}
                      className="px-3 py-1.5 rounded-lg bg-admin-primary-soft text-admin-primary hover:bg-admin-primary hover:text-black font-semibold text-[11px] transition-all"
                    >
                      Inspect & Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <SubscriptionDrawer
        subscriptionId={selectedSubId}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={() => setIsDrawerOpen(false)}
        initialData={drawerData}
      />
    </div>
  );
}
