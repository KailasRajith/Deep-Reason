/* ============================================================
   DEEP REASON — Session History (/history)
   Searchable, filterable session history table & mobile cards
   with status badges, sorting, delete confirmation, and empty states.
   ============================================================ */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSessionsStore } from '@/lib/store';
import {
  formatDuration,
  formatTokens,
  formatRelativeTime,
  formatDateTime,
  truncate,
  cn,
} from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Session, SessionStatus } from '@/types';
import {
  Search,
  Filter,
  ArrowUpDown,
  Trash2,
  ExternalLink,
  History,
  Layers,
  Sparkles,
  AlertTriangle,
  X,
  Plus,
  Clock,
  Coins,
  Bot,
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

export default function HistoryPage() {
  const { sessions, loading, fetchSessions, deleteSession } = useSessionsStore();

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Filtering & Sorting State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'duration' | 'iterations'>('newest');

  // Deletion Modal State
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filtered & Sorted Sessions
  const filteredSessions = useMemo(() => {
    return sessions
      .filter((s) => {
        // Status filter
        if (statusFilter !== 'all' && s.status !== statusFilter) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = s.title?.toLowerCase().includes(q);
          const matchTask = s.task?.toLowerCase().includes(q);
          const matchModel = s.config?.generator_model?.toLowerCase().includes(q);
          if (!matchTitle && !matchTask && !matchModel) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        if (sortBy === 'duration') {
          return (b.duration_seconds || 0) - (a.duration_seconds || 0);
        }
        if (sortBy === 'iterations') {
          return (b.iteration_count || 0) - (a.iteration_count || 0);
        }
        return 0;
      });
  }, [sessions, statusFilter, searchQuery, sortBy]);

  const handleDeleteConfirm = async () => {
    if (!sessionToDelete) return;
    setDeleting(true);
    try {
      await deleteSession(sessionToDelete.id);
      setSessionToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border-primary)] pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
            Session History
          </h1>
          <p className="text-[var(--text-sm)] text-[var(--color-text-secondary)] mt-1">
            Browse, inspect, and analyze all past MCTS deliberation runs and exploration trees.
          </p>
        </div>
        <Link href="/new">
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />}>
            New Session
          </Button>
        </Link>
      </div>

      {/* ── Filters & Controls Bar ─────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[var(--color-bg-secondary)] p-3 rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] shadow-[var(--shadow-xs)]">
        {/* Search input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <input
            type="text"
            placeholder="Search by title, prompt, or model…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] text-[var(--text-sm)] text-[var(--color-text-primary)] placeholder-[var(--color-text-quaternary)] focus:border-[var(--color-border-focus)] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[var(--color-text-tertiary)] shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] text-[var(--text-xs)] text-[var(--color-text-primary)]"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="running">Running</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-[var(--color-text-tertiary)] shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] text-[var(--text-xs)] text-[var(--color-text-primary)]"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="duration">Longest Duration</option>
              <option value="iterations">Most Iterations</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Sessions List / Table ──────────────────────────────── */}
      {loading ? (
        /* Loading skeleton */
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="h-4 w-1/3 skeleton" />
                <div className="h-3 w-2/3 skeleton" />
              </div>
              <div className="h-7 w-20 skeleton rounded-full" />
              <div className="h-7 w-16 skeleton rounded-md" />
            </div>
          ))}
        </div>
      ) : filteredSessions.length === 0 ? (
        /* Empty State */
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-12 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)] flex items-center justify-center mb-3">
            <History className="w-6 h-6 text-[var(--color-text-quaternary)]" />
          </div>
          <h3 className="text-[var(--text-base)] font-medium text-[var(--color-text-primary)]">
            {sessions.length === 0
              ? 'No reasoning sessions yet'
              : 'No matching sessions found'}
          </h3>
          <p className="mt-1 text-[var(--text-xs)] text-[var(--color-text-tertiary)] max-w-sm">
            {sessions.length === 0
              ? 'Start your first MCTS session to build reasoning trees, evaluate hypotheses, and record metrics.'
              : 'Try clearing your filters or adjusting your search term.'}
          </p>
          {sessions.length === 0 ? (
            <Link href="/new" className="mt-4">
              <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
                Create Session
              </Button>
            </Link>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="mt-4"
            >
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] overflow-hidden shadow-[var(--shadow-xs)]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border-primary)] bg-[var(--color-bg-tertiary)]/70 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                  <th className="py-3 px-4 w-[35%]">Session Title / Task</th>
                  <th className="py-3 px-3 w-[11%]">Status</th>
                  <th className="py-3 px-3 w-[16%]">Model</th>
                  <th className="py-3 px-3 w-[10%]">Iterations</th>
                  <th className="py-3 px-3 w-[10%]">Duration</th>
                  <th className="py-3 px-3 w-[10%]">Created</th>
                  <th className="py-3 px-4 w-[8%] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-secondary)] text-[var(--text-xs)]">
                {filteredSessions.map((session) => {
                  const badge =
                    statusBadgeStyles[session.status] || statusBadgeStyles.pending;
                  return (
                    <tr
                      key={session.id}
                      className="hover:bg-[var(--color-bg-hover)] transition-colors group"
                    >
                      {/* Title & Task */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <Link
                          href={`/workspace?session=${session.id}`}
                          className="font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors block truncate"
                        >
                          {session.title || 'Untitled Session'}
                        </Link>
                        <p className="text-[11px] text-[var(--color-text-secondary)] truncate mt-0.5">
                          {truncate(session.task, 75)}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium',
                            badge.bg,
                            badge.text,
                          )}
                        >
                          <span className={cn('w-1.5 h-1.5 rounded-full', badge.dot)} />
                          {badge.label}
                        </span>
                      </td>

                      {/* Model */}
                      <td className="py-3.5 px-3 font-mono text-[11px] text-[var(--color-text-secondary)] whitespace-nowrap">
                        {truncate(session.config?.generator_model || '—', 24)}
                      </td>

                      {/* Iterations */}
                      <td className="py-3.5 px-3 font-mono text-[11px] text-[var(--color-text-secondary)] whitespace-nowrap">
                        {session.iteration_count ?? session.config?.max_iterations ?? '—'}
                      </td>

                      {/* Duration */}
                      <td className="py-3.5 px-3 font-mono text-[11px] text-[var(--color-text-secondary)] whitespace-nowrap">
                        {session.duration_seconds !== undefined
                          ? formatDuration(session.duration_seconds)
                          : '—'}
                      </td>

                      {/* Created */}
                      <td
                        className="py-3.5 px-3 text-[11px] text-[var(--color-text-tertiary)] whitespace-nowrap"
                        title={session.created_at ? formatDateTime(session.created_at) : ''}
                      >
                        {session.created_at ? formatRelativeTime(session.created_at) : '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/workspace?session=${session.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[var(--color-accent)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)]"
                            >
                              View
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSessionToDelete(session)}
                            title="Delete session"
                            className="text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-subtle)] w-7 h-7"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredSessions.map((session) => {
              const badge =
                statusBadgeStyles[session.status] || statusBadgeStyles.pending;
              return (
                <div
                  key={session.id}
                  className="rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-4 space-y-3 shadow-[var(--shadow-xs)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/workspace?session=${session.id}`}
                      className="font-medium text-[var(--text-sm)] text-[var(--color-text-primary)] hover:text-[var(--color-accent)] flex-1 leading-snug"
                    >
                      {session.title || 'Untitled Session'}
                    </Link>
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

                  <p className="text-[var(--text-xs)] text-[var(--color-text-secondary)] line-clamp-2">
                    {session.task}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--color-border-secondary)] text-[11px] text-[var(--color-text-tertiary)]">
                    <span className="font-mono">{session.config?.generator_model}</span>
                    <div className="flex items-center gap-2">
                      {session.duration_seconds !== undefined && (
                        <span>{formatDuration(session.duration_seconds)}</span>
                      )}
                      <span>•</span>
                      <span>{formatRelativeTime(session.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSessionToDelete(session)}
                      className="text-[var(--color-error)] hover:bg-[var(--color-error-subtle)]"
                    >
                      Delete
                    </Button>
                    <Link href={`/workspace?session=${session.id}`}>
                      <Button variant="primary" size="sm">
                        Open Workspace
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Delete Confirmation Dialog / Modal ─────────────────── */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-6 max-w-md w-full shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-error-subtle)] text-[var(--color-error)] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-[var(--text-base)] font-semibold text-[var(--color-text-primary)]">
                  Delete Reasoning Session
                </h3>
                <p className="text-[var(--text-xs)] text-[var(--color-text-secondary)]">
                  Are you sure you want to permanently delete{' '}
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    "{sessionToDelete.title || 'Untitled Session'}"
                  </span>
                  ? This will delete all generated exploration nodes and evaluations.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => setSessionToDelete(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={handleDeleteConfirm}
                loading={deleting}
                icon={<Trash2 className="w-4 h-4" />}
              >
                Delete Session
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
