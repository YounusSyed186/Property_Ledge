'use server';

import { createClient } from '@/lib/supabase/server';
import { AuthActionResult } from '@/types/auth';
import { mapAuthError } from '@/lib/errors';
import { logAuthEvent } from '@/lib/debug/logger';

export async function signUpAction(formData: {
  email: string;
  password: string;
  fullName: string;
}): Promise<AuthActionResult> {
  const { email, password, fullName } = formData;
  logAuthEvent('AUTH_SIGNUP_STARTED', { email });

  if (!email || !password || !fullName) {
    return { success: false, error: 'All fields are required.' };
  }

  if (password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
      },
    });

    if (error) {
      logAuthEvent('AUTH_SIGNUP_FAILED', { email, error: error.message });
      return { success: false, error: mapAuthError(error) };
    }

    logAuthEvent('AUTH_SIGNUP_SUCCESS', { userId: data.user?.id });
    return {
      success: true,
      message: 'Signup successful! Please check your email to verify your account before logging in.',
    };
  } catch (err) {
    logAuthEvent('AUTH_SIGNUP_FAILED', { email, err });
    return { success: false, error: mapAuthError(err) };
  }
}

export async function loginAction(formData: {
  email: string;
  password: string;
}): Promise<AuthActionResult> {
  const { email, password } = formData;
  logAuthEvent('AUTH_LOGIN_STARTED', { email });

  if (!email || !password) {
    return { success: false, error: 'Email and password are required.' };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logAuthEvent('AUTH_LOGIN_FAILED', { email, error: error.message });
      return { success: false, error: mapAuthError(error) };
    }

    // Check account context status
    if (data.user) {
      const { data: accountContext } = await supabase
        .from('account_context')
        .select('status')
        .eq('user_id', data.user.id)
        .single();

      if (accountContext && (accountContext as any).status !== 'active') {
        await supabase.auth.signOut();
        logAuthEvent('AUTH_LOGIN_FAILED', { email, reason: 'Account suspended/deactivated' });
        return {
          success: false,
          error: `Your account status is currently ${(accountContext as any).status}. Please contact support.`,
        };
      }

      // Update last_login_at
      await (supabase as any)
        .from('account_context')
        .update({
          last_login_at: new Date().toISOString(),
          first_login_at: new Date().toISOString(),
        })
        .eq('user_id', data.user.id);
    }

    logAuthEvent('AUTH_LOGIN_SUCCESS', { userId: data.user?.id });
    return { success: true };
  } catch (err) {
    logAuthEvent('AUTH_LOGIN_FAILED', { email, err });
    return { success: false, error: mapAuthError(err) };
  }
}

export async function logoutAction(): Promise<AuthActionResult> {
  logAuthEvent('AUTH_LOGOUT_STARTED');
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { success: false, error: mapAuthError(error) };
    }

    logAuthEvent('AUTH_LOGOUT_SUCCESS');
    return { success: true };
  } catch (err) {
    return { success: false, error: mapAuthError(err) };
  }
}

export async function forgotPasswordAction(email: string): Promise<AuthActionResult> {
  logAuthEvent('AUTH_PASSWORD_RESET_REQUESTED', { email });

  if (!email) {
    return { success: false, error: 'Email is required.' };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password`,
    });

    if (error) {
      logAuthEvent('AUTH_PASSWORD_RESET_REQUESTED', { email, error: error.message });
    }

    return {
      success: true,
      message: 'If an account exists for that email, we have sent password reset instructions.',
    };
  } catch {
    return {
      success: true,
      message: 'If an account exists for that email, we have sent password reset instructions.',
    };
  }
}

export async function resetPasswordAction(password: string): Promise<AuthActionResult> {
  logAuthEvent('AUTH_PASSWORD_RESET_COMPLETED');

  if (!password || password.length < 6) {
    return { success: false, error: 'New password must be at least 6 characters long.' };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      return { success: false, error: mapAuthError(error) };
    }

    return {
      success: true,
      message: 'Password successfully updated! You can now log in with your new password.',
    };
  } catch (err) {
    return { success: false, error: mapAuthError(err) };
  }
}

export async function updateProfileAction(formData: {
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
}): Promise<AuthActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'User not authenticated.' };
    }

    const { error } = await (supabase as any)
      .from('profiles')
      .update({
        full_name: formData.fullName,
        phone: formData.phone,
        avatar_url: formData.avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      return { success: false, error: mapAuthError(error) };
    }

    return { success: true, message: 'Profile updated successfully.' };
  } catch (err) {
    return { success: false, error: mapAuthError(err) };
  }
}
