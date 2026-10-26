/* ============================================================
   DEEP REASON — Council Workspace Component
   Apple-inspired, multi-panel workspace for reviewing Council deliberation:
   - Run overview with live phase stepper
   - Evidence-aware final synthesis
   - Independent model candidate responses
   - Comparison matrix (agreements, contradictions, minority viewpoints)
   - Targeted peer critiques and resolution rationale
   - Candidate lineage & refinement versioning
   ============================================================ */
'use client';

import React, { useState } from 'react';
import type {
  CouncilRunState,
  CandidateResponse,
  CritiqueResult,
  ComparisonFinding,
  OperatingMode,
  CouncilRunStatus
} from '@/types';
import { Button } from '@/components/ui/button';
import { cn, formatCompact, formatDuration } from '@/lib/utils';
import {
  Sparkles,
  Layers,
  Scale,
  ShieldCheck,
  GitCommit,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Coins,
  Cpu,
  Brain,
  Zap,
  ArrowRight,
  Info,
  RotateCw,
  ExternalLink,
  ChevronRight,
  FileText
} from 'lucide-react';

interface CouncilWorkspaceProps {
  run: CouncilRunState;
  onCancel?: () => void;
  onRerun?: () => void;
}

const statusBadgeStyles: Record<CouncilRunStatus, { bg: string; text: string; dot: string; label: string }> = {
  queued: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', dot: 'bg-zinc-400', label: 'Queued' },
  generating: { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-500 animate-pulse', label: 'Generating Answers' },
  comparing: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', dot: 'bg-indigo-500 animate-pulse', label: 'Comparing Claims' },
  critiquing: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-500 animate-pulse', label: 'Peer Critique' },
  refining: { bg: 'bg-purple-500/10', text: 'text-purple-400', dot: 'bg-purple-500 animate-pulse', label: 'Refining Candidates' },
  synthesizing: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', dot: 'bg-cyan-500 animate-pulse', label: 'Synthesizing' },
  completed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-500', label: 'Completed' },
  partially_completed: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-500', label: 'Partial Completion' },
  failed: { bg: 'bg-rose-500/10', text: 'text-rose-400', dot: 'bg-rose-500', label: 'Failed' },
  cancelled: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', dot: 'bg-zinc-400', label: 'Cancelled' },
};

const phaseSteps: { key: CouncilRunStatus; label: string }[] = [
  { key: 'generating', label: 'Independent Generation' },
  { key: 'comparing', label: 'Claim Comparison' },
  { key: 'critiquing', label: 'Targeted Critique' },
  { key: 'refining', label: 'Refinement' },
  { key: 'synthesizing', label: 'Final Synthesis' },
];

export function CouncilWorkspace({ run, onCancel, onRerun }: CouncilWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'synthesis' | 'models' | 'comparison' | 'critiques' | 'history'>('synthesis');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    run.candidates[0]?.id || null
  );

  const isCompleted = ['completed', 'partially_completed'].includes(run.status);
  const isRunning = ['queued', 'generating', 'comparing', 'critiquing', 'refining', 'synthesizing'].includes(run.status);
  const badge = statusBadgeStyles[run.status] || statusBadgeStyles.queued;

  const selectedCandidate = run.candidates.find((c) => c.id === selectedCandidateId) || run.candidates[0] || null;

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-primary)] overflow-hidden">
      {/* ── Top Header & Mode Banner ────────────────────────────── */}
      <div className="px-4 py-3.5 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-accent-subtle)] text-[var(--color-accent)] flex items-center justify-center font-bold text-xs uppercase">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[var(--text-sm)] font-semibold text-[var(--color-text-primary)]">
                {run.title}
              </h2>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider',
                  badge.bg,
                  badge.text
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full', badge.dot)} />
                {badge.label}
              </span>
            </div>
            <p className="text-[11px] text-[var(--color-text-secondary)] line-clamp-1 mt-0.5">
              Task: {run.task}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isRunning && onCancel && (
            <Button variant="danger" size="sm" onClick={onCancel}>
              Cancel Deliberation
            </Button>
          )}
          {isCompleted && onRerun && (
            <Button variant="outline" size="sm" onClick={onRerun} icon={<RotateCw className="w-3.5 h-3.5" />}>
              Re-run Council
            </Button>
          )}
        </div>
      </div>

      {/* ── Live Deliberation Phase Stepper ─────────────────────── */}
      <div className="px-4 py-2 border-b border-[var(--color-border-secondary)] bg-[var(--color-bg-tertiary)]/50 shrink-0">
        <div className="flex items-center justify-between gap-2 overflow-x-auto text-[11px] font-mono">
          {phaseSteps.map((step, idx) => {
            const currentIdx = phaseSteps.findIndex((p) => p.key === run.status);
            const isPast = isCompleted || (currentIdx > idx);
            const isCurrent = run.status === step.key;

            return (
              <div key={step.key} className="flex items-center gap-2 shrink-0">
                <div
                  className={cn(
                    'flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-sm)] transition-colors',
                    isCurrent
                      ? 'bg-[var(--color-accent)] text-white font-semibold shadow-sm'
                      : isPast
                      ? 'bg-[var(--color-success-subtle)] text-[var(--color-success-text)]'
                      : 'text-[var(--color-text-tertiary)] bg-[var(--color-bg-secondary)]'
                  )}
                >
                  <span className="text-[9px]">{idx + 1}.</span>
                  <span>{step.label}</span>
                </div>
                {idx < phaseSteps.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-[var(--color-text-quaternary)]" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Main Workspace Navigation Tabs ──────────────────────── */}
      <div className="flex border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] px-4 shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('synthesis')}
            className={cn(
              'px-3 py-2 text-[var(--text-xs)] font-medium border-b-2 transition-all flex items-center gap-1.5',
              activeTab === 'synthesis'
                ? 'border-[var(--color-accent)] text-[var(--color-accent)] font-semibold'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Final Synthesis</span>
            {run.synthesis && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] ml-0.5" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('models')}
            className={cn(
              'px-3 py-2 text-[var(--text-xs)] font-medium border-b-2 transition-all flex items-center gap-1.5',
              activeTab === 'models'
                ? 'border-[var(--color-accent)] text-[var(--color-accent)] font-semibold'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Independent Models</span>
            <span className="text-[10px] font-mono px-1 rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]">
              {run.candidates.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('comparison')}
            className={cn(
              'px-3 py-2 text-[var(--text-xs)] font-medium border-b-2 transition-all flex items-center gap-1.5',
              activeTab === 'comparison'
                ? 'border-[var(--color-accent)] text-[var(--color-accent)] font-semibold'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            )}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Council Comparison</span>
            {run.comparison_matrix && (
              <span className="text-[10px] font-mono px-1 rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]">
                {run.comparison_matrix.findings.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('critiques')}
            className={cn(
              'px-3 py-2 text-[var(--text-xs)] font-medium border-b-2 transition-all flex items-center gap-1.5',
              activeTab === 'critiques'
                ? 'border-[var(--color-accent)] text-[var(--color-accent)] font-semibold'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            )}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Peer Critiques</span>
            <span className="text-[10px] font-mono px-1 rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]">
              {run.critiques.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              'px-3 py-2 text-[var(--text-xs)] font-medium border-b-2 transition-all flex items-center gap-1.5',
              activeTab === 'history'
                ? 'border-[var(--color-accent)] text-[var(--color-accent)] font-semibold'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            )}
          >
            <GitCommit className="w-3.5 h-3.5" />
            <span>Candidate Lineage</span>
            <span className="text-[10px] font-mono px-1 rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]">
              {run.refinements.length}
            </span>
          </button>
        </div>
      </div>

      {/* ── Active Tab Content Area ─────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
        {/* ── Tab 1: Final Synthesis ────────────────────────────── */}
        {activeTab === 'synthesis' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            {run.synthesis ? (
              <>
                {/* MCTS Notice if in Deep Reasoning mode */}
                {run.synthesis.mcts_pending_notice && (
                  <div className="p-3.5 rounded-[var(--radius-lg)] bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[var(--text-xs)] flex items-start gap-2.5">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Deep Reasoning Mode (Phase 2 Baseline):</p>
                      <p className="mt-0.5 leading-relaxed text-[11px] text-amber-400">
                        {run.synthesis.mcts_pending_notice}
                      </p>
                    </div>
                  </div>
                )}

                {/* Synthesis Card */}
                <div className="p-6 rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b border-[var(--color-border-secondary)] pb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[var(--color-accent)]" />
                      <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                        Council Evidence Synthesis
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--color-text-secondary)]">
                      <span className="px-2 py-0.5 rounded bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)]">
                        {run.synthesis.confidence_assessment}
                      </span>
                      <span>·</span>
                      <span>{run.synthesis.total_latency_ms}ms</span>
                    </div>
                  </div>

                  {/* Synthesized Answer Body */}
                  <div className="prose prose-invert max-w-none text-[var(--text-sm)] text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap font-sans">
                    {run.synthesis.final_answer}
                  </div>

                  {/* Metadata Matrix */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[var(--color-border-secondary)]">
                    {/* Supporting Claims */}
                    {run.synthesis.key_supporting_claims.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-[var(--color-success)]" />
                          Validated Supporting Claims
                        </span>
                        <ul className="space-y-1 text-[11px] text-[var(--color-text-secondary)]">
                          {run.synthesis.key_supporting_claims.map((claim, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-[var(--color-text-quaternary)]">•</span>
                              <span>{claim}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Unresolved Disagreements / Assumptions */}
                    {run.synthesis.important_assumptions.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-[var(--color-warning)]" />
                          Explicit Assumptions & Nuance
                        </span>
                        <ul className="space-y-1 text-[11px] text-[var(--color-text-secondary)]">
                          {run.synthesis.important_assumptions.map((assump, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-[var(--color-text-quaternary)]">•</span>
                              <span>{assump}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Participating Models Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[var(--color-border-secondary)] text-[10px] text-[var(--color-text-tertiary)]">
                    <div className="flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5" />
                      <span>Council Models:</span>
                      <span className="font-mono text-[var(--color-text-primary)]">
                        {run.synthesis.participating_models.join(', ')}
                      </span>
                    </div>
                    <div>
                      Tokens: {formatCompact(run.synthesis.total_prompt_tokens + run.synthesis.total_completion_tokens)}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-12 text-center rounded-[var(--radius-xl)] border border-[var(--color-border-secondary)] bg-[var(--color-bg-secondary)] flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 rounded-full border-2 border-[var(--color-accent)] border-t-transparent animate-spin" />
                <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Council Deliberation In Progress…
                </h4>
                <p className="text-xs text-[var(--color-text-secondary)] max-w-sm">
                  Models are currently formulating independent reasoning paths and reviewing peer claims. Synthesis will finalize shortly.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Tab 2: Independent Models ─────────────────────────── */}
        {activeTab === 'models' && (
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
            {/* Left list of models */}
            <div className="lg:col-span-4 space-y-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                Participating Models ({run.candidates.length})
              </span>
              <div className="space-y-2">
                {run.candidates.map((cand) => {
                  const isSelected = cand.id === selectedCandidate?.id;
                  return (
                    <div
                      key={cand.id}
                      onClick={() => setSelectedCandidateId(cand.id)}
                      className={cn(
                        'p-3.5 rounded-[var(--radius-lg)] border cursor-pointer transition-all space-y-1.5',
                        isSelected
                          ? 'border-[var(--color-accent)] bg-[var(--color-bg-tertiary)] shadow-sm'
                          : 'border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-border-focus)]'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[var(--text-xs)] font-semibold text-[var(--color-text-primary)] font-mono truncate">
                          {cand.model_display_name || cand.model_id}
                        </span>
                        <span
                          className={cn(
                            'text-[9px] px-1.5 py-0.5 rounded font-mono',
                            cand.status === 'success'
                              ? 'bg-[var(--color-success-subtle)] text-[var(--color-success-text)]'
                              : 'bg-[var(--color-error-subtle)] text-[var(--color-error-text)]'
                          )}
                        >
                          {cand.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[var(--color-text-tertiary)] font-mono">
                        <span>v{cand.version}</span>
                        <span>{cand.latency_ms}ms</span>
                        <span>{cand.claims.length} claims</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right inspection of selected candidate */}
            <div className="lg:col-span-8">
              {selectedCandidate ? (
                <div className="p-6 rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] space-y-4">
                  <div className="flex items-center justify-between border-b border-[var(--color-border-secondary)] pb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--color-text-primary)] font-mono">
                        {selectedCandidate.model_display_name || selectedCandidate.model_id}
                      </h4>
                      <p className="text-[10px] text-[var(--color-text-tertiary)] font-mono">
                        Candidate ID: {selectedCandidate.id} · Version {selectedCandidate.version}
                      </p>
                    </div>
                    {selectedCandidate.usage && (
                      <span className="text-[10px] font-mono text-[var(--color-text-secondary)]">
                        {selectedCandidate.usage.total_tokens} tokens
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                      Normalized Model Response
                    </span>
                    <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)] text-[var(--text-xs)] text-[var(--color-text-primary)] whitespace-pre-wrap leading-relaxed font-sans max-h-96 overflow-y-auto">
                      {selectedCandidate.normalized_content}
                    </div>
                  </div>

                  {/* Extracted Claims */}
                  {selectedCandidate.claims.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-[var(--color-border-secondary)]">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                        Extracted Atomic Claims ({selectedCandidate.claims.length})
                      </span>
                      <div className="space-y-1.5">
                        {selectedCandidate.claims.map((claim) => (
                          <div
                            key={claim.id}
                            className="p-2.5 rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)]/60 border border-[var(--color-border-secondary)] text-[11px] flex items-start justify-between gap-2"
                          >
                            <span className="text-[var(--color-text-primary)] leading-normal">
                              {claim.claim_text}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)] capitalize shrink-0 font-mono">
                              {claim.category}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-12 text-center text-zinc-400">No candidate selected.</div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab 3: Comparison Matrix ──────────────────────────── */}
        {activeTab === 'comparison' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            {run.comparison_matrix ? (
              <div className="space-y-4">
                {/* Consensus Ratio Banner */}
                <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                      Deliberation Consensus Ratio
                    </span>
                    <h3 className="text-xl font-bold text-[var(--color-text-primary)] font-mono mt-0.5">
                      {Math.round(run.comparison_matrix.consensus_ratio * 100)}%
                    </h3>
                  </div>
                  <div className="w-48 h-2 rounded-full bg-[var(--color-bg-tertiary)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--color-accent)] transition-all duration-500"
                      style={{ width: `${Math.round(run.comparison_matrix.consensus_ratio * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Findings List */}
                <div className="space-y-3">
                  {run.comparison_matrix.findings.map((f) => (
                    <div
                      key={f.id}
                      className="p-4 rounded-[var(--radius-lg)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'text-[9px] uppercase px-2 py-0.5 rounded font-mono font-semibold',
                              f.category === 'agreement'
                                ? 'bg-[var(--color-success-subtle)] text-[var(--color-success-text)]'
                                : f.category === 'contradiction'
                                ? 'bg-[var(--color-error-subtle)] text-[var(--color-error-text)]'
                                : 'bg-amber-500/10 text-amber-500'
                            )}
                          >
                            {f.category.replace('_', ' ')}
                          </span>
                          <h4 className="text-xs font-semibold text-[var(--color-text-primary)]">
                            {f.title}
                          </h4>
                        </div>
                        <span className="text-[10px] font-mono text-[var(--color-text-tertiary)] uppercase">
                          Severity: {f.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                        {f.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-zinc-400">Comparison analysis pending generation completion.</div>
            )}
          </div>
        )}

        {/* ── Tab 4: Peer Critiques ─────────────────────────────── */}
        {activeTab === 'critiques' && (
          <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
            {run.critiques.length > 0 ? (
              run.critiques.map((crit) => (
                <div
                  key={crit.id}
                  className="p-4 rounded-[var(--radius-lg)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-[var(--color-border-secondary)] pb-2.5">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[var(--color-accent)]" />
                      <span className="text-xs font-semibold text-[var(--color-text-primary)] font-mono">
                        Critic: {crit.critic_model_id}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] uppercase">
                        {crit.objection_category.replace('_', ' ')}
                      </span>
                      <span
                        className={cn(
                          'text-[9px] font-mono px-2 py-0.5 rounded uppercase font-semibold',
                          crit.resolution === 'accepted'
                            ? 'bg-[var(--color-success-subtle)] text-[var(--color-success-text)]'
                            : crit.resolution === 'partially_accepted'
                            ? 'bg-amber-500/10 text-amber-500'
                            : 'bg-zinc-500/10 text-zinc-400'
                        )}
                      >
                        {crit.resolution.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-[11px]">
                    <div className="font-semibold text-[var(--color-text-primary)]">
                      Objection: {crit.objection}
                    </div>
                    <p className="text-[var(--color-text-secondary)] leading-relaxed">
                      {crit.supporting_explanation}
                    </p>
                    {crit.proposed_correction && (
                      <div className="p-2 rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] text-[10px] font-mono mt-1">
                        Proposed Repair: {crit.proposed_correction}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-zinc-400">Peer critiques pending candidate generation.</div>
            )}
          </div>
        )}

        {/* ── Tab 5: Candidate Lineage & Refinements ─────────────── */}
        {activeTab === 'history' && (
          <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
            {run.refinements.length > 0 ? (
              run.refinements.map((ref) => (
                <div
                  key={ref.id}
                  className="p-4 rounded-[var(--radius-lg)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] space-y-2"
                >
                  <div className="flex items-center justify-between border-b border-[var(--color-border-secondary)] pb-2">
                    <span className="text-xs font-semibold text-[var(--color-text-primary)] font-mono">
                      Refinement Round #{ref.round_number}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--color-text-tertiary)]">
                      {ref.original_candidate_id} → {ref.refined_candidate_id}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {ref.refinement_summary}
                  </p>
                  <div className="space-y-1 pt-1">
                    {ref.changes_made.map((change, i) => (
                      <div key={i} className="text-[10px] text-[var(--color-text-primary)] font-mono flex items-center gap-1.5">
                        <ArrowRight className="w-3 h-3 text-[var(--color-accent)] shrink-0" />
                        <span>{change}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-zinc-400">No candidate refinements recorded yet.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
