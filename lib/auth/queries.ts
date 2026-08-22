import { createClient } from '@/lib/supabase/server';
import { Profile, AccountContext } from '@/types/auth';
import { logAuthEvent } from '@/lib/debug/logger';

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function getUserProfile(userId: string): Promise<Profile | null> {
  logAuthEvent('PROFILE_LOAD_STARTED', { userId });
  try {
    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      logAuthEvent('PROFILE_LOAD_FAILED', { userId, error: error.message });
      return null;
    }

    logAuthEvent('PROFILE_LOAD_SUCCESS', { userId });
    return data;
  } catch (err) {
    logAuthEvent('PROFILE_LOAD_FAILED', { userId, err });
    return null;
  }
}

export async function getAccountContext(userId: string): Promise<AccountContext | null> {
  logAuthEvent('ACCOUNT_CONTEXT_LOAD_STARTED', { userId });
  try {
    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from('account_context')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      logAuthEvent('ACCOUNT_CONTEXT_LOAD_FAILED', { userId, error: error.message });
      return null;
    }

    logAuthEvent('ACCOUNT_CONTEXT_LOAD_SUCCESS', { userId });
    return data;
  } catch (err) {
    logAuthEvent('ACCOUNT_CONTEXT_LOAD_FAILED', { userId, err });
    return null;
  }
}
