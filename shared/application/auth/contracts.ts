/**
 * Authentication and User Domain Contracts.
 * Business and UI modules depend on these contracts rather than Supabase Auth.
 */

export interface AuthUser {
  id: string;
  email?: string | null;
  phone?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  emailVerified?: boolean;
  createdAt?: string;
  provider?: string;
}

export interface UserProfile {
  id: string;
  email?: string | null;
  fullName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  createdAt?: string;
  emailVerified?: boolean;
  provider?: string;
  publicId?: string;
}

export interface AccountContextDTO {
  userId: string;
  status: string;
  onboardingStatus: string;
  firstLoginAt?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthService {
  getCurrentUser(): Promise<AuthUser | null>;
  requireUser(): Promise<AuthUser>;
  getUserProfile(userId: string): Promise<UserProfile | null>;
  getAccountContext(userId: string): Promise<AccountContextDTO | null>;
  signOut(): Promise<void>;
}
