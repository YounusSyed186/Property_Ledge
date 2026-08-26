import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/queries';
import { getTenantNotifications } from '@/lib/tenant/queries';
import { markAllTenantNotificationsRead, markTenantNotificationRead } from '@/lib/tenant/service';
import { PageContainer, Card, CardContent, Button } from '@/components/admin/ui';

export const revalidate = 0;

export default async function TenantNotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const notifications = await getTenantNotifications(user.id);

  async function markRead(formData: FormData) {
    'use server';
    const id = String(formData.get('id') || '');
    if (id) await markTenantNotificationRead(id);
    redirect('/tenant/notifications');
  }

  async function markAllRead() {
    'use server';
    await markAllTenantNotificationsRead();
    redirect('/tenant/notifications');
  }

  const unreadCount = notifications.filter((n) => !(n as { read_at?: string | null }).read_at).length;

  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-admin-foreground">Notifications</h2>
            <p className="text-sm text-admin-muted mt-1">
              {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up.'}
            </p>
          </div>
          {unreadCount > 0 && (
            <form action={markAllRead}>
              <Button type="submit" variant="outline" size="sm">
                Mark all read
              </Button>
            </form>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            {notifications.length === 0 ? (
              <p className="p-6 text-sm text-admin-muted">No notifications yet.</p>
            ) : (
              <div className="divide-y divide-admin-border">
                {notifications.map((notification) => {
                  const row = notification as {
                    id: string;
                    title: string;
                    message: string;
                    type: string;
                    read_at: string | null;
                    created_at: string;
                  };
                  const isUnread = !row.read_at;

                  return (
                    <div
                      key={row.id}
                      className={`px-6 py-4 ${isUnread ? 'bg-admin-primary/5' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-admin-foreground">{row.title}</p>
                          <p className="text-sm text-admin-muted mt-1">{row.message}</p>
                          <p className="text-xs text-admin-muted mt-2">
                            {new Date(row.created_at).toLocaleString('en-AU')}
                          </p>
                        </div>
                        {isUnread && (
                          <form action={markRead}>
                            <input type="hidden" name="id" value={row.id} />
                            <Button type="submit" variant="ghost" size="sm">
                              Mark read
                            </Button>
                          </form>
                        )}
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
