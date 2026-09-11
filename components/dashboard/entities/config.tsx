import React from 'react';
import { ColDef } from 'ag-grid-community';
import type { DrawerField } from '@/components/dashboard/EntityDrawer';
import { PersonIdentity } from '@/components/ui/avatar/PersonIdentity';
import { AvatarGroup } from '@/components/ui/avatar/AvatarGroup';
import { JsonIcon } from '@/components/ui/avatar/JsonIcon';
import { DiceBearIcon } from '@/components/ui/avatar/DiceBearIcon';

export const unitFields: DrawerField[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'unit_number', label: 'Unit Number', type: 'text', required: true },
  { name: 'unit_type', label: 'Type', type: 'text', placeholder: 'apartment, house, etc.' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    required: true,
    options: [
      { value: 'vacant', label: 'Vacant' },
      { value: 'occupied', label: 'Occupied' },
      { value: 'maintenance', label: 'Maintenance' },
      { value: 'reserved', label: 'Reserved' },
    ],
  },
  { name: 'bedrooms', label: 'Bedrooms', type: 'number' },
  { name: 'bathrooms', label: 'Bathrooms', type: 'number' },
  { name: 'square_feet', label: 'Square Feet', type: 'number' },
  { name: 'rent_amount', label: 'Rent Amount', type: 'number' },
  { name: 'description', label: 'Description', type: 'textarea' },
];

export const unitColumns: ColDef[] = [
  {
    field: 'name',
    headerName: 'Name',
    flex: 1,
    minWidth: 140,
    cellRenderer: (params: { data: Record<string, unknown> }) => {
      const name = String(params.data?.name || params.data?.unit_number || 'Unit');
      return (
        <div className="flex items-center gap-2 py-1 min-w-0 max-w-full overflow-hidden" title={name}>
          <DiceBearIcon name="doorClosed" badge variant="blue" className="w-3.5 h-3.5" />
          <span className="font-semibold text-foreground text-[13.5px] truncate min-w-0">{name}</span>
        </div>
      );
    },
  },
  { field: 'unit_number', headerName: 'Unit #', width: 100 },
  { field: 'unit_type', headerName: 'Type', width: 120 },
  { field: 'status', headerName: 'Status', width: 120, cellRenderer: 'statusCell' },
  { field: 'bedrooms', headerName: 'Beds', width: 80 },
  { field: 'rent_amount', headerName: 'Rent', width: 100, cellRenderer: 'currencyCell' },
];

export const tenantFields: DrawerField[] = [
  { name: 'first_name', label: 'First Name', type: 'text', required: true },
  { name: 'last_name', label: 'Last Name', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'phone', label: 'Phone', type: 'text' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    required: true,
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'prospect', label: 'Prospect' },
      { value: 'archived', label: 'Archived' },
    ],
  },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

export const tenantColumns: ColDef[] = [
  {
    field: 'first_name',
    headerName: 'Name',
    flex: 1.5,
    minWidth: 200,
    valueGetter: (p) => `${p.data?.first_name || ''} ${p.data?.last_name || ''}`.trim(),
    cellRenderer: (params: { data: Record<string, unknown> }) => {
      const tenant = params.data;
      if (!tenant) return '—';
      const name = `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() || 'Tenant';
      const seed = String(tenant.id || tenant.email || name);
      return (
        <PersonIdentity
          seed={seed}
          avatarUrl={tenant.avatar_url ? String(tenant.avatar_url) : undefined}
          name={name}
          subtitle={tenant.email ? String(tenant.email) : undefined}
          size="sm"
        />
      );
    },
  },
  { field: 'email', headerName: 'Email', flex: 1, minWidth: 180 },
  { field: 'phone', headerName: 'Phone', width: 130 },
  { field: 'status', headerName: 'Status', width: 110, cellRenderer: 'statusCell' },
];

export const leaseFields: DrawerField[] = [
  { name: 'start_date', label: 'Start Date', type: 'date', required: true },
  { name: 'end_date', label: 'End Date', type: 'date', required: true },
  { name: 'rent_amount', label: 'Rent Amount', type: 'number', required: true },
  { name: 'security_deposit', label: 'Security Deposit', type: 'number' },
  { name: 'payment_due_day', label: 'Payment Due Day', type: 'number' },
  {
    name: 'rent_frequency',
    label: 'Frequency',
    type: 'select',
    options: [
      { value: 'weekly', label: 'Weekly' },
      { value: 'fortnightly', label: 'Fortnightly' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'yearly', label: 'Yearly' },
    ],
  },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    required: true,
    options: [
      { value: 'draft', label: 'Draft' },
      { value: 'pending', label: 'Pending' },
      { value: 'active', label: 'Active' },
      { value: 'expired', label: 'Expired' },
      { value: 'terminated', label: 'Terminated' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
  },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

export const leaseColumns: ColDef[] = [
  {
    headerName: 'Property',
    flex: 1.2,
    minWidth: 160,
    valueGetter: (params) => {
      const prop = params.data?.property as { name?: string } | undefined;
      const unit = params.data?.unit as { name?: string } | undefined;
      return prop?.name || unit?.name || '—';
    },
    cellRenderer: (params: { data: Record<string, unknown> }) => {
      const prop = params.data?.property as { name?: string } | undefined;
      const unit = params.data?.unit as { name?: string } | undefined;
      const title = prop?.name || unit?.name || 'Property';
      return (
        <div className="flex items-center gap-2 py-1 min-w-0 max-w-full overflow-hidden" title={title}>
          <DiceBearIcon name="building" badge variant="purple" className="w-3.5 h-3.5" />
          <span className="font-semibold text-foreground text-[13.5px] truncate min-w-0">{title}</span>
        </div>
      );
    },
  },
  {
    headerName: 'Tenant',
    flex: 1.5,
    minWidth: 200,
    valueGetter: (params) => {
      const leaseTenants = (params.data?.lease_tenants || []) as Array<{
        is_primary?: boolean;
        tenant?: { first_name?: string; last_name?: string };
      }>;
      const primary =
        leaseTenants.find((lt) => lt.is_primary) ||
        leaseTenants[0];
      const tenant = primary?.tenant;
      if (!tenant?.first_name && !tenant?.last_name) return '—';
      return `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim();
    },
    cellRenderer: (params: { data: Record<string, unknown> }) => {
      const leaseTenants = (params.data?.lease_tenants || []) as Array<{
        is_primary?: boolean;
        tenant_id?: string;
        tenant?: { id?: string; first_name?: string; last_name?: string; email?: string; avatar_url?: string };
      }>;
      if (leaseTenants.length === 0) return <span className="text-muted text-xs">No tenants</span>;
      const primaryLt = leaseTenants.find((lt) => lt.is_primary) || leaseTenants[0];
      const tenantObj = primaryLt?.tenant;
      if (!tenantObj) return <span className="text-muted text-xs">Unassigned</span>;
      const name = `${tenantObj.first_name || ''} ${tenantObj.last_name || ''}`.trim() || 'Tenant';
      const tenantId = tenantObj.id || primaryLt.tenant_id || name;

      if (leaseTenants.length > 1) {
        const avatarItems = leaseTenants.map((lt) => ({
          id: lt.tenant?.id || lt.tenant_id || 'tenant',
          name: `${lt.tenant?.first_name || ''} ${lt.tenant?.last_name || ''}`.trim() || 'Tenant',
          avatarUrl: lt.tenant?.avatar_url,
        }));
        return (
          <div className="flex items-center gap-2 py-1">
            <AvatarGroup items={avatarItems} size="sm" />
            <span className="text-xs font-semibold text-foreground truncate">{name} +{leaseTenants.length - 1}</span>
          </div>
        );
      }

      return (
        <PersonIdentity
          seed={tenantId}
          avatarUrl={tenantObj.avatar_url}
          name={name}
          subtitle={tenantObj.email}
          size="sm"
        />
      );
    },
  },
  { field: 'start_date', headerName: 'Start', width: 110, cellRenderer: 'dateCell' },
  { field: 'end_date', headerName: 'End', width: 110, cellRenderer: 'dateCell' },
  { field: 'rent_amount', headerName: 'Rent', width: 100, cellRenderer: 'currencyCell' },
  { field: 'status', headerName: 'Status', width: 110, cellRenderer: 'statusCell' },
  { field: 'rent_frequency', headerName: 'Frequency', width: 110 },
];

export const invoiceFields: DrawerField[] = [
  { name: 'invoice_number', label: 'Invoice Number', type: 'text', required: true },
  { name: 'issue_date', label: 'Issue Date', type: 'date', required: true },
  { name: 'due_date', label: 'Due Date', type: 'date', required: true },
  { name: 'subtotal', label: 'Subtotal', type: 'number' },
  { name: 'tax_amount', label: 'Tax', type: 'number' },
  { name: 'total_amount', label: 'Total', type: 'number', required: true },
  { name: 'balance_due', label: 'Balance Due', type: 'number' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    required: true,
    options: [
      { value: 'draft', label: 'Draft' },
      { value: 'issued', label: 'Issued' },
      { value: 'partially_paid', label: 'Partially Paid' },
      { value: 'paid', label: 'Paid' },
      { value: 'overdue', label: 'Overdue' },
      { value: 'void', label: 'Void' },
    ],
  },
  { name: 'description', label: 'Description', type: 'textarea' },
];

export const invoiceColumns: ColDef[] = [
  { field: 'invoice_number', headerName: 'Invoice #', width: 130 },
  { field: 'issue_date', headerName: 'Issued', width: 110, cellRenderer: 'dateCell' },
  { field: 'due_date', headerName: 'Due', width: 110, cellRenderer: 'dateCell' },
  { field: 'total_amount', headerName: 'Total', width: 100, cellRenderer: 'currencyCell' },
  { field: 'balance_due', headerName: 'Balance', width: 100, cellRenderer: 'currencyCell' },
  { field: 'status', headerName: 'Status', width: 120, cellRenderer: 'statusCell' },
];

export const paymentFields: DrawerField[] = [
  { name: 'amount', label: 'Amount', type: 'number', required: true },
  { name: 'payment_date', label: 'Payment Date', type: 'date', required: true },
  {
    name: 'payment_method',
    label: 'Method',
    type: 'select',
    options: [
      { value: 'bank_transfer', label: 'Bank Transfer' },
      { value: 'direct_debit', label: 'Direct Debit' },
      { value: 'card', label: 'Card' },
      { value: 'cash', label: 'Cash' },
      { value: 'cheque', label: 'Cheque' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    required: true,
    options: [
      { value: 'pending', label: 'Pending' },
      { value: 'completed', label: 'Completed' },
      { value: 'failed', label: 'Failed' },
      { value: 'reversed', label: 'Reversed' },
      { value: 'refunded', label: 'Refunded' },
    ],
  },
  { name: 'reference', label: 'Reference', type: 'text' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

export const paymentColumns: ColDef[] = [
  { field: 'payment_date', headerName: 'Date', width: 110, cellRenderer: 'dateCell' },
  { field: 'amount', headerName: 'Amount', width: 100, cellRenderer: 'currencyCell' },
  { field: 'payment_method', headerName: 'Method', width: 120 },
  { field: 'status', headerName: 'Status', width: 110, cellRenderer: 'statusCell' },
  { field: 'reference', headerName: 'Reference', flex: 1, minWidth: 120 },
];

export const expenseFields: DrawerField[] = [
  { name: 'description', label: 'Description', type: 'text', required: true },
  { name: 'amount', label: 'Amount', type: 'number', required: true },
  { name: 'expense_date', label: 'Date', type: 'date', required: true },
  { name: 'vendor_name', label: 'Vendor', type: 'text' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    required: true,
    options: [
      { value: 'pending', label: 'Pending' },
      { value: 'paid', label: 'Paid' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
  },
];

export const expenseColumns: ColDef[] = [
  { field: 'expense_date', headerName: 'Date', width: 110, cellRenderer: 'dateCell' },
  { field: 'description', headerName: 'Description', flex: 1, minWidth: 180 },
  { field: 'vendor_name', headerName: 'Vendor', width: 140 },
  { field: 'amount', headerName: 'Amount', width: 100, cellRenderer: 'currencyCell' },
  { field: 'status', headerName: 'Status', width: 110, cellRenderer: 'statusCell' },
];

export const maintenanceFields: DrawerField[] = [
  { name: 'title', label: 'Title', type: 'text', required: true },
  { name: 'description', label: 'Description', type: 'textarea', required: true },
  {
    name: 'priority',
    label: 'Priority',
    type: 'select',
    options: [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'urgent', label: 'Urgent' },
    ],
  },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    required: true,
    options: [
      { value: 'open', label: 'Open' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'scheduled', label: 'Scheduled' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
  },
  { name: 'category', label: 'Category', type: 'text' },
];

export const maintenanceColumns: ColDef[] = [
  { field: 'title', headerName: 'Title', flex: 1, minWidth: 180 },
  { field: 'priority', headerName: 'Priority', width: 100, cellRenderer: 'statusCell' },
  { field: 'status', headerName: 'Status', width: 120, cellRenderer: 'statusCell' },
  { field: 'category', headerName: 'Category', width: 120 },
  { field: 'created_at', headerName: 'Created', width: 110, cellRenderer: 'dateCell' },
];

export const inspectionFields: DrawerField[] = [
  {
    name: 'inspection_type',
    label: 'Type',
    type: 'select',
    required: true,
    options: [
      { value: 'move_in', label: 'Move In' },
      { value: 'routine', label: 'Routine' },
      { value: 'move_out', label: 'Move Out' },
      { value: 'damage', label: 'Damage' },
      { value: 'final', label: 'Final' },
    ],
  },
  { name: 'scheduled_at', label: 'Scheduled At', type: 'date', required: true },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    required: true,
    options: [
      { value: 'scheduled', label: 'Scheduled' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
  },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

export const inspectionColumns: ColDef[] = [
  { field: 'inspection_type', headerName: 'Type', width: 120 },
  { field: 'scheduled_at', headerName: 'Scheduled', width: 120, cellRenderer: 'dateCell' },
  { field: 'status', headerName: 'Status', width: 120, cellRenderer: 'statusCell' },
  { field: 'notes', headerName: 'Notes', flex: 1, minWidth: 160 },
];

export const documentFields: DrawerField[] = [
  { name: 'name', label: 'Document Name', type: 'text', required: true },
  {
    name: 'document_type',
    label: 'Type',
    type: 'select',
    required: true,
    options: [
      { value: 'lease_agreement', label: 'Lease Agreement' },
      { value: 'inspection_report', label: 'Inspection Report' },
      { value: 'insurance', label: 'Insurance' },
      { value: 'invoice', label: 'Invoice' },
      { value: 'receipt', label: 'Receipt' },
      { value: 'property_document', label: 'Property Document' },
      { value: 'other', label: 'Other' },
    ],
  },
  { name: 'storage_path', label: 'Storage Path', type: 'text', required: true, placeholder: 'documents/filename.pdf' },
  { name: 'mime_type', label: 'MIME Type', type: 'text', placeholder: 'application/pdf' },
  { name: 'file_size', label: 'File Size (bytes)', type: 'number' },
];

export const documentColumns: ColDef[] = [
  { field: 'name', headerName: 'Name', flex: 1, minWidth: 180 },
  { field: 'document_type', headerName: 'Type', width: 140 },
  { field: 'mime_type', headerName: 'MIME', width: 120 },
  { field: 'created_at', headerName: 'Uploaded', width: 110, cellRenderer: 'dateCell' },
];

export const taskFields: DrawerField[] = [
  { name: 'title', label: 'Title', type: 'text', required: true },
  { name: 'description', label: 'Description', type: 'textarea' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    required: true,
    options: [
      { value: 'pending', label: 'Pending' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
  },
  {
    name: 'priority',
    label: 'Priority',
    type: 'select',
    options: [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'urgent', label: 'Urgent' },
    ],
  },
  { name: 'due_date', label: 'Due Date', type: 'date' },
];

export const taskColumns: ColDef[] = [
  { field: 'title', headerName: 'Title', flex: 1, minWidth: 180 },
  { field: 'status', headerName: 'Status', width: 120, cellRenderer: 'statusCell' },
  { field: 'priority', headerName: 'Priority', width: 100, cellRenderer: 'statusCell' },
  { field: 'due_date', headerName: 'Due', width: 110, cellRenderer: 'dateCell' },
];

export const propertyFields: DrawerField[] = [
  { name: 'name', label: 'Property Name / Building Title', type: 'text', placeholder: 'e.g. Oak Street Apartments' },
  { name: 'address_line_1', label: 'Street Address', type: 'text', required: true },
  { name: 'suburb', label: 'Suburb', type: 'text', required: true },
  { name: 'state', label: 'State/Territory', type: 'text', required: true },
  { name: 'postcode', label: 'Postcode', type: 'text', required: true },
  {
    name: 'property_category',
    label: 'Category',
    type: 'select',
    required: true,
    options: [
      { value: 'Residential', label: 'Residential' },
      { value: 'Commercial', label: 'Commercial' },
    ],
  },
  { name: 'property_type', label: 'Property Type', type: 'text', required: true, placeholder: 'House, Apartment/Unit, Townhouse, etc.' },
  { name: 'bedrooms', label: 'Bedrooms', type: 'number' },
  { name: 'bathrooms', label: 'Bathrooms', type: 'number' },
  { name: 'car_spaces', label: 'Car Spaces', type: 'number' },
  { name: 'rent_amount', label: 'Advertised Rent ($)', type: 'number' },
  {
    name: 'payment_frequency',
    label: 'Payment Frequency',
    type: 'select',
    options: [
      { value: 'Weekly', label: 'Weekly' },
      { value: 'Fortnightly', label: 'Fortnightly' },
      { value: 'Monthly', label: 'Monthly' },
    ],
  },
  { name: 'description', label: 'Description', type: 'textarea' },
];

export const propertyColumns: ColDef[] = [
  {
    field: 'name',
    headerName: 'Property Name',
    width: 220,
    minWidth: 200,
    valueGetter: (params) => params.data?.name || params.data?.address_line_1 || '—',
    cellRenderer: (params: { data: Record<string, unknown> }) => {
      const name = String(params.data?.name || params.data?.address_line_1 || 'Property');
      const category = String(params.data?.property_category || '').toLowerCase();
      const iconName = category === 'commercial' ? 'building' : category === 'residential' ? 'house' : 'building';
      return (
        <div className="flex items-center gap-2.5 py-1 min-w-0 max-w-full overflow-hidden" title={name}>
          <DiceBearIcon name={iconName} badge variant="red" className="w-3.5 h-3.5 shrink-0" />
          <span className="font-semibold text-foreground text-[13.5px] truncate">{name}</span>
        </div>
      );
    },
  },
  {
    field: 'property_category',
    headerName: 'Category',
    width: 140,
    valueGetter: (params) => params.data?.property_category || 'Residential',
  },
  {
    field: 'property_type',
    headerName: 'Property Type',
    width: 140,
    valueGetter: (params) => params.data?.property_type || '—',
  },
  {
    field: 'address_line_1',
    headerName: 'Street Address',
    width: 220,
    minWidth: 180,
    valueGetter: (params) => params.data?.address_line_1 || params.data?.address || '—',
  },
  {
    field: 'suburb',
    headerName: 'Suburb / City',
    width: 150,
    valueGetter: (params) => params.data?.suburb || params.data?.city || '—',
  },
  {
    field: 'state',
    headerName: 'State',
    width: 110,
    valueGetter: (params) => params.data?.state || '—',
  },
  {
    field: 'postal_code',
    headerName: 'Postcode',
    width: 110,
    valueGetter: (params) => params.data?.postal_code || params.data?.postcode || '—',
  },
  {
    field: 'bedrooms',
    headerName: 'Beds',
    width: 100,
    valueGetter: (params) => (params.data?.bedrooms !== undefined && params.data?.bedrooms !== null ? params.data?.bedrooms : '—'),
  },
  {
    field: 'bathrooms',
    headerName: 'Baths',
    width: 100,
    valueGetter: (params) => (params.data?.bathrooms !== undefined && params.data?.bathrooms !== null ? params.data?.bathrooms : '—'),
  },
  {
    field: 'parking_spaces',
    headerName: 'Parking',
    width: 110,
    valueGetter: (params) =>
      params.data?.parking_spaces !== undefined && params.data?.parking_spaces !== null
        ? params.data?.parking_spaces
        : params.data?.car_spaces ?? '—',
  },
  {
    field: 'rent_amount',
    headerName: 'Advertised Rent',
    width: 160,
    cellRenderer: (params: { data: Record<string, unknown> }) => {
      const rent = params.data?.rent_amount;
      if (rent === undefined || rent === null || rent === '') return '—';
      return `$${Number(rent).toLocaleString()}`;
    },
  },
  {
    field: 'payment_frequency',
    headerName: 'Frequency',
    width: 140,
    valueGetter: (params) => params.data?.payment_frequency || params.data?.rent_frequency || 'Weekly',
  },
  { field: 'status', headerName: 'Status', width: 120, cellRenderer: 'statusCell' },
];
