/**
 * Supabase Implementation of AuthRepository.
 */

import { Result, ok, err } from '@/shared/domain/result';
import { DomainError, toSafeDomainError } from '@/shared/domain/errors';
import { TypedSupabaseClient } from '@/shared/infrastructure/database/supabase';
import { AuthUser, UserProfile, AccountContext } from '../../domain/entities/user';
import { AuthRepository } from '../../domain/repositories/auth-repository';

export class SupabaseAuthRepository implements AuthRepository {
  constructor(private readonly client: TypedSupabaseClient) {}

  async getCurrentUser(): Promise<Result<AuthUser | null, DomainError>> {
    try {
      const { data: { user }, error } = await this.client.auth.getUser();
      if (error || !user) {
        return ok(null);
      }

      return ok({
        id: user.id,
        email: user.email || null,
        phone: user.phone || null,
        fullName: user.user_metadata?.full_name || null,
        avatarUrl: user.user_metadata?.avatar_url || null,
        emailVerified: Boolean(user.email_confirmed_at),
        provider: user.app_metadata?.provider || 'email',
        createdAt: user.created_at,
      });
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async getUserProfile(userId: string): Promise<Result<UserProfile | null, DomainError>> {
    try {
      const { data, error } = await this.client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        return err(toSafeDomainError(error));
      }

      if (!data) {
        return ok(null);
      }

      const row = data as {
        id: string;
        email?: string | null;
        full_name?: string | null;
        phone?: string | null;
        avatar_url?: string | null;
        public_id?: string | null;
        created_at: string;
        updated_at: string;
      };

      return ok({
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        phone: row.phone,
        avatarUrl: row.avatar_url,
        publicId: row.public_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async getAccountContext(userId: string): Promise<Result<AccountContext | null, DomainError>> {
    try {
      const { data, error } = await this.client
        .from('account_context')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        return err(toSafeDomainError(error));
      }

      if (!data) {
        return ok(null);
      }

      const row = data as {
        user_id: string;
        status: string;
        onboarding_status: string;
        first_login_at?: string | null;
        last_login_at?: string | null;
        created_at: string;
        updated_at: string;
      };

      return ok({
        userId: row.user_id,
        status: row.status,
        onboardingStatus: row.onboarding_status,
        firstLoginAt: row.first_login_at,
        lastLoginAt: row.last_login_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async updateProfile(
    userId: string,
    data: Partial<Pick<UserProfile, 'fullName' | 'phone' | 'avatarUrl'>>
  ): Promise<Result<UserProfile, DomainError>> {
    try {
      const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (data.fullName !== undefined) payload.full_name = data.fullName;
      if (data.phone !== undefined) payload.phone = data.phone;
      if (data.avatarUrl !== undefined) payload.avatar_url = data.avatarUrl;

      const { data: updated, error } = await this.client
        .from('profiles')
        .update(payload as never)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return err(toSafeDomainError(error));
      }

      const row = updated as {
        id: string;
        email?: string | null;
        full_name?: string | null;
        phone?: string | null;
        avatar_url?: string | null;
        public_id?: string | null;
        created_at: string;
        updated_at: string;
      };

      return ok({
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        phone: row.phone,
        avatarUrl: row.avatar_url,
        publicId: row.public_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async updateAccountContext(
    userId: string,
    data: Partial<Pick<AccountContext, 'onboardingStatus' | 'status'>>
  ): Promise<Result<AccountContext, DomainError>> {
    try {
      const payload: Record<string, unknown> = {
        user_id: userId,
        updated_at: new Date().toISOString(),
      };
      if (data.onboardingStatus !== undefined) payload.onboarding_status = data.onboardingStatus;
      if (data.status !== undefined) payload.status = data.status;

      const { data: upserted, error } = await this.client
        .from('account_context')
        .upsert(payload as never)
        .select()
        .single();

      if (error) {
        return err(toSafeDomainError(error));
      }

      const row = upserted as {
        user_id: string;
        status: string;
        onboarding_status: string;
        first_login_at?: string | null;
        last_login_at?: string | null;
        created_at: string;
        updated_at: string;
      };

      return ok({
        userId: row.user_id,
        status: row.status,
        onboardingStatus: row.onboarding_status,
        firstLoginAt: row.first_login_at,
        lastLoginAt: row.last_login_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async signOut(): Promise<Result<void, DomainError>> {
    try {
      const { error } = await this.client.auth.signOut();
      if (error) {
        return err(toSafeDomainError(error));
      }
      return ok(undefined);
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }
}
