'use client';

import { useState, useEffect } from 'react';
import type { ThemeMode } from '@/lib/themeTransition';

export interface AppThemeState {
  theme: 'light' | 'dark';
  themeMode: ThemeMode;
  isDark: boolean;
  mounted: boolean;
}

export function useAppTheme(): AppThemeState {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(true); // default dark to avoid flash if dark mode is preferred
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    setMounted(true);

    const readTheme = () => {
      if (typeof document === 'undefined') return;
      const htmlEl = document.documentElement;
      const hasDarkClass = htmlEl.classList.contains('dark');
      const attrMode = (htmlEl.getAttribute('data-theme-mode') as ThemeMode) || (hasDarkClass ? 'dark' : 'light');
      const stored = (localStorage.getItem('propertyledge_theme') as ThemeMode) || attrMode;

      setIsDark(hasDarkClass || stored === 'dark' || stored === 'full-dark');
      setThemeMode(stored);
    };

    readTheme();

    const handleThemeChange = () => {
      readTheme();
    };

    window.addEventListener('theme-change', handleThemeChange);

    // MutationObserver to instantly detect .dark class changes
    const observer = new MutationObserver(() => {
      readTheme();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme-mode'],
    });

    return () => {
      window.removeEventListener('theme-change', handleThemeChange);
      observer.disconnect();
    };
  }, []);

  return {
    theme: isDark ? 'dark' : 'light',
    themeMode,
    isDark,
    mounted,
  };
}
