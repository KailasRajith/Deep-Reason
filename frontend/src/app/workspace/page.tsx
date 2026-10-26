/* ============================================================
   DEEP REASON — Reasoning Workspace (/workspace)
   The signature workspace with a refined three-panel layout:
   Left: Session metadata, controls (Run/Step/Pause/Stop) & live timeline
   Center: Interactive MCTS graph canvas (ReasoningTree)
   Right: Deep node inspector with critique, scores & parent/child navigation
   ============================================================ */
'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  useSessionsStore,
  useExecutionStore,
  useCouncilStore,
} from '@/lib/store';
import {
  formatDuration,
  cn,
} from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ReasoningTree } from '@/components/reasoning/reasoning-tree';
import { NodeInspector } from '@/components/reasoning/node-inspector';
import { ExecutionTimeline } from '@/components/reasoning/execution-timeline';
import { CouncilWorkspace } from '@/components/council/council-workspace';
import type { MCTSNode, SessionStatus } from '@/types';
import {
  Play,
  Square,
  Pause,
  StepForward,
  RefreshCw,
  GitFork,
  ArrowRight,
  Maximize2,
  Sparkles,
  Layers,
  ChevronRight,
  CheckCircle2,
  Brain,
  Scale,
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

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  const councilRunId = searchParams.get('council_run');

  const {
    currentSession,
    loading: sessionLoading,
    fetchSession,
  } = useSessionsStore();

  const {
    currentRun: currentCouncilRun,
    fetchRun: fetchCouncilRun,
    cancelRun: cancelCouncilRun,
    pollRunUntilComplete,
  } = useCouncilStore();

  const [workspaceMode, setWorkspaceMode] = useState<'council' | 'tree'>(
    councilRunId ? 'council' : 'tree'
  );

  const {
    connected,
    executionStatus,
    timeline,
    selectedNodeId,
    treeData,
    treeLoading,
    connectToSession,
    disconnect,
    startExecution,
    pauseExecution,
    resumeExecution,
    stopExecution,
    stepExecution,
    selectNode,
    fetchTree,
  } = useExecutionStore();

  // Mobile navigation tabs
  const [mobileTab, setMobileTab] = useState<'info' | 'tree' | 'inspector'>('tree');
  const [stepLoading, setStepLoading] = useState(false);

  useEffect(() => {
    if (sessionId) {
      fetchSession(sessionId);
      fetchTree(sessionId);
      connectToSession(sessionId);
    }
    return () => {
      disconnect();
    };
  }, [sessionId, fetchSession, fetchTree, connectToSession, disconnect]);

  useEffect(() => {
    if (councilRunId) {
      fetchCouncilRun(councilRunId);
      pollRunUntilComplete(councilRunId);
    }
  }, [councilRunId, fetchCouncilRun, pollRunUntilComplete]);

  const handleStep = async () => {
    if (!sessionId || stepLoading) return;
    setStepLoading(true);
    try {
      await stepExecution(sessionId);
      await fetchSession(sessionId);
    } finally {
      setStepLoading(false);
    }
  };

  const isRunning = executionStatus === 'running';
  const isPaused = executionStatus === 'paused';
  const isCompleted = executionStatus === 'completed' || currentSession?.status === 'completed';

  const selectedNode: MCTSNode | null =
    treeData?.nodes.find((n) => n.id === selectedNodeId) || null;

  const currentStatus: SessionStatus =
    isRunning
      ? 'running'
      : isPaused
      ? 'paused'
      : currentSession?.status || 'pending';

  const badge = statusBadgeStyles[currentStatus] || statusBadgeStyles.pending;

  // Empty state if neither session ID nor council run ID provided
  if (!sessionId && !councilRunId) {
    return (
      <div className="h-[calc(100vh-var(--header-height))] flex flex-col items-center justify-center p-8 text-center animate-fade-in bg-[var(--color-bg-primary)]">
        <div className="w-14 h-14 rounded-[var(--radius-2xl)] bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] flex items-center justify-center mb-4 shadow-sm">
          <GitFork className="w-7 h-7 text-[var(--color-accent)]" />
        </div>
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
          No Reasoning Session Selected
        </h2>
        <p className="mt-1 text-[var(--text-sm)] text-[var(--color-text-secondary)] max-w-sm">
          Select an active session to inspect multi-model Council deliberation or the Monte Carlo Tree Search graph.
        </p>
        <div className="flex items-center gap-3 mt-5">
          <Link href="/new">
            <Button variant="primary" size="md" icon={<Sparkles className="w-4 h-4" />}>
              Create New Session
            </Button>
          </Link>
          <Link href="/history">
            <Button variant="outline" size="md" iconRight={<ArrowRight className="w-3.5 h-3.5" />}>
              Browse History
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height))] bg-[var(--color-bg-primary)] overflow-hidden">
      {/* ── Mode Switcher & Top Header ────────────────────────── */}
      <div className="h-10 px-4 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-1.5 p-0.5 rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)]">
          <button
            onClick={() => setWorkspaceMode('council')}
            className={cn(
              'px-2.5 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium transition-all flex items-center gap-1.5',
              workspaceMode === 'council'
                ? 'bg-[var(--color-bg-secondary)] text-[var(--color-accent)] font-semibold shadow-xs'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            )}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>AI Council Deliberation</span>
            {currentCouncilRun && (
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  ['completed', 'partially_completed'].includes(currentCouncilRun.status)
                    ? 'bg-emerald-500'
                    : 'bg-blue-500 animate-pulse'
                )}
              />
            )}
          </button>
          <button
            onClick={() => setWorkspaceMode('tree')}
            className={cn(
              'px-2.5 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium transition-all flex items-center gap-1.5',
              workspaceMode === 'tree'
                ? 'bg-[var(--color-bg-secondary)] text-[var(--color-accent)] font-semibold shadow-xs'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            )}
          >
            <GitFork className="w-3.5 h-3.5" />
            <span>MCTS Tree Graph ({treeData?.nodes.length || 0})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--color-text-tertiary)]">
          {sessionId && <span>Session: #{sessionId.slice(-6)}</span>}
          {councilRunId && <span>Run: #{councilRunId.slice(-6)}</span>}
        </div>
      </div>

      {/* ── Mode 1: AI Council Deliberation View ─────────────── */}
      {workspaceMode === 'council' && currentCouncilRun ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <CouncilWorkspace
            run={currentCouncilRun}
            onCancel={() => cancelCouncilRun(currentCouncilRun.run_id)}
          />
        </div>
      ) : (
        <>
          {/* ── Mobile Tab Navigation Bar (< 1024px) ─────────────── */}
          <div className="lg:hidden flex border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] px-3 py-1.5 gap-2 shrink-0 z-10">
            <button
              onClick={() => setMobileTab('info')}
              className={cn(
                'flex-1 py-1.5 text-[var(--text-xs)] font-medium rounded-[var(--radius-md)] transition-colors',
                mobileTab === 'info'
                  ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-accent)] shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
              )}
            >
              Controls & Timeline
            </button>
            <button
              onClick={() => setMobileTab('tree')}
              className={cn(
                'flex-1 py-1.5 text-[var(--text-xs)] font-medium rounded-[var(--radius-md)] transition-colors',
                mobileTab === 'tree'
                  ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-accent)] shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
              )}
            >
              Tree Graph ({treeData?.nodes.length || 0})
            </button>
            <button
              onClick={() => setMobileTab('inspector')}
              className={cn(
                'flex-1 py-1.5 text-[var(--text-xs)] font-medium rounded-[var(--radius-md)] transition-colors',
                mobileTab === 'inspector'
                  ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-accent)] shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
              )}
            >
              Node Details {selectedNode ? '●' : ''}
            </button>
          </div>

          {/* ── Main 3-Panel Workspace Grid ──────────────────────── */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-[var(--color-border-primary)]">
        {/* ── Panel 1: Left Controls & Live Timeline (Cols 1-3) ── */}
        <aside
          className={cn(
            'lg:col-span-3 flex flex-col min-h-0 bg-[var(--color-bg-secondary)] overflow-hidden',
            mobileTab === 'info' ? 'flex' : 'hidden lg:flex',
          )}
        >
          {/* Header & Session Metadata */}
          <div className="p-4 border-b border-[var(--color-border-secondary)] space-y-3 shrink-0">
            <div className="flex items-center justify-between gap-2">
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

              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    connected
                      ? 'bg-[var(--color-success)]'
                      : 'bg-[var(--color-error)]',
                  )}
                  title={connected ? 'WS Connection Alive' : 'WS Disconnected'}
                />
                <span className="text-[10px] font-mono text-[var(--color-text-tertiary)]">
                  {connected ? 'WebSocket Live' : 'Disconnected'}
                </span>
              </div>
            </div>

            <div>
              <h2 className="text-[var(--text-sm)] font-semibold text-[var(--color-text-primary)] line-clamp-1">
                {currentSession?.title || 'Reasoning Session'}
              </h2>
              <p className="text-[11px] text-[var(--color-text-secondary)] line-clamp-2 mt-0.5 leading-snug">
                {currentSession?.task}
              </p>
            </div>

            {/* Execution Controls (Run / Pause / Step / Stop) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                {isRunning ? (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1 text-[var(--text-xs)]"
                      onClick={() => pauseExecution()}
                      icon={<Pause className="w-3.5 h-3.5" />}
                    >
                      Pause
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      className="flex-1 text-[var(--text-xs)]"
                      onClick={() => stopExecution()}
                      icon={<Square className="w-3.5 h-3.5 fill-current" />}
                    >
                      Stop
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1 text-[var(--text-xs)]"
                      onClick={() => isPaused ? resumeExecution() : (sessionId && startExecution(sessionId))}
                      icon={<Play className="w-3.5 h-3.5 fill-current" />}
                    >
                      {isPaused ? 'Resume' : isCompleted ? 'Rerun' : 'Start MCTS'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[var(--text-xs)]"
                      onClick={handleStep}
                      loading={stepLoading}
                      title="Step exactly 1 iteration"
                      icon={<StepForward className="w-3.5 h-3.5" />}
                    >
                      Step
                    </Button>
                  </>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (sessionId) {
                      fetchSession(sessionId);
                      fetchTree(sessionId);
                    }
                  }}
                  title="Refresh tree data"
                  className="w-8 h-8 shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Model & Hyperparameter Snapshot */}
          <div className="px-4 py-2.5 border-b border-[var(--color-border-secondary)] bg-[var(--color-bg-tertiary)]/40 shrink-0 text-[10px] space-y-1 font-mono">
            <div className="flex justify-between text-[var(--color-text-tertiary)]">
              <span>Model:</span>
              <span className="text-[var(--color-text-primary)] truncate max-w-[140px]">
                {currentSession?.config?.generator_model || 'Standard'}
              </span>
            </div>
            <div className="flex justify-between text-[var(--color-text-tertiary)]">
              <span>Hyperparams:</span>
              <span className="text-[var(--color-text-primary)]">
                c={currentSession?.config?.exploration_constant ?? 1.414} · k=
                {currentSession?.config?.branching_factor ?? 3} · d=
                {currentSession?.config?.max_depth ?? 5}
              </span>
            </div>
          </div>

          {/* Live Timeline Stream */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="px-4 py-2 border-b border-[var(--color-border-secondary)] flex items-center justify-between shrink-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-[var(--color-accent)]" />
                Live Execution Feed
              </span>
              <span className="text-[10px] font-mono text-[var(--color-text-tertiary)]">
                {timeline.length} events
              </span>
            </div>

            <div className="flex-1 overflow-y-auto">
              <ExecutionTimeline
                events={timeline}
                onEventClick={(evt) => {
                  if (evt.node_id) {
                    selectNode(evt.node_id);
                  }
                }}
              />
            </div>
          </div>
        </aside>

        {/* ── Panel 2: Center Graph Canvas (Cols 4-8 or 4-9) ───── */}
        <main
          className={cn(
            'lg:col-span-6 flex flex-col min-h-0 bg-[var(--color-bg-primary)] overflow-hidden relative',
            mobileTab === 'tree' ? 'flex' : 'hidden lg:flex',
          )}
        >
          {/* Top Bar above Tree Canvas */}
          <div className="h-10 px-4 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] flex items-center justify-between shrink-0 z-10">
            <div className="flex items-center gap-2">
              <GitFork className="w-4 h-4 text-[var(--color-accent)]" />
              <span className="text-[var(--text-xs)] font-semibold text-[var(--color-text-primary)]">
                MCTS Reasoning Tree
              </span>
              <span className="text-[10px] font-mono text-[var(--color-text-tertiary)]">
                ({treeData?.nodes.length || 0} nodes)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/tree?session=${sessionId}`}
                className="text-[10px] font-medium text-[var(--color-accent)] hover:underline flex items-center gap-1"
              >
                <span>Fullscreen</span>
                <Maximize2 className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Tree Component */}
          <div className="flex-1 w-full h-full relative">
            <ReasoningTree
              treeData={treeData}
              loading={treeLoading}
              onNodeSelect={(nodeId) => selectNode(nodeId)}
            />
          </div>
        </main>

        {/* ── Panel 3: Right Node Inspector (Cols 9-12 or 10-12) ─ */}
        <aside
          className={cn(
            'lg:col-span-3 flex flex-col min-h-0 bg-[var(--color-bg-secondary)] overflow-hidden',
            mobileTab === 'inspector' ? 'flex' : 'hidden lg:flex',
          )}
        >
          <div className="h-10 px-4 border-b border-[var(--color-border-primary)] flex items-center justify-between shrink-0">
            <span className="text-[var(--text-xs)] font-semibold text-[var(--color-text-primary)]">
              Node Details & Critique
            </span>
            {selectedNode && (
              <span className="text-[10px] font-mono text-[var(--color-text-tertiary)]">
                #{selectedNode.id.slice(-6)}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            <NodeInspector
              node={selectedNode}
              onNavigateToNode={(nodeId) => selectNode(nodeId)}
            />
          </div>
        </aside>
      </div>
    </>
  )}
</div>
);
}

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="h-[calc(100vh-var(--header-height))] flex items-center justify-center bg-[var(--color-bg-primary)]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
            <span className="text-[var(--text-sm)] text-[var(--color-text-tertiary)]">
              Loading Reasoning Workspace…
            </span>
          </div>
        </div>
      }
    >
      <WorkspaceContent />
    </Suspense>
  );
}
