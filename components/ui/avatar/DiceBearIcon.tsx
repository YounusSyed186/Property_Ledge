'use client';

import React from 'react';
import iconsData from '@/public/avatars/icons.json';

export type DiceBearIconName =
  | 'building'
  | 'house'
  | 'houseDoor'
  | 'doorClosed'
  | 'doorOpen'
  | 'bank'
  | 'briefcase'
  | 'calculator'
  | 'cashCoin'
  | 'key'
  | 'envelope'
  | 'clock'
  | 'box'
  | 'boxes'
  | 'bricks'
  | 'camera'
  | 'compass'
  | 'tag'
  | string;

interface DiceBearIconProps {
  name: DiceBearIconName;
  className?: string;
  size?: number;
  color?: string;
  badge?: boolean;
  variant?: 'red' | 'blue' | 'purple' | 'amber' | 'emerald' | 'neutral';
}

export function DiceBearIcon({
  name,
  className = 'w-4 h-4',
  size,
  color,
  badge = false,
  variant = 'red',
}: DiceBearIconProps) {
  const iconVariants = (iconsData as any)?.components?.icon?.variants;
  // Map common aliases
  let safeName = name;
  if (name === 'property' || name === 'building2') safeName = 'building';
  if (name === 'residential' || name === 'home') safeName = 'house';
  if (name === 'unit' || name === 'door') safeName = 'doorClosed';
  if (name === 'lease') safeName = 'building';

  const iconDef = iconVariants ? iconVariants[safeName] || iconVariants['building'] || iconVariants['house'] : null;

  if (!iconDef || !iconDef.elements) {
    return null;
  }

  const styleObj = size ? { width: size, height: size } : undefined;

  const svgContent = (
    <svg
      viewBox="0 0 16 16"
      fill={color || 'currentColor'}
      className={className}
      style={styleObj}
      aria-hidden="true"
    >
      {iconDef.elements.map((el: any, idx: number) => {
        const attrs = el.attributes || {};
        return (
          <path
            key={idx}
            d={attrs.d}
            fillRule={attrs['fill-rule'] || attrs.fillRule}
            clipRule={attrs['clip-rule'] || attrs.clipRule}
          />
        );
      })}
    </svg>
  );

  if (!badge) {
    return svgContent;
  }

  const variantStyles = {
    red: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    neutral: 'bg-admin-surface-subtle text-foreground border-admin-border',
  };

  return (
    <div
      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border shadow-xs ${variantStyles[variant]}`}
    >
      {svgContent}
    </div>
  );
}
