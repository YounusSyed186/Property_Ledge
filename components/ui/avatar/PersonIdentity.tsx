'use client';

import React from 'react';
import { Avatar, AvatarSize } from './Avatar';
import { cn } from '@/lib/utils';

export interface PersonIdentityProps {
  /** Stable identifier (e.g. tenant ID, user ID) for deterministic avatar generation */
  seed?: string | null;
  /** Primary display name */
  name: string;
  /** Optional secondary subtitle (e.g. email, role, or property/unit) */
  subtitle?: string | null;
  /** Explicit custom avatar URL if available */
  avatarUrl?: string | null;
  /** Avatar size variant */
  size?: AvatarSize;
  /** Text layout orientation */
  layout?: 'horizontal' | 'vertical';
  /** Additional CSS class names */
  className?: string;
  /** Name font styling overrides */
  nameClassName?: string;
  /** Subtitle font styling overrides */
  subtitleClassName?: string;
  /** Optional click action */
  onClick?: () => void;
}

export function PersonIdentity({
  seed,
  name,
  subtitle,
  avatarUrl,
  size = 'sm',
  layout = 'horizontal',
  className,
  nameClassName,
  subtitleClassName,
  onClick,
}: PersonIdentityProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2.5 min-w-0 max-w-full',
        layout === 'vertical' && 'flex-col text-center gap-1.5',
        onClick && 'cursor-pointer hover:opacity-90 transition-opacity',
        className
      )}
    >
      <Avatar
        seed={seed || name}
        name={name}
        avatarUrl={avatarUrl}
        size={size}
        decorative
      />
      <div className="min-w-0 flex-1 truncate text-left">
        <p className={cn('text-sm font-semibold text-foreground truncate leading-tight', nameClassName)}>
          {name}
        </p>
        {subtitle && (
          <p className={cn('text-xs text-muted truncate mt-0.5 font-medium', subtitleClassName)}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
