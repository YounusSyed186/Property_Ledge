import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { Profile, AccountContext } from '@/types/auth';
import { logAuthEvent } from '@/lib/debug/logger';
import { serverCache } from '@/lib/cache/server-cache';

export const getCurrentUser = cache(async function getCurrentUser() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) return user;
  } catch (e) {}

  return null;
});

export const getUserProfile = cache(async function getUserProfile(userId: string): Promise<Profile | null> {
  const cacheKey = `user:${userId}:profile`;
  const cached = serverCache.get<Profile>(cacheKey);
  if (cached) {
    logAuthEvent('PROFILE_LOAD_SUCCESS', { userId, cacheHit: true, duration: '0ms' });
    return cached;
  }

  const startTime = Date.now();
  logAuthEvent('PROFILE_LOAD_STARTED', { userId, cacheHit: false });
  try {
    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from('profiles')
      .select('id, full_name, phone, avatar_url, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      logAuthEvent('PROFILE_LOAD_FAILED', { userId, error: error.message });
      return null;
    }

    if (data) {
      serverCache.set(cacheKey, data, 60_000); // 60s TTL
    }

    logAuthEvent('PROFILE_LOAD_SUCCESS', {
      userId,
      cacheHit: false,
      duration: `${Date.now() - startTime}ms`,
    });
    return data;
  } catch (err) {
    logAuthEvent('PROFILE_LOAD_FAILED', { userId, err });
    return null;
  }
});

export const getAccountContext = cache(async function getAccountContext(userId: string): Promise<AccountContext | null> {
  const cacheKey = `user:${userId}:account`;
  const cached = serverCache.get<AccountContext>(cacheKey);
  if (cached) {
    logAuthEvent('ACCOUNT_CONTEXT_LOAD_SUCCESS', { userId, cacheHit: true, duration: '0ms' });
    return cached;
  }

  const startTime = Date.now();
  logAuthEvent('ACCOUNT_CONTEXT_LOAD_STARTED', { userId, cacheHit: false });
  try {
    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from('account_context')
      .select('user_id, status, onboarding_status, first_login_at, last_login_at, created_at, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      logAuthEvent('ACCOUNT_CONTEXT_LOAD_FAILED', { userId, error: error.message });
      return null;
    }

    if (data) {
      serverCache.set(cacheKey, data, 60_000); // 60s TTL
    }

    logAuthEvent('ACCOUNT_CONTEXT_LOAD_SUCCESS', {
      userId,
      cacheHit: false,
      duration: `${Date.now() - startTime}ms`,
    });
    return data;
  } catch (err) {
    logAuthEvent('ACCOUNT_CONTEXT_LOAD_FAILED', { userId, err });
    return null;
  }
});

