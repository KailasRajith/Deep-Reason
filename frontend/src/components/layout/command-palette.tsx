/* ============================================================
   DEEP REASON — Command Palette
   Ctrl/Cmd+K quick command interface.
   ============================================================ */
'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Plus,
  Brain,
  GitFork,
  FlaskConical,
  BarChart3,
  History,
  Settings,
  Search,
  Sun,
  Moon,
  ArrowRight,
} from 'lucide-react';
import { useSettingsStore } from '@/lib/store';

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  action: () => void;
  category: string;
  keywords?: string[];
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const setTheme = useSettingsStore((s) => s.setTheme);

  const commands: Command[] = useMemo(
    () => [
      {
        id: 'nav-overview',
        label: 'Go to Overview',
        icon: LayoutDashboard,
        action: () => router.push('/'),
        category: 'Navigation',
        keywords: ['home', 'dashboard'],
      },
      {
        id: 'nav-new',
        label: 'New Reasoning Session',
        description: 'Start a new MCTS reasoning task',
        icon: Plus,
        action: () => router.push('/new'),
        category: 'Navigation',
        keywords: ['create', 'start', 'task'],
      },
      {
        id: 'nav-workspace',
        label: 'Reasoning Workspace',
        icon: Brain,
        action: () => router.push('/workspace'),
        category: 'Navigation',
      },
      {
        id: 'nav-tree',
        label: 'Exploration Tree',
        icon: GitFork,
        action: () => router.push('/tree'),
        category: 'Navigation',
      },
      {
        id: 'nav-models',
        label: 'Model Laboratory',
        icon: FlaskConical,
        action: () => router.push('/models'),
        category: 'Navigation',
        keywords: ['providers', 'api', 'configuration'],
      },
      {
        id: 'nav-benchmarks',
        label: 'Evaluation & Benchmarks',
        icon: BarChart3,
        action: () => router.push('/benchmarks'),
        category: 'Navigation',
      },
      {
        id: 'nav-history',
        label: 'Session History',
        icon: History,
        action: () => router.push('/history'),
        category: 'Navigation',
      },
      {
        id: 'nav-settings',
        label: 'Settings',
        icon: Settings,
        action: () => router.push('/settings'),
        category: 'Navigation',
      },
      {
        id: 'theme-dark',
        label: 'Switch to Dark Theme',
        icon: Moon,
        action: () => setTheme('dark'),
        category: 'Appearance',
        keywords: ['dark', 'night'],
      },
      {
        id: 'theme-light',
        label: 'Switch to Light Theme',
        icon: Sun,
        action: () => setTheme('light'),
        category: 'Appearance',
        keywords: ['light', 'day'],
      },
    ],
    [router, setTheme],
  );

  const filtered = useMemo(() => {
    if (!query) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.description?.toLowerCase().includes(q) ||
        cmd.keywords?.some((k) => k.includes(q)) ||
        cmd.category.toLowerCase().includes(q),
    );
  }, [query, commands]);

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, Command[]> = {};
    for (const cmd of filtered) {
      if (!groups[cmd.category]) groups[cmd.category] = [];
      groups[cmd.category].push(cmd);
    }
    return groups;
  }, [filtered]);

  // Keyboard shortcut to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const runCommand = useCallback(
    (cmd: Command) => {
      cmd.action();
      setOpen(false);
    },
    [],
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = filtered[selectedIndex];
      if (cmd) runCommand(cmd);
    }
  };

  if (!open) return null;

  let flatIndex = 0;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-[var(--z-command)] animate-fade-in"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Palette */}
      <div
        className={cn(
          'fixed top-[20%] left-1/2 -translate-x-1/2 z-[var(--z-command)]',
          'w-full max-w-[540px] mx-4',
          'bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)]',
          'rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)]',
          'overflow-hidden animate-scale-in',
        )}
        role="dialog"
        aria-label="Command palette"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 h-12 border-b border-[var(--color-border-secondary)]">
          <Search className="w-4 h-4 text-[var(--color-text-tertiary)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search…"
            className={cn(
              'flex-1 bg-transparent text-[var(--text-sm)] text-[var(--color-text-primary)]',
              'placeholder:text-[var(--color-text-quaternary)] outline-none',
            )}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="text-[10px] font-mono text-[var(--color-text-quaternary)] bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 rounded-[var(--radius-sm)] border border-[var(--color-border-secondary)]">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[320px] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-[var(--text-sm)] text-[var(--color-text-tertiary)]">
              No results found
            </div>
          ) : (
            Object.entries(grouped).map(([category, cmds]) => (
              <div key={category}>
                <div className="px-4 py-1.5 text-[10px] font-semibold text-[var(--color-text-quaternary)] uppercase tracking-[var(--tracking-wider)]">
                  {category}
                </div>
                {cmds.map((cmd) => {
                  const thisIndex = flatIndex++;
                  const isSelected = thisIndex === selectedIndex;
                  const Icon = cmd.icon;

                  return (
                    <button
                      key={cmd.id}
                      onClick={() => runCommand(cmd)}
                      className={cn(
                        'flex items-center gap-3 w-full px-4 py-2 text-left',
                        'transition-colors cursor-pointer',
                        isSelected
                          ? 'bg-[var(--color-bg-selected)]'
                          : 'hover:bg-[var(--color-bg-hover)]',
                      )}
                    >
                      <Icon className="w-4 h-4 text-[var(--color-text-tertiary)] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-[var(--text-sm)] text-[var(--color-text-primary)]">
                          {cmd.label}
                        </span>
                        {cmd.description && (
                          <span className="ml-2 text-[var(--text-xs)] text-[var(--color-text-tertiary)]">
                            {cmd.description}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <ArrowRight className="w-3 h-3 text-[var(--color-text-quaternary)]" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--color-border-secondary)] text-[10px] text-[var(--color-text-quaternary)]">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <span>{filtered.length} commands</span>
        </div>
      </div>
    </>
  );
}
