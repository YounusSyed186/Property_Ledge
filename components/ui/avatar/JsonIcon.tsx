'use client';

import React from 'react';
import iconsData from '@/public/avatars/icons.json';

interface JsonIconProps {
  name: string;
  className?: string;
  size?: number;
}

export function JsonIcon({ name, className = 'w-4 h-4', size }: JsonIconProps) {
  const iconVariants = (iconsData as any)?.components?.icon?.variants;
  let safeName = name;
  if (name === 'property' || name === 'building2') safeName = 'building';
  if (name === 'residential' || name === 'home') safeName = 'house';
  if (name === 'unit' || name === 'door') safeName = 'doorClosed';

  const iconDef = iconVariants ? iconVariants[safeName] || iconVariants['building'] : null;

  if (!iconDef || !iconDef.elements) {
    return null;
  }

  const styleObj = size ? { width: size, height: size } : undefined;

  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
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
}
