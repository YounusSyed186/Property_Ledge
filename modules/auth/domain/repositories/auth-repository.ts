/**
 * Auth Repository Interface.
 */

import { Result } from '@/shared/domain/result';
import { DomainError } from '@/shared/domain/errors';
import { AuthUser, UserProfile, AccountContext } from '../entities/user';

export interface AuthRepository {
  getCurrentUser(): Promise<Result<AuthUser | null, DomainError>>;
  getUserProfile(userId: string): Promise<Result<UserProfile | null, DomainError>>;
  getAccountContext(userId: string): Promise<Result<AccountContext | null, DomainError>>;
  updateProfile(userId: string, data: Partial<Pick<UserProfile, 'fullName' | 'phone' | 'avatarUrl'>>): Promise<Result<UserProfile, DomainError>>;
  updateAccountContext(userId: string, data: Partial<Pick<AccountContext, 'onboardingStatus' | 'status'>>): Promise<Result<AccountContext, DomainError>>;
  signOut(): Promise<Result<void, DomainError>>;
}
