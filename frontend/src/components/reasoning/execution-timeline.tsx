/* ============================================================
   DEEP REASON — Execution Timeline
   Real-time event feed during MCTS execution.
   ============================================================ */
'use client';

import React, { useRef, useEffect } from 'react';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { TimelineEvent, WSEventType } from '@/types';
import { useSettingsStore } from '@/lib/store';
import {
  Play,
  Target,
  GitBranch,
  Sparkles,
  CheckCircle2,
  BarChart2,
  Scissors,
  ArrowLeft,
  XCircle,
  CircleDot,
  Loader2,
  Zap,
} from 'lucide-react';

const eventConfig: Record<
  WSEventType,
  {
    icon: React.ElementType;
    color: string;
    bg: string;
  }
> = {
  session_started: {
    icon: Play,
    color: 'var(--color-accent)',
    bg: 'var(--color-accent-subtle)',
  },
  iteration_started: {
    icon: Loader2,
    color: 'var(--color-info)',
    bg: 'var(--color-info-subtle)',
  },
  node_selected: {
    icon: Target,
    color: 'var(--color-accent)',
    bg: 'var(--color-accent-subtle)',
  },
  node_expanded: {
    icon: GitBranch,
    color: 'var(--color-info)',
    bg: 'var(--color-info-subtle)',
  },
  candidate_generated: {
    icon: Sparkles,
    color: 'var(--color-accent)',
    bg: 'var(--color-accent-subtle)',
  },
  candidate_evaluated: {
    icon: BarChart2,
    color: 'var(--color-warning)',
    bg: 'var(--color-warning-subtle)',
  },
  simulation_completed: {
    icon: Zap,
    color: 'var(--color-info)',
    bg: 'var(--color-info-subtle)',
  },
  reward_propagated: {
    icon: ArrowLeft,
    color: 'var(--color-success)',
    bg: 'var(--color-success-subtle)',
  },
  branch_pruned: {
    icon: Scissors,
    color: 'var(--color-warning)',
    bg: 'var(--color-warning-subtle)',
  },
  iteration_completed: {
    icon: CheckCircle2,
    color: 'var(--color-success)',
    bg: 'var(--color-success-subtle)',
  },
  search_completed: {
    icon: CircleDot,
    color: 'var(--color-success)',
    bg: 'var(--color-success-subtle)',
  },
  error: {
    icon: XCircle,
    color: 'var(--color-error)',
    bg: 'var(--color-error-subtle)',
  },
  heartbeat: {
    icon: CircleDot,
    color: 'var(--color-text-quaternary)',
    bg: 'var(--color-bg-tertiary)',
  },
};

interface ExecutionTimelineProps {
  events: TimelineEvent[];
  onEventClick?: (event: TimelineEvent) => void;
  className?: string;
  maxHeight?: string;
}

export function ExecutionTimeline({
  events,
  onEventClick,
  className,
  maxHeight = '100%',
}: ExecutionTimelineProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const autoScroll = useSettingsStore((s) => s.settings.auto_scroll_timeline);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events.length, autoScroll]);

  if (events.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center h-full',
          'text-[var(--color-text-tertiary)]',
          className,
        )}
      >
        <div className="flex flex-col items-center gap-2 text-center px-6">
          <Play className="w-5 h-5 text-[var(--color-text-quaternary)]" />
          <p className="text-[var(--text-xs)]">
            Execution events will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('overflow-y-auto', className)}
      style={{ maxHeight }}
    >
      <div className="px-3 py-2 space-y-0.5">
        {events.map((event, index) => {
          const config = eventConfig[event.type] || eventConfig.heartbeat;
          const Icon = config.icon;
          const isLast = index === events.length - 1;

          return (
            <button
              key={event.id}
              onClick={() => onEventClick?.(event)}
              className={cn(
                'flex items-start gap-2.5 w-full px-2 py-1.5 rounded-[var(--radius-md)]',
                'hover:bg-[var(--color-bg-hover)] transition-colors text-left',
                'cursor-pointer',
                isLast && 'animate-slide-up',
              )}
            >
              {/* Icon */}
              <div
                className="w-5 h-5 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0 mt-0.5"
                style={{ backgroundColor: config.bg }}
              >
                <Icon
                  className="w-3 h-3"
                  style={{ color: config.color }}
                  strokeWidth={2}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-[var(--text-xs)] text-[var(--color-text-primary)] leading-snug">
                  {event.message}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-[var(--color-text-quaternary)]">
                    {formatRelativeTime(event.timestamp)}
                  </span>
                  {event.node_id && (
                    <span className="text-[10px] font-mono text-[var(--color-text-quaternary)]">
                      {event.node_id.slice(0, 6)}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
