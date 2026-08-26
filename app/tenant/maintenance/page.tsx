import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/queries';
import { getTenantRecordForUser, getTenantMaintenanceRequests } from '@/lib/tenant/queries';
import { createTenantMaintenanceRequest } from '@/lib/tenant/service';
import { PageContainer, Card, CardContent, Button } from '@/components/admin/ui';

export const revalidate = 0;

export default async function TenantMaintenancePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const tenant = await getTenantRecordForUser(user.id);
  if (!tenant) redirect('/tenant');

  const requests = await getTenantMaintenanceRequests(
    (tenant as { id: string }).id,
    (tenant as { property_id: string }).property_id
  );

  async function submitRequest(formData: FormData) {
    'use server';
    const title = String(formData.get('title') || '').trim();
    const description = String(formData.get('description') || '').trim();
    const priority = String(formData.get('priority') || 'medium') as 'low' | 'medium' | 'high' | 'urgent';

    if (!title) return;
    await createTenantMaintenanceRequest({ title, description, priority });
    redirect('/tenant/maintenance');
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-admin-foreground">Maintenance</h2>
          <p className="text-sm text-admin-muted mt-1">Submit and track maintenance requests.</p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold text-admin-foreground">New request</h3>
            <form action={submitRequest} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-admin-muted">Title</label>
                <input
                  name="title"
                  required
                  className="mt-1 w-full rounded-lg border border-admin-border bg-admin-background px-3 py-2 text-sm"
                  placeholder="e.g. Leaking kitchen tap"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-admin-muted">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-admin-border bg-admin-background px-3 py-2 text-sm"
                  placeholder="Describe the issue..."
                />
              </div>
              <div>
                <label className="text-xs font-medium text-admin-muted">Priority</label>
                <select
                  name="priority"
                  className="mt-1 w-full rounded-lg border border-admin-border bg-admin-background px-3 py-2 text-sm"
                  defaultValue="medium"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <Button type="submit">Submit request</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="px-6 py-4 border-b border-admin-border">
              <h3 className="font-semibold text-admin-foreground">Your requests</h3>
            </div>
            {requests.length === 0 ? (
              <p className="p-6 text-sm text-admin-muted">No maintenance requests yet.</p>
            ) : (
              <div className="divide-y divide-admin-border">
                {requests.map((req) => {
                  const row = req as { id: string; title: string; status: string; priority: string; created_at: string };
                  return (
                    <div key={row.id} className="px-6 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-admin-foreground">{row.title}</p>
                          <p className="text-xs text-admin-muted mt-1 capitalize">
                            {row.priority} priority · {row.status.replace('_', ' ')}
                          </p>
                        </div>
                        <span className="text-xs text-admin-muted shrink-0">
                          {new Date(row.created_at).toLocaleDateString('en-AU')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
