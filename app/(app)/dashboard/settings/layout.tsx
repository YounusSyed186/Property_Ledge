'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Building2, CreditCard, Bell, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WORKSPACE_PAGE_X } from '@/components/workspace';

const SETTINGS_NAV = [
  { href: '/dashboard/settings', label: 'Account', icon: User, exact: true },
  { href: '/dashboard/settings/workspace', label: 'Workspace', icon: Building2 },
  { href: '/dashboard/settings/subscription', label: 'Subscription', icon: CreditCard },
  { href: '/dashboard/settings/notifications', label: 'Notifications', icon: Bell },
  { href: '/dashboard/settings/security', label: 'Security', icon: Shield },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className={cn('flex h-full min-h-0 flex-col md:flex-row gap-6 pt-4', WORKSPACE_PAGE_X)}>
      <aside className="shrink-0 md:w-52">
        <h1 className="font-heading text-page-title font-semibold text-admin-foreground mb-4">Settings</h1>
        <nav className="space-y-0.5">
          {SETTINGS_NAV.map((item) => {
            const Icon = item.icon;
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-lg border-l-2 px-2.5 py-2 text-body-sm font-medium transition-colors',
                  active
                    ? 'border-admin-primary bg-admin-primary-soft text-admin-primary'
                    : 'border-transparent text-admin-muted hover:bg-admin-surface-subtle hover:text-admin-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 flex-1 overflow-y-auto no-scrollbar pb-8">{children}</div>
    </div>
  );
}
