'use client';

import React, { useState } from 'react';
import { Search, Users, ShieldCheck, Mail, Phone, Building2 } from 'lucide-react';

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');

  const users = [
    {
      id: 'd0d346bf-5582-411a-8e2b-7c5efbb56f8f',
      name: 'Sarah Williams',
      email: 'sarah.williams@propertyledge.com.au',
      phone: '+61 491 570 156',
      role: 'Property Manager',
      accountType: 'business',
      businessName: 'Williams Property Holdings',
      status: 'Active',
    },
    {
      id: 'a1e258cb-3a8f-4d9e-a00d-5871dfcb8d9e',
      name: 'PropertyLedge Administrator',
      email: 'admin@propertyledge.com.au',
      phone: '+61 2 9000 1234',
      role: 'Super Admin',
      accountType: 'individual',
      status: 'Active Admin',
    },
    {
      id: 'b0000000-0000-0000-0000-000000000001',
      name: 'Michael Carter',
      email: 'michael@carterproperties.com.au',
      phone: '+61 400 111 222',
      role: 'Landlord',
      accountType: 'individual',
      status: 'Active',
    },
  ];

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left pb-8 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-admin-surface border border-admin-border rounded-xl p-4 shadow-xs">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-admin-primary">
            Customer Directory
          </span>
          <h2 className="text-base font-bold font-heading text-white">Registered Users & Accounts</h2>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-admin-muted absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-admin-sidebar-surface border border-admin-border text-xs text-admin-foreground focus:outline-none focus:border-admin-primary"
          />
        </div>
      </div>

      <div className="bg-admin-surface border border-admin-border rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-admin-border/60 bg-admin-sidebar-surface/40 text-admin-muted uppercase font-mono text-[10px]">
                <th className="p-3.5 font-semibold">User</th>
                <th className="p-3.5 font-semibold">Contact Info</th>
                <th className="p-3.5 font-semibold">Account Type</th>
                <th className="p-3.5 font-semibold">Role</th>
                <th className="p-3.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border/40 text-admin-foreground">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-admin-sidebar-surface/40 transition-colors">
                  <td className="p-3.5">
                    <p className="font-bold text-white">{u.name}</p>
                    <p className="text-[10px] text-admin-muted font-mono">{u.id}</p>
                  </td>
                  <td className="p-3.5 space-y-0.5">
                    <p className="text-white font-mono text-[11px] flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-admin-primary" />
                      <span>{u.email}</span>
                    </p>
                    <p className="text-admin-muted text-[11px] flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-admin-muted" />
                      <span>{u.phone}</span>
                    </p>
                  </td>
                  <td className="p-3.5 capitalize font-medium">
                    {u.accountType} {u.businessName ? `(${u.businessName})` : ''}
                  </td>
                  <td className="p-3.5 font-bold text-admin-primary">{u.role}</td>
                  <td className="p-3.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-admin-success-soft text-admin-success border border-admin-success/30 font-mono text-[9px] font-bold uppercase">
                      {u.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
