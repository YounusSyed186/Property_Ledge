import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/queries';
import { getTenantRecordForUser } from '@/lib/tenant/queries';
import { updateTenantProfile } from '@/lib/tenant/service';
import { PageContainer, Card, CardContent, Button } from '@/components/admin/ui';

export const revalidate = 0;

export default async function TenantProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const tenant = await getTenantRecordForUser(user.id);
  if (!tenant) redirect('/tenant');

  const t = tenant as {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
  };

  async function saveProfile(formData: FormData) {
    'use server';
    await updateTenantProfile({
      phone: String(formData.get('phone') || '') || null,
      emergency_contact_name: String(formData.get('emergency_contact_name') || '') || null,
      emergency_contact_phone: String(formData.get('emergency_contact_phone') || '') || null,
    });
    redirect('/tenant/profile');
  }

  return (
    <PageContainer>
      <div className="max-w-xl space-y-6">
        <div>
          <h2 className="text-xl font-bold text-admin-foreground">Profile</h2>
          <p className="text-sm text-admin-muted mt-1">Update your contact details.</p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-admin-muted">Name</p>
                <p className="font-medium text-admin-foreground">{t.first_name} {t.last_name}</p>
              </div>
              <div>
                <p className="text-xs text-admin-muted">Email</p>
                <p className="font-medium text-admin-foreground">{t.email}</p>
              </div>
            </div>

            <form action={saveProfile} className="space-y-4 pt-4 border-t border-admin-border">
              <div>
                <label className="text-xs font-medium text-admin-muted">Phone</label>
                <input
                  name="phone"
                  defaultValue={t.phone || ''}
                  className="mt-1 w-full rounded-lg border border-admin-border bg-admin-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-admin-muted">Emergency contact name</label>
                <input
                  name="emergency_contact_name"
                  defaultValue={t.emergency_contact_name || ''}
                  className="mt-1 w-full rounded-lg border border-admin-border bg-admin-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-admin-muted">Emergency contact phone</label>
                <input
                  name="emergency_contact_phone"
                  defaultValue={t.emergency_contact_phone || ''}
                  className="mt-1 w-full rounded-lg border border-admin-border bg-admin-background px-3 py-2 text-sm"
                />
              </div>
              <Button type="submit">Save changes</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
