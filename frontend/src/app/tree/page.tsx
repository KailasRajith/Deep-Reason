/* ============================================================
   DEEP REASON — Exploration Tree (/tree)
   Dedicated full-screen MCTS tree visualization with session
   selector, interactive zoom/pan controls, and deep tree metrics.
   ============================================================ */
'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSessionsStore, useExecutionStore } from '@/lib/store';
import { ReasoningTree } from '@/components/reasoning/reasoning-tree';
import { Button } from '@/components/ui/button';
import { cn, formatScore, truncate } from '@/lib/utils';
import type { MCTSNode } from '@/types';
import {
  GitFork,
  Layers,
  ChevronDown,
  Sparkles,
  BarChart3,
  Bot,
  X,
  Play,
  ArrowRight,
  ExternalLink,
  Info,
  CheckCircle2,
} from 'lucide-react';

function TreeExplorerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');

  const { sessions, fetchSessions, currentSession, fetchSession } = useSessionsStore();
  const {
    treeData,
    treeLoading,
    fetchTree,
    selectedNodeId,
    selectNode,
  } = useExecutionStore();

  const [activeSessionId, setActiveSessionId] = useState<string>(sessionId || '');
  const [showNodeModal, setShowNodeModal] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    if (sessionId) {
      setActiveSessionId(sessionId);
      fetchSession(sessionId);
      fetchTree(sessionId);
    } else if (sessions.length > 0 && !activeSessionId) {
      const preferred = sessions.find((s) => (s.node_count ?? 0) > 0) || sessions[0];
      setActiveSessionId(preferred.id);
      router.replace(`/tree?session=${preferred.id}`);
    }
  }, [sessionId, sessions, activeSessionId, fetchSession, fetchTree, router]);

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    router.push(`/tree?session=${id}`);
  };

  const selectedNode: MCTSNode | undefined = treeData?.nodes.find(
    (n) => n.id === selectedNodeId,
  );

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height))] bg-[var(--color-bg-primary)] overflow-hidden">
      {/* ── Top Bar: Session Selector & Tree Stats Summary ──── */}
      <div className="h-14 px-4 sm:px-6 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] flex flex-wrap items-center justify-between gap-3 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <GitFork className="w-5 h-5 text-[var(--color-accent)]" />
            <span className="text-[var(--text-sm)] font-semibold text-[var(--color-text-primary)] hidden sm:inline">
              Tree Explorer
            </span>
          </div>

          {/* Session Dropdown */}
          <div className="relative">
            <select
              value={activeSessionId}
              onChange={(e) => handleSelectSession(e.target.value)}
              className="px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] text-[var(--text-xs)] text-[var(--color-text-primary)] font-medium max-w-[220px] sm:max-w-xs truncate cursor-pointer focus:border-[var(--color-border-focus)]"
            >
              {sessions.length === 0 && (
                <option value="">No sessions available</option>
              )}
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title || 'Untitled Session'} ({s.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tree Stats Pills */}
        <div className="flex items-center gap-2 text-[var(--text-xs)] font-mono">
          {treeData?.stats && (
            <div className="hidden md:flex items-center gap-3 px-3 py-1 rounded-[var(--radius-lg)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)] text-[var(--color-text-tertiary)]">
              <span>Nodes: <strong className="text-[var(--color-text-primary)]">{treeData.stats.total_nodes}</strong></span>
              <span>Max Depth: <strong className="text-[var(--color-text-primary)]">{treeData.stats.max_depth}</strong></span>
              <span>Visits: <strong className="text-[var(--color-text-primary)]">{treeData.stats.total_visits}</strong></span>
              <span>Pruned: <strong className="text-[var(--color-text-primary)]">{treeData.stats.pruned_count}</strong></span>
            </div>
          )}

          {activeSessionId && (
            <Link href={`/workspace?session=${activeSessionId}`}>
              <Button variant="outline" size="sm" iconRight={<ExternalLink className="w-3 h-3" />}>
                Workspace
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* ── Main Tree Visualizer Area ───────────────────────── */}
      <div className="flex-1 relative min-h-0 bg-[var(--color-bg-primary)]">
        {!activeSessionId || sessions.length === 0 ? (
          /* Empty State: No session selected */
          <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-fade-in">
            <div className="w-14 h-14 rounded-[var(--radius-2xl)] bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] flex items-center justify-center mb-4 shadow-sm">
              <GitFork className="w-7 h-7 text-[var(--color-accent)]" />
            </div>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
              Select a Session to Explore
            </h2>
            <p className="mt-1 text-[var(--text-sm)] text-[var(--color-text-secondary)] max-w-sm">
              Choose an existing deliberation run from the dropdown above or launch a new reasoning task.
            </p>
            <Link href="/new" className="mt-5">
              <Button variant="primary" size="md" icon={<Sparkles className="w-4 h-4" />}>
                Start New Session
              </Button>
            </Link>
          </div>
        ) : (
          /* React Flow Tree Component */
          <div className="h-full w-full relative">
            <ReasoningTree
              treeData={treeData}
              loading={treeLoading}
              onNodeSelect={(nodeId) => {
                selectNode(nodeId);
                setShowNodeModal(true);
              }}
            />

            {/* Floating Node Details Card when clicked */}
            {selectedNode && showNodeModal && (
              <div className="absolute right-4 bottom-4 w-96 max-w-[calc(100vw-2rem)] rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] shadow-xl p-5 space-y-3 z-20 animate-slide-up">
                <div className="flex items-center justify-between border-b border-[var(--color-border-secondary)] pb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full',
                        selectedNode.is_best_path
                          ? 'bg-[var(--color-success)]'
                          : 'bg-[var(--color-accent)]',
                      )}
                    />
                    <h4 className="text-[var(--text-xs)] font-semibold text-[var(--color-text-primary)]">
                      Node Depth {selectedNode.depth}
                    </h4>
                  </div>
                  <button
                    onClick={() => setShowNodeModal(false)}
                    className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                  <div className="p-2 rounded bg-[var(--color-bg-tertiary)]">
                    <span className="text-[var(--color-text-tertiary)] block">Visits</span>
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      {selectedNode.visits}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-[var(--color-bg-tertiary)]">
                    <span className="text-[var(--color-text-tertiary)] block">Value (Q)</span>
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      {selectedNode.avg_value > 0
                        ? formatScore(selectedNode.avg_value)
                        : '—'}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-[var(--color-bg-tertiary)]">
                    <span className="text-[var(--color-text-tertiary)] block">Status</span>
                    <span className="font-semibold capitalize text-[var(--color-text-primary)]">
                      {selectedNode.status}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-[var(--color-text-tertiary)]">
                    Reasoning Thought
                  </span>
                  <div className="p-2.5 rounded bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)] text-[11px] font-mono text-[var(--color-text-primary)] leading-relaxed max-h-36 overflow-y-auto">
                    {selectedNode.state || '(Root node)'}
                  </div>
                </div>

                {selectedNode.evaluator_feedback && (
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-[var(--color-text-tertiary)]">
                      Critique
                    </span>
                    <p className="text-[11px] text-[var(--color-text-secondary)] line-clamp-2">
                      {selectedNode.evaluator_feedback}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TreePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[calc(100vh-var(--header-height))]">
          <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <TreeExplorerContent />
    </Suspense>
  );
}
