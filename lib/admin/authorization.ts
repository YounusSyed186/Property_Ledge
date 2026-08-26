import { createAdminClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/queries';

export async function isAdmin(userId?: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const targetUserId = userId || user.id;
  if (!targetUserId) return false;

  const supabase = await createAdminClient();
  const { data } = await supabase
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', targetUserId)
    .eq('status', 'active')
    .maybeSingle();

  return !!data;
}

export async function requireAdmin(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED_ADMIN: Authentication required.');
  }

  const admin = await isAdmin(user.id);
  if (!admin) {
    throw new Error('UNAUTHORIZED_ADMIN: Access denied. Admin privileges required.');
  }

  return user.id;
}
