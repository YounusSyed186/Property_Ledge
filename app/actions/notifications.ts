'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/queries';
import type { Database } from '@/types/database';

export type NotificationRow = Database['public']['Tables']['notifications']['Row'];

export interface NotificationItem extends NotificationRow {
  isUnread: boolean;
}

export async function fetchNotifications(limit = 20): Promise<NotificationItem[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  return (data || []).map((n) => {
    const row = n as NotificationRow;
    return {
      ...row,
      isUnread: !row.read_at,
    };
  });
}

export async function markNotificationRead(notificationId: string): Promise<{ success: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { success: false };

  const supabase = await createClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() } as never)
    .eq('id', notificationId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error marking notification read:', error);
    return { success: false };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function markAllNotificationsRead(): Promise<{ success: boolean; count: number }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, count: 0 };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() } as never)
    .eq('user_id', user.id)
    .is('read_at', null)
    .select('id');

  if (error) {
    console.error('Error marking all notifications read:', error);
    return { success: false, count: 0 };
  }

  revalidatePath('/dashboard');
  return { success: true, count: data?.length ?? 0 };
}
