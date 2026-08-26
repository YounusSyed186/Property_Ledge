'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer, Button, Input, Select, Textarea, useToast } from '@/components/admin/ui';
import { fetchUserWorkspaces, handleCreateProperty } from '@/app/actions/dashboard';

export default function NewPropertyPage() {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    workspace_id: '',
    name: '',
    property_type: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Australia',
    description: '',
  });

  useEffect(() => {
    fetchUserWorkspaces().then(setWorkspaces);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await handleCreateProperty({ ...form, status: 'active' } as never);
      success('Property created', 'Your property has been created.');
      router.push('/dashboard/properties');
    } catch (err) {
      showError('Create failed', err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageContainer>
      <h2 className="workspace-page-title mb-2">Create New Property</h2>
      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
        <div>
          <label className="block text-xs font-medium text-admin-muted mb-1.5">Workspace</label>
          <Select
            value={form.workspace_id}
            onChange={(e) => setForm({ ...form, workspace_id: e.target.value })}
            required
          >
            <option value="">Select workspace...</option>
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="block text-xs font-medium text-admin-muted mb-1.5">Property Name</label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="block text-xs font-medium text-admin-muted mb-1.5">Type</label>
          <Input value={form.property_type} onChange={(e) => setForm({ ...form, property_type: e.target.value })} placeholder="apartment, house, etc." />
        </div>
        <div>
          <label className="block text-xs font-medium text-admin-muted mb-1.5">Address Line 1</label>
          <Input value={form.address_line_1} onChange={(e) => setForm({ ...form, address_line_1: e.target.value })} required />
        </div>
        <div>
          <label className="block text-xs font-medium text-admin-muted mb-1.5">City</label>
          <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-admin-muted mb-1.5">State</label>
            <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-admin-muted mb-1.5">Postal Code</label>
            <Input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} required />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-admin-muted mb-1.5">Description</label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
        </div>
        <div className="flex gap-2 pt-4">
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={isSaving}>{isSaving ? 'Creating...' : 'Create Property'}</Button>
        </div>
      </form>
    </PageContainer>
  );
}
