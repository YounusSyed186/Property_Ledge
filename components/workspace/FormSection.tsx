'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <section className={cn('space-y-3', className)}>
      <div>
        <h3 className="text-section-title font-semibold text-admin-foreground">{title}</h3>
        {description && <p className="mt-0.5 text-caption text-admin-muted">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
