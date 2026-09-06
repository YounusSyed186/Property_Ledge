'use client';

import React from 'react';
import { Avatar } from '@/components/ui/avatar';

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
  return (
    <Avatar
      seed={seed}
      size={size}
      className={className}
      alt={alt}
    />
  );
}
