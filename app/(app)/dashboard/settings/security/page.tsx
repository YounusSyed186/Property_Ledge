'use client';

import { Card, CardContent, Button } from '@/components/admin/ui';

export default function SecuritySettingsPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h2 className="workspace-page-title mb-1">Security</h2>
        <p className="text-caption text-admin-muted">Manage password and account security.</p>
      </div>
      <Card>
        <CardContent className="space-y-4 p-5">
          <div>
            <p className="text-sm font-medium text-admin-foreground">Password</p>
            <p className="mt-0.5 text-[12px] text-admin-muted">Update your account password.</p>
          </div>
          <Button size="sm" variant="secondary" disabled>
            Change Password
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-4 p-5">
          <div>
            <p className="text-sm font-medium text-admin-foreground">Two-factor authentication</p>
            <p className="mt-0.5 text-[12px] text-admin-muted">Add an extra layer of security to your account.</p>
          </div>
          <Button size="sm" variant="secondary" disabled>
            Enable 2FA
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
