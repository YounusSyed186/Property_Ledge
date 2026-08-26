import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { PageContainer, PageHeader, Card, CardHeader, CardContent, Badge, EmptyState } from '@/components/admin/ui';
import { AdminDataGrid } from '@/components/admin/data-grid';
import type { ColDef } from 'ag-grid-community';
import { Home, Building2, Users, DollarSign, MoreHorizontal, Search } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 0;

interface Property {
  id: string;
  name: string;
  property_type: string | null;
  status: 'active' | 'archived' | 'maintenance';
  address_line_1: string;
  city: string;
  state: string;
  postal_code: string;
  owner_id: string;
  workspace_id: string;
  created_at: string;
  updated_at: string;
  owner?: { full_name: string; email: string };
  workspace?: { name: string };
  units_count?: number;
  tenants_count?: number;
}

async function getProperties(): Promise<Property[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('properties')
    .select(`
      *,
      owner:profiles!properties_owner_id_fkey(full_name, email),
      workspace:workspaces(name),
      units:units(count),
      tenants:tenants(count)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching properties:', error);
    return [];
  }

  return (data || []).map((prop: any) => ({
    ...prop,
    owner: prop.owner || { full_name: 'Unknown', email: '' },
    workspace: prop.workspace || { name: 'Unknown' },
    units_count: prop.units?.[0]?.count || 0,
    tenants_count: prop.tenants?.[0]?.count || 0,
  }));
}

const columns: ColDef<Property>[] = [
  {
    headerName: 'Property',
    field: 'name',
    cellRenderer: (params: any) => (
      <div>
        <p className="font-medium">{params.value}</p>
        <p className="text-xs text-muted-foreground">
          {params.data.address_line_1}, {params.data.city}, {params.data.state} {params.data.postal_code}
        </p>
      </div>
    ),
  },
  {
    headerName: 'Type',
    field: 'property_type',
    cellRenderer: (params: any) => <span className="text-sm">{params.value || '—'}</span>,
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
    headerName: 'Workspace',
    field: 'workspace',
    cellRenderer: (params: any) => (
      <span className="text-sm">{params.value?.name || 'Unknown'}</span>
    ),
  },
  {
    headerName: 'Units',
    field: 'units_count',
    cellRenderer: (params: any) => <span>{params.value || 0}</span>,
  },
  {
    headerName: 'Tenants',
    field: 'tenants_count',
    cellRenderer: (params: any) => <span>{params.value || 0}</span>,
  },
  {
    headerName: 'Status',
    field: 'status',
    cellRenderer: (params: any) => {
      const status = params.value;
      const variants: Record<string, 'success' | 'neutral' | 'warning'> = { active: 'success', archived: 'neutral', maintenance: 'warning' };
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
        <Link href={`/admin/properties/${params.data.id}`} className="p-1.5 rounded hover:bg-muted transition-colors" title="View">
          <MoreHorizontal className="w-4 h-4" />
        </Link>
      </div>
    ),
  },
];

export default async function AdminPropertiesPage() {
  const properties = await getProperties();

  return (
    <PageContainer>
      <PageHeader
        title="Properties"
        description="View and manage all properties across workspaces"
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search properties..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AdminDataGrid
            rowData={properties}
            columnDefs={columns}
            emptyTitle="No properties found"
            emptyDescription="Properties will appear here once created by users."
            emptyIcon={<Home className="w-12 h-12 text-muted-foreground/50" />}
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}