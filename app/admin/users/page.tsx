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
  EmptyState,
} from '@/components/admin/ui';
import { Users, Mail, Phone, Building2, UserCircle2 } from 'lucide-react';

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
    <PageContainer>
      <PageHeader
        title="Users"
        description="Inspect property managers, landlord accounts, and customer details across the platform."
        breadcrumb={
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-caption text-admin-muted">
            <span>Platform</span>
            <span aria-hidden="true" className="text-admin-muted/50">/</span>
            <span className="text-admin-foreground font-medium">Users</span>
          </nav>
        }
      />

      <Card>
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search users..."
          leftContent={
            <div className="flex items-center gap-2 text-caption text-admin-muted">
              <Users className="w-4 h-4 text-admin-primary" />
              <span className="font-semibold text-admin-foreground">{filtered.length}</span>
              <span>users</span>
            </div>
          }
        />

        {filtered.length === 0 ? (
          <EmptyState
            icon={<UserCircle2 className="w-6 h-6" />}
            title="No users found"
            description="No users match your current search criteria."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead>Account Type</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-admin-primary/15 border border-admin-primary/30 flex items-center justify-center text-xs font-bold text-admin-primary shrink-0">
                        {u.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-admin-foreground">{u.name}</p>
                        <p className="text-metadata text-admin-muted font-mono truncate">{u.id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="text-body-sm text-admin-foreground flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-admin-primary" />
                        <span className="truncate">{u.email}</span>
                      </p>
                      <p className="text-caption text-admin-muted flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{u.phone}</span>
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-admin-muted" />
                      <span className="text-body-sm capitalize text-admin-foreground">
                        {u.accountType}
                        {u.businessName ? ` (${u.businessName})` : ''}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="primary">{u.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.status === 'Active Admin' ? 'info' : 'success'} dot>
                      {u.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </PageContainer>
  );
}