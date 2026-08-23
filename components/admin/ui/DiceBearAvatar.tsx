'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface DiceBearAvatarProps {
  seed: string;
  size?: number;
  className?: string;
  alt?: string;
}

export function DiceBearAvatar({
  seed,
  size = 28,
  className,
  alt = 'Avatar',
}: DiceBearAvatarProps) {
  const safeSeed = encodeURIComponent(seed || 'user');
  const avatarUrl = `https://api.dicebear.com/9.x/lorelei/svg?seed=${safeSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf,e0f2fe,fef3c7`;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarUrl}
      alt={alt}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={cn(
        'rounded-full object-cover shrink-0 border border-admin-border/80 shadow-xs bg-admin-surface-elevated',
        className
      )}
      loading="lazy"
    />
  );
}
