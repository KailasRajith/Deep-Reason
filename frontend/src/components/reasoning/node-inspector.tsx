/* ============================================================
   DEEP REASON — Node Inspector Panel
   Detailed view of a selected MCTS node.
   ============================================================ */
'use client';

import React from 'react';
import { cn, formatScore, formatRelativeTime, copyToClipboard } from '@/lib/utils';
import type { MCTSNode } from '@/types';
import {
  GitBranch,
  Eye,
  Award,
  ChevronRight,
  Copy,
  Check,
  Clock,
  Layers,
  BarChart2,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NodeInspectorProps {
  node: MCTSNode | null;
  onNavigateToNode?: (nodeId: string) => void;
  className?: string;
}

export function NodeInspector({
  node,
  onNavigateToNode,
  className,
}: NodeInspectorProps) {
  const [copied, setCopied] = React.useState(false);

  if (!node) {
    return (
      <div
        className={cn(
          'flex items-center justify-center h-full text-center',
          'text-[var(--color-text-tertiary)]',
          className,
        )}
      >
        <div className="flex flex-col items-center gap-3 px-6">
          <div className="w-10 h-10 rounded-[var(--radius-xl)] bg-[var(--color-bg-tertiary)] flex items-center justify-center">
            <Eye className="w-5 h-5 text-[var(--color-text-quaternary)]" />
          </div>
          <p className="text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)]">
            Select a node
          </p>
          <p className="text-[var(--text-xs)] max-w-[200px]">
            Click on any node in the tree to inspect its details.
          </p>
        </div>
      </div>
    );
  }

  const handleCopy = async (text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const statusConfig: Record<
    string,
    { color: string; bg: string; label: string }
  > = {
    unexplored: {
      color: 'var(--color-text-quaternary)',
      bg: 'var(--color-bg-tertiary)',
      label: 'Unexplored',
    },
    exploring: {
      color: 'var(--color-accent)',
      bg: 'var(--color-accent-subtle)',
      label: 'Exploring',
    },
    expanded: {
      color: 'var(--color-info)',
      bg: 'var(--color-info-subtle)',
      label: 'Expanded',
    },
    evaluated: {
      color: 'var(--color-info)',
      bg: 'var(--color-info-subtle)',
      label: 'Evaluated',
    },
    completed: {
      color: 'var(--color-success)',
      bg: 'var(--color-success-subtle)',
      label: 'Completed',
    },
    pruned: {
      color: 'var(--color-warning)',
      bg: 'var(--color-warning-subtle)',
      label: 'Pruned',
    },
    failed: {
      color: 'var(--color-error)',
      bg: 'var(--color-error-subtle)',
      label: 'Failed',
    },
  };

  const status = statusConfig[node.status] || statusConfig.unexplored;

  return (
    <div
      className={cn(
        'overflow-y-auto',
        className,
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--color-border-secondary)]">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[var(--text-sm)] font-semibold text-[var(--color-text-primary)]">
            Node Inspector
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleCopy(node.id)}
            title="Copy node ID"
            className="w-6 h-6"
          >
            {copied ? (
              <Check className="w-3 h-3 text-[var(--color-success)]" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-full)] text-[10px] font-medium"
            style={{ color: status.color, backgroundColor: status.bg }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: status.color }}
            />
            {status.label}
          </span>
          <span className="text-[10px] font-mono text-[var(--color-text-quaternary)]">
            {node.id.slice(0, 8)}…
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div className="px-4 py-3 border-b border-[var(--color-border-secondary)]">
        <div className="grid grid-cols-2 gap-3">
          <MetricItem
            icon={<Layers className="w-3 h-3" />}
            label="Depth"
            value={node.depth.toString()}
          />
          <MetricItem
            icon={<Eye className="w-3 h-3" />}
            label="Visits"
            value={node.visits.toString()}
          />
          <MetricItem
            icon={<Award className="w-3 h-3" />}
            label="Avg Value"
            value={node.avg_value > 0 ? formatScore(node.avg_value) : '—'}
          />
          <MetricItem
            icon={<BarChart2 className="w-3 h-3" />}
            label="UCT Score"
            value={node.uct_score ? formatScore(node.uct_score) : '—'}
          />
          <MetricItem
            icon={<GitBranch className="w-3 h-3" />}
            label="Children"
            value={node.children_ids.length.toString()}
          />
          <MetricItem
            icon={<Clock className="w-3 h-3" />}
            label="Created"
            value={formatRelativeTime(node.created_at)}
          />
        </div>
      </div>

      {/* State / Content */}
      <div className="px-4 py-3 border-b border-[var(--color-border-secondary)]">
        <SectionHeader label="State" />
        <div className="mt-1.5 p-2.5 rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)]">
          <p className="text-[var(--text-xs)] text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap break-words">
            {node.state || 'No state content'}
          </p>
        </div>
      </div>

      {/* Action that led here */}
      {node.action && (
        <div className="px-4 py-3 border-b border-[var(--color-border-secondary)]">
          <SectionHeader label="Action" />
          <p className="mt-1.5 text-[var(--text-xs)] text-[var(--color-text-secondary)] leading-relaxed">
            {node.action}
          </p>
        </div>
      )}

      {/* Evaluator feedback */}
      {node.evaluator_feedback && (
        <div className="px-4 py-3 border-b border-[var(--color-border-secondary)]">
          <SectionHeader label="Evaluator Feedback" icon={<MessageSquare className="w-3 h-3" />} />
          <div className="mt-1.5 p-2.5 rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)]">
            {node.evaluator_score !== undefined && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] text-[var(--color-text-tertiary)]">Score</span>
                <span className="text-[var(--text-xs)] font-mono font-medium text-[var(--color-text-primary)]">
                  {formatScore(node.evaluator_score)}
                </span>
                <ScoreBar score={node.evaluator_score} />
              </div>
            )}
            <p className="text-[var(--text-xs)] text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap">
              {node.evaluator_feedback}
            </p>
          </div>
        </div>
      )}

      {/* Parent navigation */}
      {node.parent_id && (
        <div className="px-4 py-3 border-b border-[var(--color-border-secondary)]">
          <SectionHeader label="Parent" />
          <button
            onClick={() => onNavigateToNode?.(node.parent_id!)}
            className={cn(
              'mt-1.5 flex items-center gap-2 px-2.5 py-1.5 rounded-[var(--radius-md)]',
              'text-[var(--text-xs)] text-[var(--color-text-link)]',
              'hover:bg-[var(--color-bg-hover)] transition-colors w-full cursor-pointer',
            )}
          >
            <span className="font-mono">{node.parent_id.slice(0, 8)}…</span>
            <ChevronRight className="w-3 h-3 ml-auto" />
          </button>
        </div>
      )}

      {/* Children list */}
      {node.children_ids.length > 0 && (
        <div className="px-4 py-3">
          <SectionHeader label={`Children (${node.children_ids.length})`} />
          <div className="mt-1.5 space-y-1">
            {node.children_ids.map((childId) => (
              <button
                key={childId}
                onClick={() => onNavigateToNode?.(childId)}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-1.5 rounded-[var(--radius-md)]',
                  'text-[var(--text-xs)] text-[var(--color-text-link)]',
                  'hover:bg-[var(--color-bg-hover)] transition-colors w-full cursor-pointer',
                )}
              >
                <span className="font-mono">{childId.slice(0, 8)}…</span>
                <ChevronRight className="w-3 h-3 ml-auto" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {node.status === 'pruned' && (
        <div className="px-4 py-3">
          <div className="flex items-start gap-2 p-2.5 rounded-[var(--radius-md)] bg-[var(--color-warning-subtle)]">
            <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-warning)] shrink-0 mt-0.5" />
            <p className="text-[var(--text-xs)] text-[var(--color-warning-text)]">
              This branch was pruned during search due to low estimated value.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────

function MetricItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-[var(--color-text-quaternary)]">{icon}</div>
      <div>
        <p className="text-[10px] text-[var(--color-text-tertiary)]">{label}</p>
        <p className="text-[var(--text-xs)] font-medium text-[var(--color-text-primary)] font-mono">
          {value}
        </p>
      </div>
    </div>
  );
}

function SectionHeader({
  label,
  icon,
}: {
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {icon && <span className="text-[var(--color-text-tertiary)]">{icon}</span>}
      <h4 className="text-[10px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-[var(--tracking-wider)]">
        {label}
      </h4>
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const clampedScore = Math.max(0, Math.min(1, score));
  const color =
    clampedScore >= 0.7
      ? 'var(--color-success)'
      : clampedScore >= 0.4
        ? 'var(--color-warning)'
        : 'var(--color-error)';

  return (
    <div className="flex-1 h-1.5 rounded-full bg-[var(--color-bg-tertiary)] overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-[var(--duration-normal)]"
        style={{
          width: `${clampedScore * 100}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
}
