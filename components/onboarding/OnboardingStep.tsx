import React from 'react';

interface OnboardingStepProps {
  eyebrow: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function OnboardingStep({ eyebrow, title, description, children }: OnboardingStepProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-admin-muted cursor-default">
          {eyebrow}
        </p>
        <h1 className="font-heading text-2xl sm:text-[32px] font-bold tracking-tight text-admin-foreground leading-[1.2] cursor-default">
          {title}
        </h1>
        {description && (
          <p className="text-sm sm:text-base text-admin-muted leading-relaxed cursor-default">
            {description}
          </p>
        )}
      </div>
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
}
