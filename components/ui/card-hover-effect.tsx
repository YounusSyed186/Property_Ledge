'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export function HoverCardGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
  onMouseLeave?: () => void;
  setHoveredIndex?: (idx: number | null) => void;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max py-2',
        className
      )}
    >
      {children}
    </div>
  );
}

interface HoverEffectCardItemProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  index?: number;
  hoveredIndex?: number | null;
  setHoveredIndex?: (idx: number | null) => void;
  glowColor?: string;
}

export function HoverEffectCardItem({
  children,
  className,
  onClick,
}: HoverEffectCardItemProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl bg-admin-surface border border-admin-border p-5 transition-all duration-200 shadow-xs flex flex-col justify-between gap-4 hover:border-admin-primary/40 hover:shadow-md',
        className
      )}
    >
      {children}
    </div>
  );
}

