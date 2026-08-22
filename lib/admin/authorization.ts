import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/queries';

export async function isAdmin(userId?: string): Promise<boolean> {
  let targetUserId = userId;

  if (!targetUserId) {
    const user = await getCurrentUser();
    if (!user) return false;
    targetUserId = user.id;

    // Check user email against configured admin emails or metadata
    const adminEmails = (process.env.ADMIN_EMAILS || 'admin@propertyledge.com').split(',').map(e => e.trim().toLowerCase());
    if (user.email && adminEmails.includes(user.email.toLowerCase())) {
      return true;
    }

    if (user.app_metadata?.role === 'admin' || user.user_metadata?.is_admin === true) {
      return true;
    }
  }

  if (!targetUserId) return false;

  // Check admin user IDs
  const adminUserIds = (process.env.ADMIN_USER_IDS || '').split(',').map(id => id.trim());
  if (adminUserIds.includes(targetUserId)) {
    return true;
  }

  // Fallback: Check account_context or profiles metadata
  try {
    const supabase = await createClient();
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('full_name')
      .eq('id', targetUserId)
      .maybeSingle();

    if (profile && profile.full_name?.toLowerCase().includes('[admin]')) {
      return true;
    }
  } catch (e) {
    return false;
  }

  return false;
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
