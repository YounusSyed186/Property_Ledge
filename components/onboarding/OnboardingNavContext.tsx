'use client';

import React, { createContext, useCallback, useContext, useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';

interface OnboardingNavContextValue {
  isNavigating: boolean;
  navigate: (href: string) => void;
}

const OnboardingNavContext = createContext<OnboardingNavContextValue | null>(null);

export function OnboardingNavProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [prevPath, setPrevPath] = useState(pathname);

  useEffect(() => {
    if (pathname !== prevPath) {
      setIsRouteLoading(false);
      setPrevPath(pathname);
    }
  }, [pathname, prevPath]);

  const navigate = useCallback(
    (href: string) => {
      if (href === pathname) return;
      setIsRouteLoading(true);
      startTransition(() => {
        router.push(href);
      });
    },
    [pathname, router]
  );

  const isNavigating = isPending || isRouteLoading;

  return (
    <OnboardingNavContext.Provider value={{ isNavigating, navigate }}>
      {children}
    </OnboardingNavContext.Provider>
  );
}

export function useOnboardingNav() {
  const ctx = useContext(OnboardingNavContext);
  if (!ctx) {
    throw new Error('useOnboardingNav must be used within OnboardingNavProvider');
  }
  return ctx;
}
