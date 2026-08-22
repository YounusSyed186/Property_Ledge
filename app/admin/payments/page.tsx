'use client';

import React, { useState } from 'react';
import { Search, Receipt, CreditCard, FileText, CheckCircle, Clock } from 'lucide-react';
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

  return (
    <div className="space-y-6 text-left pb-8 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-admin-surface border border-admin-border rounded-xl p-4 shadow-xs">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-admin-primary">
            Manual Payments Ledger
          </span>
          <h2 className="text-base font-bold font-heading text-white">Bank Transfer Receipts & Verification</h2>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-admin-muted absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search payments by reference..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-admin-sidebar-surface border border-admin-border text-xs text-admin-foreground focus:outline-none focus:border-admin-primary"
          />
        </div>
      </div>

      <div className="bg-admin-surface border border-admin-border rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-admin-border/60 bg-admin-sidebar-surface/40 text-admin-muted uppercase font-mono text-[10px]">
                <th className="p-3.5 font-semibold">Payment ID</th>
                <th className="p-3.5 font-semibold">Customer</th>
                <th className="p-3.5 font-semibold">Reference</th>
                <th className="p-3.5 font-semibold">Amount</th>
                <th className="p-3.5 font-semibold">Status</th>
                <th className="p-3.5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border/40 text-admin-foreground">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-admin-sidebar-surface/40 transition-colors">
                  <td className="p-3.5 font-mono text-admin-muted">{p.id}</td>
                  <td className="p-3.5">
                    <p className="font-bold text-white">{p.userName}</p>
                    <p className="text-[10px] text-admin-muted font-mono">{p.userEmail}</p>
                  </td>
                  <td className="p-3.5 font-mono font-bold text-admin-primary">{p.reference}</td>
                  <td className="p-3.5 font-extrabold text-white">${p.submitted_amount.toFixed(2)} AUD</td>
                  <td className="p-3.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border ${
                        p.status === 'verified'
                          ? 'bg-admin-success-soft text-admin-success border-admin-success/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {p.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleOpenDrawer(p)}
                      className="px-3 py-1.5 rounded-lg bg-admin-primary-soft text-admin-primary hover:bg-admin-primary hover:text-black font-semibold text-[11px] transition-all"
                    >
                      Inspect Receipt
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
