import React from 'react';
import { requireAdmin } from '@/lib/admin/authorization';
import { getCurrentUser } from '@/lib/auth/queries';
import { redirect } from 'next/navigation';
import { AdminClientLayout } from '@/components/admin/AdminClientLayout';

export const revalidate = 0;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let user: any = null;
  try {
    await requireAdmin();
    user = await getCurrentUser();
  } catch (err) {
    redirect('/login?error=unauthorized_admin');
  }

  return (
    <AdminClientLayout
      userEmail={user?.email || 'admin@propertyledge.com.au'}
      userName={user?.user_metadata?.full_name || 'PropertyLedge Administrator'}
    >
      {children}
    </AdminClientLayout>
  );
}
