/* ============================================================
   DEEP REASON — Client Layout Wrapper
   Wraps the app with client-side providers and layout.
   ============================================================ */
'use client';

import React from 'react';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { AppShell } from '@/components/layout/app-shell';
import { CommandPalette } from '@/components/layout/command-palette';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AppShell>{children}</AppShell>
      <CommandPalette />
    </ThemeProvider>
  );
}
