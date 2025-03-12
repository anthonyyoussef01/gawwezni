'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes';
import { useEffect } from 'react';
import Cookies from 'js-cookie';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const savedTheme = typeof window !== 'undefined' ? Cookies.get('theme') : undefined;

  useEffect(() => {
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, [savedTheme]);

  return (
    <NextThemesProvider 
      {...props}
      defaultTheme={savedTheme || props.defaultTheme}
    >
      {children}
    </NextThemesProvider>
  );
}