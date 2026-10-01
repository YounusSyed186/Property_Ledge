'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PageContainer, useToast } from '@/components/admin/ui';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  AdminDataGrid,
  QuickFilterBar,
  QuickFilterOption,
  BulkAction,
} from '@/components/admin/data-grid';
import { ColDef } from 'ag-grid-community';
import { UserCheck, UserX } from 'lucide-react';
import { fetchAdminUsers } from '@/app/actions/admin';
import { UserDrawer } from '@/components/admin/UserDrawer';

export default function AdminUsersPage() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(() => new Date());
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { success, warning } = useToast();

  const loadUsers = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const res = await fetchAdminUsers({ limit: 100 });
      if (res && Array.isArray(res.data)) {
        const formatted = res.data.map((p: any) => {
          const accountCtx = Array.isArray(p.account_context) ? p.account_context[0] : p.account_context;
          const sub = Array.isArray(accountCtx?.subscriptions) ? accountCtx?.subscriptions[0] : accountCtx?.subscriptions;

          const isUserAdmin = p.role === 'admin';

          const planSlug = sub?.subscription_plans?.slug;
          const planName = sub?.subscription_plans?.name || 'Free Plan';

          const userRole = isUserAdmin
            ? 'Super Admin'
            : (planSlug === 'manager' || planSlug === 'business')
            ? 'Property Manager'
            : 'Landlord / Owner';

          return {
            id: p.id,
            name: p.full_name || p.email || 'User Account',
            email: p.email || '—',
            phone: p.phone || '—',
            role: userRole,
            planName: planName,
            status: isUserAdmin ? 'active admin' : (accountCtx?.status || 'active'),
            created_at: p.created_at,
            last_login_at: p.updated_at || p.created_at,
          };
        });
        setUsersList(formatted);
      }
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.warn('Failed to load server users:', err);
    } finally {
      if (isManualRefresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleOpenDrawer = (user: any) => {
    setSelectedUser(user);
    setIsDrawerOpen(true);
  };

  const filterOptions: QuickFilterOption[] = useMemo(
    () => [
      { value: 'all', label: 'All Users', count: usersList.length },
      {
        value: 'active',
        label: 'Active',
        count: usersList.filter((u) => u.status === 'active' || u.status === 'active admin').length,
      },
      {
        value: 'under_review',
        label: 'Under Review',
        count: usersList.filter((u) => u.status === 'under_review').length,
      },
      {
        value: 'suspended',
        label: 'Suspended',
        count: usersList.filter((u) => u.status === 'suspended').length,
      },
    ],
    [usersList]
  );

  const filteredUsers = useMemo(() => {
    if (activeFilter === 'all') return usersList;
    if (activeFilter === 'active') {
      return usersList.filter((u) => u.status === 'active' || u.status === 'active admin');
    }
    return usersList.filter((u) => u.status === activeFilter);
  }, [usersList, activeFilter]);

  const bulkActions: BulkAction[] = [
    {
      label: 'Activate',
      icon: <UserCheck className="w-3.5 h-3.5 text-admin-success" />,
      variant: 'secondary',
      onClick: (selected) => {
        success('Users activated', `Activated ${selected.length} user account(s).`);
      },
    },
    {
      label: 'Suspend',
      icon: <UserX className="w-3.5 h-3.5 text-admin-danger" />,
      variant: 'secondary',
      onClick: (selected) => {
        warning('Users suspended', `Suspended ${selected.length} user account(s).`);
      },
    },
  ];

  const columnDefs: ColDef[] = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'User Name',
        minWidth: 180,
        flex: 1.2,
        cellRenderer: 'userCell',
        filter: 'agTextColumnFilter',
      },
      {
        field: 'email',
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
        field: 'phone',
        headerName: 'Phone',
        minWidth: 140,
        filter: 'agTextColumnFilter',
        cellRenderer: (params: any) => (
          <span
            className="text-[13px] text-admin-muted truncate min-w-0 max-w-full block"
            title={params.value || ''}
          >
            {params.value || '—'}
          </span>
        ),
      },
      {
        field: 'role',
        headerName: 'Role',
        minWidth: 150,
        filter: 'agTextColumnFilter',
        cellRenderer: (params: any) => (
          <span
            className={`font-semibold text-caption px-2 py-0.5 rounded-lg border truncate min-w-0 max-w-full inline-block ${
              params.value === 'Super Admin'
                ? 'bg-purple-500/10 text-purple-600 border-purple-500/30 dark:text-purple-400'
                : params.value === 'Property Manager'
                ? 'bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400'
                : 'bg-admin-surface-subtle text-admin-foreground border-admin-border-subtle'
            }`}
            title={params.value}
          >
            {params.value}
          </span>
        ),
      },
      {
        field: 'planName',
        headerName: 'Plan',
        minWidth: 130,
        filter: 'agTextColumnFilter',
        cellRenderer: (params: any) => (
          <span
            className="font-mono text-[12px] font-semibold text-admin-primary bg-admin-primary/10 px-2 py-0.5 rounded border border-admin-primary/20 truncate min-w-0 inline-block"
            title={params.value}
          >
            {params.value}
          </span>
        ),
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
        headerName: 'Joined Date',
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
          inspectLabel: 'Manage',
          onInspect: (user: any) => handleOpenDrawer(user),
        },
      },
    ],
    []
  );

  return (
    <PageContainer>
      <PageHeader
        title="Users"
        description="Manage platform user accounts, roles, and subscription status."
        className="mb-4"
      />
      <AdminDataGrid
        rowData={filteredUsers}
        columnDefs={columnDefs}
        loading={isLoading}
        onRefresh={() => loadUsers(true)}
        isRefreshing={isRefreshing}
        lastRefreshedAt={lastRefreshedAt}
        enableSelection={true}
        enableColumnChooser={true}
        enableExport={true}
        exportFilename="propertyledge-users"
        searchPlaceholder="Search by name, email, role, or company..."
        bulkActions={bulkActions}
        leftToolbarContent={
          <QuickFilterBar
            options={filterOptions}
            activeValue={activeFilter}
            onChange={setActiveFilter}
          />
        }
        labelSingular="user"
        labelPlural="users"
        emptyTitle="No users found"
        emptyDescription="There are no user accounts matching your search or filter criteria."
        onRowClick={(user) => handleOpenDrawer(user)}
      />

      <UserDrawer
        user={selectedUser}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={() => {
          setIsDrawerOpen(false);
          loadUsers();
        }}
      />
    </PageContainer>
  );
}