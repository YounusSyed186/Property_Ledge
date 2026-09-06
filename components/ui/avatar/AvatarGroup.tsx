'use client';

import React from 'react';
import { Avatar, AvatarSize } from './Avatar';
import { cn } from '@/lib/utils';

export interface AvatarGroupItem {
  id?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
}

export interface AvatarGroupProps {
  items: AvatarGroupItem[];
  maxDisplay?: number;
  size?: AvatarSize;
  className?: string;
}

export function AvatarGroup({
  items = [],
  maxDisplay = 3,
  size = 'sm',
  className,
}: AvatarGroupProps) {
  if (!items || items.length === 0) return null;

  const visibleItems = items.slice(0, maxDisplay);
  const overflowCount = items.length - maxDisplay;

  return (
    <div className={cn('flex items-center -space-x-2 overflow-hidden py-0.5', className)}>
      {visibleItems.map((item, idx) => (
        <div key={item.id || item.name || idx} className="ring-2 ring-background rounded-full">
          <Avatar
            seed={item.id || item.name}
            name={item.name}
            avatarUrl={item.avatarUrl}
            size={size}
            decorative
          />
        </div>
      ))}
      {overflowCount > 0 && (
        <div className="relative ring-2 ring-background rounded-full bg-surface-subtle dark:bg-[#1C262C] text-foreground text-xs font-bold px-2 py-0.5 min-w-[28px] h-[28px] flex items-center justify-center border border-border">
          +{overflowCount}
        </div>
      )}
    </div>
  );
}
