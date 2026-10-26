/* ============================================================
   DEEP REASON — Settings Page (/settings)
   Organized preferences for appearance, default MCTS reasoning
   bounds, timeline behavior, notifications, and application metadata.
   ============================================================ */
'use client';

import React, { useState } from 'react';
import { useSettingsStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Sun,
  Moon,
  Monitor,
  Sidebar,
  Sliders,
  Bell,
  ScrollText,
  Info,
  Check,
  RotateCcw,
  ExternalLink,
  GitBranch as Github,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function SettingsPage() {
  const { settings, setTheme, setSidebarCollapsed, updateSettings } = useSettingsStore();

  const [savedFeedback, setSavedFeedback] = useState(false);

  const triggerFeedback = () => {
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  const updateDefaultConfig = (key: string, value: unknown) => {
    updateSettings({
      default_config: {
        ...settings.default_config,
        [key]: value,
      },
    });
    triggerFeedback();
  };

  const resetToDefaults = () => {
    updateSettings({
      default_config: {
        exploration_constant: 1.414,
        max_iterations: 10,
        max_depth: 5,
        branching_factor: 3,
        evaluation_strategy: 'single',
        temperature: 0.7,
        max_tokens: 2048,
      },
      notifications_enabled: true,
      auto_scroll_timeline: true,
    });
    triggerFeedback();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border-primary)] pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
            Preferences & Settings
          </h1>
          <p className="text-[var(--text-sm)] text-[var(--color-text-secondary)] mt-1">
            Configure default reasoning hyperparameters, interface behavior, and workspace preferences.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {savedFeedback && (
            <span className="text-[var(--text-xs)] font-medium text-[var(--color-success)] flex items-center gap-1 animate-fade-in">
              <Check className="w-3.5 h-3.5" />
              Settings saved
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefaults}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Reset Defaults
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* ── Section 1: Appearance ──────────────────────────────── */}
        <section className="rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-5 sm:p-6 space-y-5 shadow-[var(--shadow-xs)]">
          <div className="flex items-center gap-2 border-b border-[var(--color-border-secondary)] pb-3">
            <Sun className="w-4 h-4 text-[var(--color-accent)]" />
            <h2 className="text-[var(--text-base)] font-semibold text-[var(--color-text-primary)]">
              Appearance & Layout
            </h2>
          </div>

          <div className="space-y-4">
            {/* Theme mode */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-[var(--text-sm)] font-medium text-[var(--color-text-primary)]">
                  Interface Theme
                </p>
                <p className="text-[var(--text-xs)] text-[var(--color-text-secondary)]">
                  Choose your preferred color theme or synchronize with system settings.
                </p>
              </div>

              {/* Segmented Theme Picker */}
              <div className="inline-flex p-1 rounded-[var(--radius-lg)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)]">
                {(
                  [
                    { id: 'dark', label: 'Dark', icon: Moon },
                    { id: 'light', label: 'Light', icon: Sun },
                    { id: 'system', label: 'System', icon: Monitor },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setTheme(id);
                      triggerFeedback();
                    }}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-[var(--text-xs)] font-medium transition-all cursor-pointer',
                      settings.theme === id
                        ? 'bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] shadow-sm'
                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sidebar Default State */}
            <div className="pt-3 border-t border-[var(--color-border-secondary)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-[var(--text-sm)] font-medium text-[var(--color-text-primary)]">
                  Sidebar Collapsed by Default
                </p>
                <p className="text-[var(--text-xs)] text-[var(--color-text-secondary)]">
                  Start with a slim icon sidebar for maximized workspace width.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSidebarCollapsed(!settings.sidebar_collapsed);
                  triggerFeedback();
                }}
                className={cn(
                  'w-11 h-6 rounded-full transition-colors relative cursor-pointer',
                  settings.sidebar_collapsed
                    ? 'bg-[var(--color-accent)]'
                    : 'bg-[var(--color-border-primary)]',
                )}
                role="switch"
                aria-checked={settings.sidebar_collapsed}
              >
                <span
                  className={cn(
                    'w-4 h-4 rounded-full bg-white absolute top-1 transition-transform',
                    settings.sidebar_collapsed ? 'left-6' : 'left-1',
                  )}
                />
              </button>
            </div>
          </div>
        </section>

        {/* ── Section 2: Default MCTS Configuration ──────────────── */}
        <section className="rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-5 sm:p-6 space-y-5 shadow-[var(--shadow-xs)]">
          <div className="flex items-center gap-2 border-b border-[var(--color-border-secondary)] pb-3">
            <Sliders className="w-4 h-4 text-[var(--color-accent)]" />
            <h2 className="text-[var(--text-base)] font-semibold text-[var(--color-text-primary)]">
              Default Reasoning Hyperparameters
            </h2>
          </div>

          <p className="text-[var(--text-xs)] text-[var(--color-text-secondary)]">
            These values pre-populate all newly initialized MCTS sessions.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Exploration Constant */}
            <div className="space-y-2 p-3.5 rounded-[var(--radius-lg)] bg-[var(--color-bg-tertiary)]">
              <div className="flex items-center justify-between">
                <label className="text-[var(--text-xs)] font-medium text-[var(--color-text-primary)]">
                  Exploration Constant (c)
                </label>
                <span className="font-mono text-[var(--text-xs)] text-[var(--color-accent)] font-semibold">
                  {(settings.default_config?.exploration_constant ?? 1.414).toFixed(3)}
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="3.0"
                step="0.05"
                value={settings.default_config?.exploration_constant ?? 1.414}
                onChange={(e) =>
                  updateDefaultConfig('exploration_constant', parseFloat(e.target.value))
                }
                className="w-full accent-[var(--color-accent)] cursor-pointer"
              />
              <p className="text-[10px] text-[var(--color-text-tertiary)]">
                Higher values prioritize broad tree exploration; lower values exploit top scores.
              </p>
            </div>

            {/* Max Iterations */}
            <div className="space-y-2 p-3.5 rounded-[var(--radius-lg)] bg-[var(--color-bg-tertiary)]">
              <div className="flex items-center justify-between">
                <label className="text-[var(--text-xs)] font-medium text-[var(--color-text-primary)]">
                  Default Iterations
                </label>
                <span className="font-mono text-[var(--text-xs)] text-[var(--color-accent)] font-semibold">
                  {settings.default_config?.max_iterations ?? 10}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={settings.default_config?.max_iterations ?? 10}
                onChange={(e) =>
                  updateDefaultConfig('max_iterations', parseInt(e.target.value, 10))
                }
                className="w-full accent-[var(--color-accent)] cursor-pointer"
              />
              <p className="text-[10px] text-[var(--color-text-tertiary)]">
                Number of search cycles conducted before finalizing the best path.
              </p>
            </div>

            {/* Max Depth */}
            <div className="space-y-2 p-3.5 rounded-[var(--radius-lg)] bg-[var(--color-bg-tertiary)]">
              <div className="flex items-center justify-between">
                <label className="text-[var(--text-xs)] font-medium text-[var(--color-text-primary)]">
                  Default Tree Depth
                </label>
                <span className="font-mono text-[var(--text-xs)] text-[var(--color-accent)] font-semibold">
                  {settings.default_config?.max_depth ?? 5}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={settings.default_config?.max_depth ?? 5}
                onChange={(e) =>
                  updateDefaultConfig('max_depth', parseInt(e.target.value, 10))
                }
                className="w-full accent-[var(--color-accent)] cursor-pointer"
              />
              <p className="text-[10px] text-[var(--color-text-tertiary)]">
                Maximum reasoning steps allowed in a single search trajectory.
              </p>
            </div>

            {/* Branching Factor */}
            <div className="space-y-2 p-3.5 rounded-[var(--radius-lg)] bg-[var(--color-bg-tertiary)]">
              <div className="flex items-center justify-between">
                <label className="text-[var(--text-xs)] font-medium text-[var(--color-text-primary)]">
                  Branching Factor (k)
                </label>
                <span className="font-mono text-[var(--text-xs)] text-[var(--color-accent)] font-semibold">
                  {settings.default_config?.branching_factor ?? 3}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={settings.default_config?.branching_factor ?? 3}
                onChange={(e) =>
                  updateDefaultConfig('branching_factor', parseInt(e.target.value, 10))
                }
                className="w-full accent-[var(--color-accent)] cursor-pointer"
              />
              <p className="text-[10px] text-[var(--color-text-tertiary)]">
                Number of candidate thought hypotheses generated per node expansion.
              </p>
            </div>
          </div>
        </section>

        {/* ── Section 3: Workspace & Notifications ───────────────── */}
        <section className="rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-5 sm:p-6 space-y-4 shadow-[var(--shadow-xs)]">
          <div className="flex items-center gap-2 border-b border-[var(--color-border-secondary)] pb-3">
            <Bell className="w-4 h-4 text-[var(--color-accent)]" />
            <h2 className="text-[var(--text-base)] font-semibold text-[var(--color-text-primary)]">
              Workspace & Notifications
            </h2>
          </div>

          <div className="space-y-4">
            {/* Auto-scroll timeline */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[var(--text-sm)] font-medium text-[var(--color-text-primary)]">
                  Auto-Scroll Execution Timeline
                </p>
                <p className="text-[var(--text-xs)] text-[var(--color-text-secondary)]">
                  Keep the latest WebSocket reasoning events visible in real-time.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  updateSettings({
                    auto_scroll_timeline: !settings.auto_scroll_timeline,
                  });
                  triggerFeedback();
                }}
                className={cn(
                  'w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0',
                  settings.auto_scroll_timeline
                    ? 'bg-[var(--color-accent)]'
                    : 'bg-[var(--color-border-primary)]',
                )}
                role="switch"
                aria-checked={settings.auto_scroll_timeline}
              >
                <span
                  className={cn(
                    'w-4 h-4 rounded-full bg-white absolute top-1 transition-transform',
                    settings.auto_scroll_timeline ? 'left-6' : 'left-1',
                  )}
                />
              </button>
            </div>

            {/* Notifications toggle */}
            <div className="pt-3 border-t border-[var(--color-border-secondary)] flex items-center justify-between gap-3">
              <div>
                <p className="text-[var(--text-sm)] font-medium text-[var(--color-text-primary)]">
                  Completion Notifications
                </p>
                <p className="text-[var(--text-xs)] text-[var(--color-text-secondary)]">
                  Receive an alert when an extensive MCTS search completes or terminates.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  updateSettings({
                    notifications_enabled: !settings.notifications_enabled,
                  });
                  triggerFeedback();
                }}
                className={cn(
                  'w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0',
                  settings.notifications_enabled
                    ? 'bg-[var(--color-accent)]'
                    : 'bg-[var(--color-border-primary)]',
                )}
                role="switch"
                aria-checked={settings.notifications_enabled}
              >
                <span
                  className={cn(
                    'w-4 h-4 rounded-full bg-white absolute top-1 transition-transform',
                    settings.notifications_enabled ? 'left-6' : 'left-1',
                  )}
                />
              </button>
            </div>
          </div>
        </section>

        {/* ── Section 4: About & System Info ─────────────────────── */}
        <section className="rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-5 sm:p-6 space-y-4 shadow-[var(--shadow-xs)]">
          <div className="flex items-center gap-2 border-b border-[var(--color-border-secondary)] pb-3">
            <Info className="w-4 h-4 text-[var(--color-accent)]" />
            <h2 className="text-[var(--text-base)] font-semibold text-[var(--color-text-primary)]">
              About Deep Reason
            </h2>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-accent)] flex items-center justify-center shrink-0 shadow-sm">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-[var(--text-base)] font-semibold text-[var(--color-text-primary)]">
                  Deep Reason Platform
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)] text-[var(--color-text-tertiary)]">
                  v0.1.0-alpha
                </span>
              </div>
              <p className="text-[var(--text-xs)] text-[var(--color-text-secondary)] leading-relaxed max-w-xl">
                A world-class multi-model AI reasoning platform using Monte Carlo Tree Search
                for System-2 deliberation, multi-path exploration, and autonomous verification.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--color-border-secondary)] flex flex-wrap gap-4 text-[var(--text-xs)]">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub Repository</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <ScrollText className="w-3.5 h-3.5" />
              <span>Documentation & Guides</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
