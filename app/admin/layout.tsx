import React from 'react';
import { requireAdmin } from '@/lib/admin/authorization';
import { redirect } from 'next/navigation';
import { AdminNav } from '@/components/admin/admin-nav';

export const revalidate = 0;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdmin();
  } catch (err) {
    redirect('/login?error=unauthorized_admin');
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminNav />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
