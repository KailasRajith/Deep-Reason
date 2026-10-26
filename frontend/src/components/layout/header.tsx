/* ============================================================
   DEEP REASON — Top Header Bar
   Current page context, search, theme toggle, status.
   ============================================================ */
'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSettingsStore, useHealthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import {
  Search,
  Sun,
  Moon,
  Monitor,
  PanelLeft,
} from 'lucide-react';

const pageTitles: Record<string, string> = {
  '/': 'Overview',
  '/new': 'New Reasoning Session',
  '/workspace': 'Reasoning Workspace',
  '/tree': 'Exploration Tree',
  '/models': 'Model Laboratory',
  '/benchmarks': 'Evaluation & Benchmarks',
  '/history': 'Session History',
  '/settings': 'Settings',
};

export function Header() {
  const pathname = usePathname();
  const theme = useSettingsStore((s) => s.settings.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const toggleMobileMenu = useSettingsStore((s) => s.toggleMobileMenu);
  const backendOnline = useHealthStore((s) => s.backendOnline);
  const backendVersion = useHealthStore((s) => s.backendVersion);

  // Match page title from path
  const pageTitle =
    pageTitles[pathname] ||
    Object.entries(pageTitles).find(([key]) =>
      key !== '/' && pathname.startsWith(key),
    )?.[1] ||
    'Deep Reason';

  const cycleTheme = () => {
    if (theme === 'dark') setTheme('light');
    else if (theme === 'light') setTheme('system');
    else setTheme('dark');
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  const openCommandPalette = () => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, metaKey: true, bubbles: true })
    );
  };

  return (
    <header
      className={cn(
        'h-[var(--header-height)] border-b border-[var(--color-border-secondary)]',
        'bg-[var(--color-bg-secondary)] flex items-center justify-between px-4 gap-4',
        'sticky top-0 z-[var(--z-sticky)]',
      )}
    >
      {/* Left: mobile toggle + title */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile sidebar toggle */}
        <button
          onClick={toggleMobileMenu}
          className={cn(
            'lg:hidden flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)]',
            'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]',
            'transition-colors cursor-pointer border border-[var(--color-border-primary)]',
          )}
          aria-label="Toggle navigation drawer"
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        <h1 className="text-[var(--text-md)] font-semibold text-[var(--color-text-primary)] truncate tracking-[var(--tracking-tight)]">
          {pageTitle}
        </h1>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {/* Search button with command palette trigger */}
        <Button
          variant="outline"
          size="sm"
          onClick={openCommandPalette}
          className="hidden sm:flex gap-2 text-[var(--color-text-tertiary)] font-normal h-8 px-2.5"
          title="Search (Ctrl/Cmd + K)"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="text-[var(--text-xs)]">Search</span>
          <kbd className="ml-1 text-[10px] font-mono bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 rounded-[var(--radius-sm)] border border-[var(--color-border-primary)]">
            ⌘K
          </kbd>
        </Button>

        {/* Backend status indicator */}
        <div
          className={cn(
            'hidden md:flex items-center gap-1.5 px-2.5 h-7 rounded-[var(--radius-full)]',
            'text-[var(--text-xs)] border',
            backendOnline
              ? 'bg-[var(--color-success-subtle)] text-[var(--color-success-text)] border-[var(--color-success)]/20'
              : 'bg-[var(--color-error-subtle)] text-[var(--color-error-text)] border-[var(--color-error)]/20',
          )}
        >
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              backendOnline ? 'bg-[var(--color-success)]' : 'bg-[var(--color-error)]',
            )}
          />
          <span className="font-medium font-mono text-[11px]">
            {backendOnline ? `v${backendVersion || '1.0.0'}` : 'Offline'}
          </span>
        </div>

        {/* Theme toggle */}
        <Button
          variant="outline"
          size="icon"
          onClick={cycleTheme}
          title={`Theme: ${theme} (click to toggle)`}
          className="h-8 w-8 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          aria-label="Toggle color theme"
        >
          <ThemeIcon className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
