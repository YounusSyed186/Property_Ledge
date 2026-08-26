import React from 'react';

interface OnboardingStepProps {
  eyebrow: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function OnboardingStep({ eyebrow, title, description, children }: OnboardingStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-admin-muted">{eyebrow}</p>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-admin-foreground sm:text-3xl">
          {title}
        </h1>
        {description && <p className="text-sm text-admin-muted leading-relaxed">{description}</p>}
      </div>
      {children}
    </div>
  );
}
