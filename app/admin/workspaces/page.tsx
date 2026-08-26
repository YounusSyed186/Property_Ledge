'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ColDef } from 'ag-grid-community';
import { Building2, MoreHorizontal, Plus, Search } from 'lucide-react';
import { fetchAdminWorkspaces } from '@/app/actions/admin';
import { AdminDataGrid } from '@/components/admin/data-grid';
import { Badge, Card, CardContent, CardHeader, PageContainer, PageHeader } from '@/components/admin/ui';

interface WorkspaceRow {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  status: 'active' | 'archived' | 'suspended';
  created_at: string;
  updated_at: string;
  owner?: { full_name: string; email: string };
  member_count?: number;
}

export default function AdminWorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspaces() {
      setIsLoading(true);
      try {
        const data = await fetchAdminWorkspaces();
        if (!cancelled) {
          setWorkspaces(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Error fetching workspaces:', error);
        if (!cancelled) {
          setWorkspaces([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadWorkspaces();
    return () => {
      cancelled = true;
    };
  }, []);

  const columns: ColDef<WorkspaceRow>[] = useMemo(
    () => [
      {
        headerName: 'Workspace',
        field: 'name',
        cellRenderer: (params: any) => (
          <div>
            <p className="font-medium">{params.value}</p>
            <p className="text-xs text-muted-foreground">{params.data.slug}</p>
          </div>
        ),
      },
      {
        headerName: 'Owner',
        field: 'owner',
        cellRenderer: (params: any) => (
          <div>
            <p className="font-medium">{params.value?.full_name || 'Unknown'}</p>
            <p className="text-xs text-muted-foreground">{params.value?.email || ''}</p>
          </div>
        ),
      },
      {
        headerName: 'Members',
        field: 'member_count',
        cellRenderer: (params: any) => <span>{params.value || 0}</span>,
      },
      {
        headerName: 'Status',
        field: 'status',
        cellRenderer: (params: any) => {
          const status = params.value;
          const variants: Record<string, 'success' | 'neutral' | 'danger'> = {
            active: 'success',
            archived: 'neutral',
            suspended: 'danger',
          };
          return <Badge variant={variants[status] || 'neutral'}>{status}</Badge>;
        },
      },
      {
        headerName: 'Created',
        field: 'created_at',
        cellRenderer: (params: any) => new Date(params.value).toLocaleDateString(),
      },
      {
        headerName: 'Actions',
        field: 'id',
        cellRenderer: (params: any) => (
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/workspaces/${params.data.id}`}
              className="p-1.5 rounded hover:bg-muted transition-colors"
              title="View"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Link>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <PageContainer>
      <PageHeader
        title="Workspaces"
        description="Manage platform workspaces and their members"
        actions={
          <Link
            href="/admin/workspaces/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-foreground font-medium hover:bg-accent/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Workspace
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search workspaces..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AdminDataGrid
            rowData={workspaces}
            columnDefs={columns}
            loading={isLoading}
            emptyTitle="No workspaces found"
            emptyDescription="Create your first workspace to get started."
            emptyIcon={<Building2 className="w-12 h-12 text-muted-foreground/50" />}
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
