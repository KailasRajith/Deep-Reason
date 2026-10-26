/* ============================================================
   DEEP REASON — App Shell Layout
   Main layout wrapper combining sidebar, header, and content.
   ============================================================ */
'use client';

import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { useSettingsStore, useHealthStore } from '@/lib/store';

export function AppShell({ children }: { children: React.ReactNode }) {
  const collapsed = useSettingsStore((s) => s.settings.sidebar_collapsed);
  const checkHealth = useHealthStore((s) => s.checkHealth);

  // Check backend health on mount and periodically
  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30_000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <Sidebar />
      <div
        className={cn(
          'transition-[margin-left] duration-[var(--duration-normal)] ease-[var(--ease-out)]',
          collapsed
            ? 'lg:ml-[var(--sidebar-collapsed)]'
            : 'lg:ml-[var(--sidebar-width)]',
        )}
      >
        <Header />
        <main className="min-h-[calc(100vh-var(--header-height))]">
          {children}
        </main>
      </div>
    </div>
  );
}
