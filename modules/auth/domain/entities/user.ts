/**
 * Auth and User Domain Entities.
 * Pure domain representation - zero Supabase dependencies.
 */

export interface AuthUser {
  id: string;
  email?: string | null;
  phone?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  emailVerified?: boolean;
  provider?: string;
  createdAt?: string;
}

export interface UserProfile {
  id: string;
  email?: string | null;
  fullName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  publicId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AccountContext {
  userId: string;
  status: string;
  onboardingStatus: string;
  firstLoginAt?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
