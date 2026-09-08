/**
 * Auth Application Service.
 * Pure Application Layer - ZERO Supabase imports.
 */

import { Result, ok, err } from '@/shared/domain/result';
import { DomainError, UnauthorizedError, ValidationError } from '@/shared/domain/errors';
import { AuthUser, UserProfile, AccountContext } from '../../domain/entities/user';
import { AuthRepository } from '../../domain/repositories/auth-repository';

export class AuthService {
  constructor(private readonly repository: AuthRepository) {}

  async getCurrentUser(): Promise<Result<AuthUser | null, DomainError>> {
    return this.repository.getCurrentUser();
  }

  async requireUser(): Promise<Result<AuthUser, DomainError>> {
    const userRes = await this.repository.getCurrentUser();
    if (!userRes.success) {
      return userRes;
    }
    if (!userRes.data) {
      return err(new UnauthorizedError());
    }
    return ok(userRes.data);
  }

  async getUserProfile(userId: string): Promise<Result<UserProfile | null, DomainError>> {
    if (!userId) {
      return err(new ValidationError('User ID is required.'));
    }
    return this.repository.getUserProfile(userId);
  }

  async getAccountContext(userId: string): Promise<Result<AccountContext | null, DomainError>> {
    if (!userId) {
      return err(new ValidationError('User ID is required.'));
    }
    return this.repository.getAccountContext(userId);
  }

  async updateProfile(
    userId: string,
    data: Partial<Pick<UserProfile, 'fullName' | 'phone' | 'avatarUrl'>>
  ): Promise<Result<UserProfile, DomainError>> {
    if (!userId) {
      return err(new ValidationError('User ID is required.'));
    }
    return this.repository.updateProfile(userId, data);
  }

  async completeOnboarding(userId: string): Promise<Result<AccountContext, DomainError>> {
    if (!userId) {
      return err(new ValidationError('User ID is required.'));
    }
    return this.repository.updateAccountContext(userId, {
      onboardingStatus: 'completed',
    });
  }

  async signOut(): Promise<Result<void, DomainError>> {
    return this.repository.signOut();
  }
}
