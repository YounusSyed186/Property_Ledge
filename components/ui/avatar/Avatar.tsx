'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getDiceBearUrl,
  getInitials,
  getInitialsBgColor,
  DICEBEAR_STYLE,
} from './avatar-utils';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;

export interface AvatarProps {
  /** Stable identifier (e.g. tenant ID, user ID) used to generate deterministic DiceBear avatar */
  seed?: string | null;
  /** Full name used for initials fallback and accessibility alt text */
  name?: string | null;
  /** Explicit custom avatar URL (takes precedence over seed if provided and valid) */
  avatarUrl?: string | null;
  /** DiceBear avatar style identifier (defaults to 'lorelei') */
  avatarStyle?: string;
  /** Size variant or explicit pixel size */
  size?: AvatarSize;
  /** Additional CSS class names */
  className?: string;
  /** Custom alt text for screen readers */
  alt?: string;
  /** Decorative flag (hides from screen readers if true and adjacent to visible name) */
  decorative?: boolean;
}

const SIZE_MAP: Record<string, { px: number; textSize: string; iconSize: string }> = {
  xs: { px: 24, textSize: 'text-[10px]', iconSize: 'w-3 h-3' },
  sm: { px: 32, textSize: 'text-xs', iconSize: 'w-4 h-4' },
  md: { px: 40, textSize: 'text-sm', iconSize: 'w-5 h-5' },
  lg: { px: 48, textSize: 'text-base', iconSize: 'w-6 h-6' },
  xl: { px: 64, textSize: 'text-xl', iconSize: 'w-8 h-8' },
};

export function Avatar({
  seed,
  name,
  avatarUrl,
  avatarStyle = DICEBEAR_STYLE,
  size = 'md',
  className,
  alt,
  decorative = false,
}: AvatarProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);

  // Compute numeric dimensions & font styles
  const sizeConfig = typeof size === 'number'
    ? { px: size, textSize: size < 32 ? 'text-[10px]' : size < 48 ? 'text-xs' : 'text-base', iconSize: 'w-4 h-4' }
    : SIZE_MAP[size] || SIZE_MAP.md;

  const px = sizeConfig.px;
  const effectiveSeed = seed || name || 'person';
  const src = avatarUrl && avatarUrl.trim()
    ? avatarUrl
    : getDiceBearUrl(effectiveSeed, avatarStyle);

  const displayName = name || 'User';
  const initials = getInitials(displayName);
  const colorScheme = getInitialsBgColor(effectiveSeed);
  const accessibleAlt = alt || displayName;

  return (
    <div
      style={{ width: `${px}px`, height: `${px}px` }}
      className={cn(
        'relative rounded-full shrink-0 overflow-hidden select-none border border-black/10 dark:border-white/15 shadow-2xs transition-all flex items-center justify-center',
        colorScheme.bg,
        className
      )}
      aria-hidden={decorative}
    >
      {!hasError ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={src}
            src={src}
            alt={accessibleAlt}
            width={px}
            height={px}
            loading="lazy"
            decoding="async"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
            className={cn(
              'w-full h-full object-cover rounded-full transition-opacity duration-200 relative z-10',
              isLoading ? 'opacity-0' : 'opacity-100'
            )}
          />
          {/* Background Initials showing while image is loading, guaranteeing instant visible avatar */}
          {isLoading && (
            <div
              className={cn(
                'absolute inset-0 flex items-center justify-center font-bold font-heading uppercase tracking-wider z-0',
                colorScheme.text,
                sizeConfig.textSize
              )}
            >
              {initials}
            </div>
          )}
        </>
      ) : (
        /* Initials Fallback */
        <div
          className={cn(
            'w-full h-full rounded-full flex items-center justify-center font-bold font-heading uppercase tracking-wider shadow-inner z-10',
            colorScheme.bg,
            colorScheme.text,
            sizeConfig.textSize
          )}
          title={displayName}
        >
          {initials}
        </div>
      )}
    </div>
  );
}

