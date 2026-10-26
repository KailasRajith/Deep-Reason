/* ============================================================
   DEEP REASON — Overview / Dashboard Page (/)
   Apple-inspired dashboard with key metrics, recent sessions,
   system health, and quick actions.
   ============================================================ */
'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useSessionsStore, useHealthStore, useProvidersStore } from '@/lib/store';
import {
  formatDuration,
  formatTokens,
  formatRelativeTime,
  truncate,
  cn,
} from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Session, SessionStatus } from '@/types';
import {
  Plus,
  Sparkles,
  Layers,
  CheckCircle2,
  Clock,
  Coins,
  Server,
  ArrowRight,
  History,
  FlaskConical,
  Settings,
  RefreshCw,
  ExternalLink,
  Activity,
  Bot,
  AlertCircle,
} from 'lucide-react';

const statusBadgeStyles: Record<
  SessionStatus,
  { bg: string; text: string; dot: string; label: string }
> = {
  pending: {
    bg: 'bg-zinc-500/10',
    text: 'text-zinc-400',
    dot: 'bg-zinc-400',
    label: 'Pending',
  },
  running: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    dot: 'bg-blue-500 animate-pulse',
    label: 'Running',
  },
  paused: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
    label: 'Paused',
  },
  completed: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    dot: 'bg-emerald-500',
    label: 'Completed',
  },
  failed: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    dot: 'bg-rose-500',
    label: 'Failed',
  },
  cancelled: {
    bg: 'bg-zinc-500/10',
    text: 'text-zinc-400',
    dot: 'bg-zinc-400',
    label: 'Cancelled',
  },
};

export default function OverviewPage() {
  const {
    sessions,
    loading: sessionsLoading,
    stats,
    statsLoading,
    fetchSessions,
    fetchStats,
  } = useSessionsStore();

  const { backendOnline, backendVersion, checking: healthChecking, checkHealth } =
    useHealthStore();

  const { providers, loading: providersLoading, fetchProviders } =
    useProvidersStore();

  useEffect(() => {
    fetchSessions();
    fetchStats();
    fetchProviders();
  }, [fetchSessions, fetchStats, fetchProviders]);

  const configuredProvidersCount = providers.filter((p) => p.configured).length;
  const recentSessions = sessions.slice(0, 5);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* ── Welcome Section ───────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-6 sm:p-8 shadow-[var(--shadow-sm)]">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-[var(--color-accent-subtle)] rounded-full blur-3xl pointer-events-none opacity-50" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[var(--radius-full)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)] text-[var(--text-xs)] font-medium text-[var(--color-text-secondary)]">
              <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              <span>Autonomous System-2 Deliberation</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--color-text-primary)]">
              Deep Reason
            </h1>
            <p className="text-[var(--text-sm)] sm:text-[var(--text-base)] text-[var(--color-text-secondary)] leading-relaxed">
              Explore complex decision trees and multi-model consensus using Monte Carlo
              Tree Search. Deconstruct hard problems with precision, depth, and transparency.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link href="/new">
              <Button
                variant="primary"
                size="lg"
                icon={<Plus className="w-4 h-4" />}
                className="shadow-sm"
              >
                New Reasoning Session
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stats Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sessions */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-4 sm:p-5 flex flex-col justify-between shadow-[var(--shadow-xs)] transition-all hover:border-[var(--color-border-focus)]">
          <div className="flex items-center justify-between text-[var(--color-text-tertiary)]">
            <span className="text-[var(--text-xs)] font-medium uppercase tracking-wider">
              Total Sessions
            </span>
            <Layers className="w-4 h-4 text-[var(--color-accent)]" />
          </div>
          <div className="mt-3">
            {statsLoading ? (
              <div className="h-8 w-20 skeleton" />
            ) : (
              <div className="text-2xl sm:text-3xl font-semibold text-[var(--color-text-primary)] font-mono tracking-tight">
                {stats?.total_sessions ?? sessions.length ?? 0}
              </div>
            )}
            <p className="mt-1 text-[var(--text-xs)] text-[var(--color-text-tertiary)]">
              All deliberation runs
            </p>
          </div>
        </div>

        {/* Completed */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-4 sm:p-5 flex flex-col justify-between shadow-[var(--shadow-xs)] transition-all hover:border-[var(--color-border-focus)]">
          <div className="flex items-center justify-between text-[var(--color-text-tertiary)]">
            <span className="text-[var(--text-xs)] font-medium uppercase tracking-wider">
              Completed
            </span>
            <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />
          </div>
          <div className="mt-3">
            {statsLoading ? (
              <div className="h-8 w-20 skeleton" />
            ) : (
              <div className="text-2xl sm:text-3xl font-semibold text-[var(--color-text-primary)] font-mono tracking-tight">
                {stats?.completed_sessions ??
                  sessions.filter((s) => s.status === 'completed').length ??
                  0}
              </div>
            )}
            <p className="mt-1 text-[var(--text-xs)] text-[var(--color-text-tertiary)]">
              Successfully resolved
            </p>
          </div>
        </div>

        {/* Avg Duration */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-4 sm:p-5 flex flex-col justify-between shadow-[var(--shadow-xs)] transition-all hover:border-[var(--color-border-focus)]">
          <div className="flex items-center justify-between text-[var(--color-text-tertiary)]">
            <span className="text-[var(--text-xs)] font-medium uppercase tracking-wider">
              Avg Duration
            </span>
            <Clock className="w-4 h-4 text-[var(--color-warning)]" />
          </div>
          <div className="mt-3">
            {statsLoading ? (
              <div className="h-8 w-24 skeleton" />
            ) : (
              <div className="text-2xl sm:text-3xl font-semibold text-[var(--color-text-primary)] font-mono tracking-tight">
                {stats?.avg_duration_seconds !== undefined
                  ? formatDuration(stats.avg_duration_seconds)
                  : '0s'}
              </div>
            )}
            <p className="mt-1 text-[var(--text-xs)] text-[var(--color-text-tertiary)]">
              Per reasoning process
            </p>
          </div>
        </div>

        {/* Avg Tokens */}
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-4 sm:p-5 flex flex-col justify-between shadow-[var(--shadow-xs)] transition-all hover:border-[var(--color-border-focus)]">
          <div className="flex items-center justify-between text-[var(--color-text-tertiary)]">
            <span className="text-[var(--text-xs)] font-medium uppercase tracking-wider">
              Avg Tokens
            </span>
            <Coins className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-3">
            {statsLoading ? (
              <div className="h-8 w-24 skeleton" />
            ) : (
              <div className="text-2xl sm:text-3xl font-semibold text-[var(--color-text-primary)] font-mono tracking-tight">
                {stats?.avg_tokens ? formatTokens(stats.avg_tokens) : '0'}
              </div>
            )}
            <p className="mt-1 text-[var(--text-xs)] text-[var(--color-text-tertiary)]">
              Deliberation budget
            </p>
          </div>
        </div>
      </div>

      {/* ── Main Content Grid (2 Columns on Desktop) ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Sessions (2 spans on lg) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)]">
                Recent Sessions
              </h2>
              <span className="text-[var(--text-xs)] text-[var(--color-text-tertiary)] font-mono px-2 py-0.5 rounded-full bg-[var(--color-bg-tertiary)]">
                {sessions.length}
              </span>
            </div>
            <Link
              href="/history"
              className="inline-flex items-center gap-1 text-[var(--text-xs)] font-medium text-[var(--color-accent)] hover:underline"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] overflow-hidden shadow-[var(--shadow-xs)]">
            {sessionsLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-3/4 skeleton" />
                      <div className="h-3 w-1/3 skeleton" />
                    </div>
                    <div className="h-6 w-16 skeleton rounded-full" />
                  </div>
                ))}
              </div>
            ) : recentSessions.length === 0 ? (
              /* Empty state */
              <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)] flex items-center justify-center mb-3">
                  <Bot className="w-6 h-6 text-[var(--color-text-quaternary)]" />
                </div>
                <h3 className="text-[var(--text-base)] font-medium text-[var(--color-text-primary)]">
                  No sessions yet
                </h3>
                <p className="mt-1 text-[var(--text-xs)] text-[var(--color-text-tertiary)] max-w-sm">
                  Launch your first Monte Carlo reasoning run to explore decision paths and
                  inspect node evaluations in real-time.
                </p>
                <Link href="/new" className="mt-4">
                  <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
                    Start First Session
                  </Button>
                </Link>
              </div>
            ) : (
              /* Sessions list */
              <div className="divide-y divide-[var(--color-border-secondary)]">
                {recentSessions.map((session) => {
                  const badge =
                    statusBadgeStyles[session.status] || statusBadgeStyles.pending;
                  return (
                    <Link
                      key={session.id}
                      href={`/workspace?session=${session.id}`}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-[var(--color-bg-hover)] transition-colors gap-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-[var(--text-sm)] font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors truncate">
                            {session.title || 'Untitled Session'}
                          </h4>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0',
                              badge.bg,
                              badge.text,
                            )}
                          >
                            <span className={cn('w-1.5 h-1.5 rounded-full', badge.dot)} />
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-[var(--text-xs)] text-[var(--color-text-secondary)] line-clamp-1">
                          {truncate(session.task, 110)}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--color-text-tertiary)] pt-0.5">
                          {session.config?.generator_model && (
                            <span className="font-mono flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-border-primary)]" />
                              {session.config.generator_model}
                            </span>
                          )}
                          <span>•</span>
                          <span>{formatRelativeTime(session.created_at)}</span>
                          {session.duration_seconds !== undefined && (
                            <>
                              <span>•</span>
                              <span>{formatDuration(session.duration_seconds)}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0">
                        <span className="text-[var(--text-xs)] font-medium text-[var(--color-accent)] group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                          View
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: System Status + Quick Actions */}
        <div className="space-y-6">
          {/* System Status Panel */}
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-5 shadow-[var(--shadow-xs)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[var(--text-sm)] font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                <Server className="w-4 h-4 text-[var(--color-accent)]" />
                System Health
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => checkHealth()}
                title="Refresh health"
                loading={healthChecking}
                className="w-7 h-7"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="space-y-3">
              {/* Backend Connectivity */}
              <div className="flex items-center justify-between p-3 rounded-[var(--radius-lg)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)]">
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      backendOnline
                        ? 'bg-[var(--color-success)]'
                        : 'bg-[var(--color-error)]',
                    )}
                  />
                  <div>
                    <p className="text-[var(--text-xs)] font-medium text-[var(--color-text-primary)]">
                      Backend Server
                    </p>
                    <p className="text-[10px] text-[var(--color-text-tertiary)] font-mono">
                      {backendOnline
                        ? `Online · v${backendVersion || '0.1.0'}`
                        : 'Offline / unreachable'}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    'text-[10px] font-medium px-2 py-0.5 rounded-full',
                    backendOnline
                      ? 'bg-[var(--color-success-subtle)] text-[var(--color-success-text)]'
                      : 'bg-[var(--color-error-subtle)] text-[var(--color-error-text)]',
                  )}
                >
                  {backendOnline ? 'Healthy' : 'Disconnected'}
                </span>
              </div>

              {/* Providers Status */}
              <div className="flex items-center justify-between p-3 rounded-[var(--radius-lg)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)]">
                <div className="flex items-center gap-2.5">
                  <FlaskConical className="w-4 h-4 text-[var(--color-accent)]" />
                  <div>
                    <p className="text-[var(--text-xs)] font-medium text-[var(--color-text-primary)]">
                      Configured Providers
                    </p>
                    <p className="text-[10px] text-[var(--color-text-tertiary)]">
                      {providersLoading
                        ? 'Checking providers…'
                        : `${configuredProvidersCount} of ${providers.length || 3} configured`}
                    </p>
                  </div>
                </div>
                <Link href="/models">
                  <span className="text-[10px] font-medium text-[var(--color-accent)] hover:underline flex items-center gap-0.5">
                    Manage
                    <ExternalLink className="w-2.5 h-2.5" />
                  </span>
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="space-y-3">
            <h3 className="text-[var(--text-xs)] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/new"
                className="group p-3.5 rounded-[var(--radius-lg)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-hover)] transition-all flex flex-col justify-between shadow-[var(--shadow-xs)]"
              >
                <div className="w-7 h-7 rounded-[var(--radius-md)] bg-[var(--color-accent-subtle)] text-[var(--color-accent)] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-[var(--text-xs)] font-semibold text-[var(--color-text-primary)]">
                    New Session
                  </h4>
                  <p className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">
                    Start MCTS tree
                  </p>
                </div>
              </Link>

              <Link
                href="/history"
                className="group p-3.5 rounded-[var(--radius-lg)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-hover)] transition-all flex flex-col justify-between shadow-[var(--shadow-xs)]"
              >
                <div className="w-7 h-7 rounded-[var(--radius-md)] bg-purple-500/10 text-purple-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-[var(--text-xs)] font-semibold text-[var(--color-text-primary)]">
                    View History
                  </h4>
                  <p className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">
                    Browse past runs
                  </p>
                </div>
              </Link>

              <Link
                href="/models"
                className="group p-3.5 rounded-[var(--radius-lg)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-hover)] transition-all flex flex-col justify-between shadow-[var(--shadow-xs)]"
              >
                <div className="w-7 h-7 rounded-[var(--radius-md)] bg-emerald-500/10 text-[var(--color-success)] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <FlaskConical className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-[var(--text-xs)] font-semibold text-[var(--color-text-primary)]">
                    Model Lab
                  </h4>
                  <p className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">
                    Configure API keys
                  </p>
                </div>
              </Link>

              <Link
                href="/settings"
                className="group p-3.5 rounded-[var(--radius-lg)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-hover)] transition-all flex flex-col justify-between shadow-[var(--shadow-xs)]"
              >
                <div className="w-7 h-7 rounded-[var(--radius-md)] bg-amber-500/10 text-[var(--color-warning)] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-[var(--text-xs)] font-semibold text-[var(--color-text-primary)]">
                    Settings
                  </h4>
                  <p className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">
                    Preferences & MCTS
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
