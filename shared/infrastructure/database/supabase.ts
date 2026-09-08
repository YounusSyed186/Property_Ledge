/**
 * Infrastructure Supabase Database Adapters.
 * Strictly confined to infrastructure/adapters and composition roots.
 * Domain, application, and UI layers must NEVER import this directly.
 */

import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';
import { config } from '@/shared/infrastructure/config';

export type TypedSupabaseClient = SupabaseClient<Database, any, any>;

/**
 * Creates an authenticated Supabase server client for Server Components,
 * Route Handlers, and Server Actions.
 */
export async function getSupabaseServerClient(): Promise<TypedSupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    config.supabase.url,
    config.supabase.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: unknown }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              // @ts-expect-error cookieStore options signature compatibility
              cookieStore.set(name, value, options)
            );
          } catch {
            // Invoked from a read-only Server Component context.
          }
        },
      },
    }
  );
}

/**
 * Creates a privileged Supabase admin client using the service role key.
 * Used exclusively for server-side trusted operations (e.g. provisioning, webhook handling).
 */
export async function getSupabaseAdminClient(): Promise<TypedSupabaseClient> {
  const serviceKey = config.supabase.serviceRoleKey;
  if (serviceKey && serviceKey !== 'your_supabase_service_role_key_here') {
    return createSupabaseClient<Database>(
      config.supabase.url,
      serviceKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }
  return getSupabaseServerClient();
}
