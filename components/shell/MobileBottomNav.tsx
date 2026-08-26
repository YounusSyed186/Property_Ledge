'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export interface MobileNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface MobileBottomNavProps {
  items: MobileNavItem[];
  className?: string;
}

export function MobileBottomNav({ items, className }: MobileBottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        'md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-admin-border bg-admin-surface/95 backdrop-blur-md',
        className
      )}
    >
      <div className="flex items-stretch justify-around px-1 py-1.5 safe-area-pb">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-colors',
                isActive ? 'text-admin-primary' : 'text-admin-muted hover:text-admin-foreground'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive && 'text-admin-primary')} />
              <span className="truncate max-w-full px-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
