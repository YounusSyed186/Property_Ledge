'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

/* ============================================================
   TOOLTIP
   ============================================================ */

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!isVisible || !wrapperRef.current || !tooltipRef.current) return;

    const wrapper = wrapperRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current.getBoundingClientRect();

    let top = 0;
    let left = 0;

    switch (side) {
      case 'top':
        top = wrapper.top - tooltip.height - 8;
        left = wrapper.left + wrapper.width / 2 - tooltip.width / 2;
        break;
      case 'bottom':
        top = wrapper.bottom + 8;
        left = wrapper.left + wrapper.width / 2 - tooltip.width / 2;
        break;
      case 'left':
        top = wrapper.top + wrapper.height / 2 - tooltip.height / 2;
        left = wrapper.left - tooltip.width - 8;
        break;
      case 'right':
        top = wrapper.top + wrapper.height / 2 - tooltip.height / 2;
        left = wrapper.right + 8;
        break;
    }

    setPosition({ top, left });
  }, [isVisible, side]);

  return (
    <div
      ref={wrapperRef}
      className="relative inline-flex"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          style={{ top: position.top, left: position.left }}
          className={cn(
            'fixed z-tooltip pointer-events-none px-2.5 py-1 rounded-md bg-admin-surface-elevated border border-admin-border text-caption font-medium text-admin-foreground shadow-elevation-3 whitespace-nowrap animate-fade-in',
            className
          )}
          role="tooltip"
        >
          {content}
        </div>
      )}
    </div>
  );
}