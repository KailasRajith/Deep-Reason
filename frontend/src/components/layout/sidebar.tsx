/* ============================================================
   DEEP REASON — Sidebar Navigation
   Refined, collapsible sidebar with elegant interactions.
   ============================================================ */
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSettingsStore, useHealthStore } from '@/lib/store';
import {
  LayoutDashboard,
  Plus,
  Brain,
  GitFork,
  FlaskConical,
  BarChart3,
  History,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Cpu,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  shortcut?: string;
}

const navItems: NavItem[] = [
  { label: 'Overview', href: '/', icon: LayoutDashboard, shortcut: '1' },
  { label: 'New Session', href: '/new', icon: Plus, shortcut: '2' },
  { label: 'Workspace', href: '/workspace', icon: Brain, shortcut: '3' },
  { label: 'Exploration Tree', href: '/tree', icon: GitFork, shortcut: '4' },
  { label: 'Model Lab', href: '/models', icon: FlaskConical, shortcut: '5' },
  { label: 'Benchmarks', href: '/benchmarks', icon: BarChart3, shortcut: '6' },
  { label: 'History', href: '/history', icon: History, shortcut: '7' },
  { label: 'Settings', href: '/settings', icon: Settings, shortcut: '8' },
];

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useSettingsStore((s) => s.settings.sidebar_collapsed);
  const toggleSidebar = useSettingsStore((s) => s.toggleSidebar);
  const mobileMenuOpen = useSettingsStore((s) => s.mobileMenuOpen);
  const setMobileMenuOpen = useSettingsStore((s) => s.setMobileMenuOpen);
  const backendOnline = useHealthStore((s) => s.backendOnline);

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-black/60 z-[var(--z-overlay)] lg:hidden transition-opacity',
          'duration-[var(--duration-normal)]',
          mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={cn(
          'fixed top-0 left-0 h-screen z-[var(--z-sticky)]',
          'bg-[var(--color-sidebar-bg)] border-r border-[var(--color-sidebar-border)]',
          'flex flex-col',
          'transition-all duration-[var(--duration-normal)] ease-[var(--ease-out)]',
          // Desktop widths:
          'lg:translate-x-0',
          collapsed
            ? 'lg:w-[var(--sidebar-collapsed)]'
            : 'lg:w-[var(--sidebar-width)]',
          // Mobile drawer:
          'w-[var(--sidebar-width)] max-lg:shadow-2xl',
          mobileMenuOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full',
        )}
      >
        {/* ── Logo Section ────────────────────────────── */}
        <div
          className={cn(
            'h-[var(--header-height)] flex items-center border-b border-[var(--color-sidebar-border)]',
            collapsed ? 'lg:justify-center px-4' : 'px-4 gap-3',
          )}
        >
          {/* Logo mark */}
          <div className="w-7 h-7 rounded-[var(--radius-lg)] bg-[var(--color-accent)] flex items-center justify-center shrink-0">
            <Cpu className="w-4 h-4 text-white" strokeWidth={2} />
          </div>
          <div className={cn('flex flex-col min-w-0', collapsed && 'lg:hidden')}>
            <span
              className="text-[var(--text-sm)] font-semibold text-[var(--color-text-primary)] tracking-[-0.01em] leading-none"
            >
              Deep Reason
            </span>
            <span className="text-[10px] text-[var(--color-text-tertiary)] leading-tight mt-0.5 font-medium tracking-[var(--tracking-wider)] uppercase">
              MCTS Reasoning
            </span>
          </div>
        </div>

        {/* ── Navigation ──────────────────────────────── */}
        <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden" aria-label="Main navigation">
          <ul className="space-y-0.5 px-2">
            {navItems.map((item) => {
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 h-8 rounded-[var(--radius-md)] transition-all',
                      'duration-[var(--duration-fast)] ease-[var(--ease-out)]',
                      'text-[var(--text-sm)] font-medium',
                      collapsed ? 'lg:justify-center px-2.5' : 'px-2.5',
                      isActive
                        ? 'bg-[var(--color-sidebar-active)] text-[var(--color-sidebar-active-text)]'
                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-sidebar-hover)]',
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon
                      className={cn(
                        'w-4 h-4 shrink-0',
                        isActive
                          ? 'text-[var(--color-sidebar-active-text)]'
                          : 'text-[var(--color-text-tertiary)]',
                      )}
                      strokeWidth={isActive ? 2 : 1.75}
                    />
                    <span className={cn('truncate', collapsed && 'lg:hidden')}>
                      {item.label}
                    </span>
                    {item.shortcut && (
                      <kbd className={cn('ml-auto text-[10px] text-[var(--color-text-quaternary)] font-mono', collapsed && 'lg:hidden')}>
                        {item.shortcut}
                      </kbd>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ── Footer ──────────────────────────────────── */}
        <div className="border-t border-[var(--color-sidebar-border)] p-2 space-y-1">
          {/* Backend status */}
          <div
            className={cn(
              'flex items-center gap-2 h-8 rounded-[var(--radius-md)] text-[var(--text-xs)]',
              collapsed ? 'justify-center' : 'px-2.5',
            )}
          >
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full shrink-0',
                backendOnline ? 'bg-[var(--color-success)]' : 'bg-[var(--color-error)]',
              )}
            />
            {!collapsed && (
              <span className="text-[var(--color-text-tertiary)]">
                {backendOnline ? 'Backend online' : 'Backend offline'}
              </span>
            )}
          </div>

          {/* Collapse toggle */}
          <button
            onClick={toggleSidebar}
            className={cn(
              'flex items-center gap-2 h-8 w-full rounded-[var(--radius-md)]',
              'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]',
              'hover:bg-[var(--color-sidebar-hover)] transition-colors',
              'duration-[var(--duration-fast)] cursor-pointer',
              collapsed ? 'justify-center' : 'px-2.5',
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <PanelLeft className="w-4 h-4" strokeWidth={1.75} />
            ) : (
              <>
                <PanelLeftClose className="w-4 h-4" strokeWidth={1.75} />
                <span className="text-[var(--text-xs)]">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
