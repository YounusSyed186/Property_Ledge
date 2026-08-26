'use client';

import { useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';
import { Card, CardContent, Button, Input } from '@/components/admin/ui';
import { resetPasswordAction } from '@/lib/auth/actions';

export default function SecuritySettingsPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    if (newPassword.length < 6) {
      setStatus({ type: 'error', message: 'Your new password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', message: 'The passwords do not match.' });
      return;
    }

    setIsSaving(true);
    try {
      const result = await resetPasswordAction(newPassword);
      setStatus(
        result.success
          ? { type: 'success', message: result.message || 'Your password has been updated.' }
          : { type: 'error', message: result.error || 'We could not update your password.' }
      );
      if (result.success) {
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setStatus({ type: 'error', message: 'We could not update your password. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h2 className="workspace-page-title mb-1">Security</h2>
        <p className="text-caption text-admin-muted">Keep your account protected with a strong password.</p>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-admin-primary-soft text-admin-primary">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-admin-foreground">Change password</h3>
              <p className="mt-0.5 text-[12px] text-admin-muted">Use at least 6 characters. You will stay signed in.</p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="New password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
            <Input
              label="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
            {status && (
              <div
                className={`flex items-start gap-2 rounded-lg border p-3 text-xs ${
                  status.type === 'success'
                    ? 'border-admin-success/20 bg-admin-success-soft text-admin-success'
                    : 'border-admin-danger/20 bg-admin-danger-soft text-admin-danger'
                }`}
                role={status.type === 'error' ? 'alert' : 'status'}
              >
                {status.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                <span>{status.message}</span>
              </div>
            )}
            <div className="flex justify-end">
              <Button type="submit" size="sm" loading={isSaving}>
                Update password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div>
            <p className="text-sm font-medium text-admin-foreground">Two-factor authentication</p>
            <p className="mt-0.5 text-[12px] text-admin-muted">Two-factor authentication is not available for this workspace yet.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
