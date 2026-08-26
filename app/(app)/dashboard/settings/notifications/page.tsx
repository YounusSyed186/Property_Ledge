'use client';

import { Card, CardContent } from '@/components/admin/ui';
import { useEffect, useState } from 'react';

const NOTIFICATION_PREFS = [
  { id: 'rent_due', label: 'Rent due reminders', description: 'Get notified when rent is due or overdue.' },
  { id: 'lease_expiry', label: 'Lease expirations', description: 'Alerts when leases are expiring within 60 days.' },
  { id: 'maintenance', label: 'Maintenance updates', description: 'Status changes on maintenance requests.' },
  { id: 'inspections', label: 'Inspection reminders', description: 'Upcoming inspection schedules.' },
];

export default function NotificationsSettingsPage() {
  const [preferences, setPreferences] = useState<Record<string, boolean>>(
    () => Object.fromEntries(NOTIFICATION_PREFS.map((pref) => [pref.id, true]))
  );

  useEffect(() => {
    try {
      const stored = localStorage.getItem('propertyledge_notification_preferences');
      if (stored) setPreferences((current) => ({ ...current, ...JSON.parse(stored) }));
    } catch {
      // Keep the default preferences when local storage is unavailable.
    }
  }, []);

  const updatePreference = (id: string, enabled: boolean) => {
    const next = { ...preferences, [id]: enabled };
    setPreferences(next);
    localStorage.setItem('propertyledge_notification_preferences', JSON.stringify(next));
  };

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
              <div className="min-w-0">
                <p className="text-sm font-medium text-admin-foreground">{pref.label}</p>
                <p className="mt-0.5 text-[12px] text-admin-muted">{pref.description}</p>
              </div>
              <input
                id={`notification-${pref.id}`}
                type="checkbox"
                checked={preferences[pref.id]}
                onChange={(event) => updatePreference(pref.id, event.target.checked)}
                aria-label={pref.label}
                className="mt-1 h-4 w-4 shrink-0 accent-admin-primary focus:ring-admin-primary"
              />
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-[12px] text-admin-muted">Preferences are saved on this device. Email delivery controls will be available when workspace notifications are connected.</p>
    </div>
  );
}
