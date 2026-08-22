import { User } from '@supabase/supabase-js';
import { Database } from './database';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type AccountContext = Database['public']['Tables']['account_context']['Row'];

export interface UserIdentityContext {
  user: User | null;
  profile: Profile | null;
  accountContext: AccountContext | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface AuthActionResult<T = void> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}
