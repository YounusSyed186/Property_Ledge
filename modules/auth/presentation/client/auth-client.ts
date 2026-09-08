/**
 * Auth Client Interface and Browser Implementation.
 * Presentation components use this client rather than directly calling createClient() or supabase.auth.
 */

import { AuthUser, UserProfile, AccountContext } from '../../domain/entities/user';
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client';

export interface AuthClient {
  getCurrentUser(): Promise<AuthUser | null>;
  getUserProfile(userId: string): Promise<UserProfile | null>;
  getAccountContext(userId: string): Promise<AccountContext | null>;
  signOut(): Promise<void>;
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void;
}

class BrowserAuthClient implements AuthClient {
  private getClient() {
    return createBrowserSupabaseClient();
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const supabase = this.getClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return null;

      return {
        id: user.id,
        email: user.email || null,
        phone: user.phone || null,
        fullName: user.user_metadata?.full_name || null,
        avatarUrl: user.user_metadata?.avatar_url || null,
        emailVerified: Boolean(user.email_confirmed_at),
        provider: user.app_metadata?.provider || 'email',
        createdAt: user.created_at,
      };
    } catch {
      return null;
    }
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const supabase = this.getClient();
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error || !data) return null;

      return {
        id: data.id,
        email: data.email,
        fullName: data.full_name,
        phone: data.phone,
        avatarUrl: data.avatar_url,
        publicId: data.public_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch {
      return null;
    }
  }

  async getAccountContext(userId: string): Promise<AccountContext | null> {
    try {
      const supabase = this.getClient();
      const { data, error } = await (supabase as any)
        .from('account_context')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data) return null;

      return {
        userId: data.user_id,
        status: data.status,
        onboardingStatus: data.onboarding_status,
        firstLoginAt: data.first_login_at,
        lastLoginAt: data.last_login_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch {
      return null;
    }
  }

  async signOut(): Promise<void> {
    try {
      const supabase = this.getClient();
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Sign out error:', e);
    }
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    const supabase = this.getClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        callback(null);
      } else {
        const u = session.user;
        callback({
          id: u.id,
          email: u.email || null,
          phone: u.phone || null,
          fullName: u.user_metadata?.full_name || null,
          avatarUrl: u.user_metadata?.avatar_url || null,
          emailVerified: Boolean(u.email_confirmed_at),
          provider: u.app_metadata?.provider || 'email',
          createdAt: u.created_at,
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }
}

export const authClient: AuthClient = new BrowserAuthClient();
