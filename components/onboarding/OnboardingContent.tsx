import React from 'react';
import { cn } from '@/lib/utils';

interface OnboardingContentProps {
  children: React.ReactNode;
  className?: string;
}

export function OnboardingContent({ children, className }: OnboardingContentProps) {
  return (
    <div className={cn('flex flex-1 flex-col justify-center px-6 py-8 sm:px-10 lg:px-16', className)}>
      <div className="mx-auto w-full max-w-[560px]">{children}</div>
    </div>
  );
}
