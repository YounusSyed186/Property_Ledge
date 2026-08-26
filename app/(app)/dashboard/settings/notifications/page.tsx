'use client';

import { Card, CardContent } from '@/components/admin/ui';

const NOTIFICATION_PREFS = [
  { id: 'rent_due', label: 'Rent due reminders', description: 'Get notified when rent is due or overdue.' },
  { id: 'lease_expiry', label: 'Lease expirations', description: 'Alerts when leases are expiring within 60 days.' },
  { id: 'maintenance', label: 'Maintenance updates', description: 'Status changes on maintenance requests.' },
  { id: 'inspections', label: 'Inspection reminders', description: 'Upcoming inspection schedules.' },
];

export default function NotificationsSettingsPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h2 className="workspace-page-title mb-1">Notifications</h2>
        <p className="text-caption text-admin-muted">Choose which email notifications you receive.</p>
      </div>
      <div className="space-y-3">
        {NOTIFICATION_PREFS.map((pref) => (
          <Card key={pref.id}>
            <CardContent className="flex items-start justify-between gap-4 p-4">
              <div>
                <p className="text-sm font-medium text-admin-foreground">{pref.label}</p>
                <p className="mt-0.5 text-[12px] text-admin-muted">{pref.description}</p>
              </div>
              <input type="checkbox" defaultChecked className="mt-1 h-4 w-4 accent-admin-primary" />
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-[12px] text-admin-muted">Notification delivery preferences are saved locally for now.</p>
    </div>
  );
}
