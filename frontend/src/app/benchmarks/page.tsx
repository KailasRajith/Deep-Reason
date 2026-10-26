/* ============================================================
   DEEP REASON — Evaluation & Benchmarks (/benchmarks)
   Systematic benchmark suite comparing MCTS deliberation strategies,
   latency distributions, model consensus, and pass@k accuracy.
   ============================================================ */
'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Zap,
  GitCompare,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Target,
  Layers,
  FlaskConical,
  Award,
} from 'lucide-react';

const plannedCapabilities = [
  {
    icon: Target,
    title: 'Task Success & Pass@k Tracking',
    badge: 'Accuracy',
    description:
      'Evaluate mathematical problem sets (GSM8K, MATH) and code synthesis benchmarks (HumanEval) with automated grading and pass@k convergence curve generation.',
  },
  {
    icon: Clock,
    title: 'Latency & Phase Distribution',
    badge: 'Performance',
    description:
      'Granular timing breakdown per MCTS phase: Selection (UCT scoring), Expansion (candidate prompt latency), Simulation (rollout depth), and Backpropagation.',
  },
  {
    icon: GitCompare,
    title: 'Head-to-Head Model Comparison',
    badge: 'Multi-Model',
    description:
      'Compare reasoning effectiveness when pairing different generator models (e.g. Claude 3.5 Sonnet) with diverse evaluators (e.g. GPT-4o or DeepSeek V3).',
  },
  {
    icon: TrendingUp,
    title: 'Run Variability & Seed Stability',
    badge: 'Robustness',
    description:
      'Quantify reasoning reproducibility across multiple Monte Carlo seeds, exploration constant (c) variations, and temperatures.',
  },
];

export default function BenchmarksPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border-primary)] pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
            Evaluation & Benchmarks
          </h1>
          <p className="text-[var(--text-sm)] text-[var(--color-text-secondary)] mt-1">
            Empirical rigor and statistical benchmarks for Monte Carlo Tree Search deliberation.
          </p>
        </div>
        <Link href="/new">
          <Button variant="primary" size="md" icon={<Sparkles className="w-4 h-4" />}>
            Run First Benchmark
          </Button>
        </Link>
      </div>

      {/* ── Coming Soon Banner / Hero ──────────────────────────── */}
      <div className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-8 sm:p-12 text-center shadow-[var(--shadow-sm)]">
        <div className="absolute top-0 right-1/2 translate-x-1/2 -mt-20 w-96 h-96 bg-[var(--color-accent-subtle)] rounded-full blur-3xl pointer-events-none opacity-40" />

        <div className="relative max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)] text-[var(--text-xs)] font-medium text-[var(--color-accent)]">
            <Award className="w-3.5 h-3.5" />
            <span>Under Active Development · Version 0.2 Roadmap</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--color-text-primary)]">
            Systematic Deliberation Benchmarking
          </h2>

          <p className="text-[var(--text-sm)] sm:text-[var(--text-base)] text-[var(--color-text-secondary)] leading-relaxed">
            We are designing an automated benchmark harness to run standardized problem
            batteries across varying MCTS hyperparameters, measuring empirical Pareto
            frontiers between inference compute and reasoning fidelity.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <Link href="/new">
              <Button
                variant="primary"
                size="lg"
                iconRight={<ArrowRight className="w-4 h-4" />}
              >
                Launch Single Benchmark Session
              </Button>
            </Link>
            <Link href="/history">
              <Button variant="secondary" size="lg">
                Explore Past Runs
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Planned Capabilities Grid ──────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[var(--color-accent)]" />
          <h3 className="text-[var(--text-base)] font-semibold text-[var(--color-text-primary)]">
            Planned Benchmark Capabilities
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plannedCapabilities.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-6 space-y-3 shadow-[var(--shadow-xs)] hover:border-[var(--color-border-focus)] transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-[var(--radius-lg)] bg-[var(--color-bg-tertiary)] text-[var(--color-accent)] flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-accent)]">
                    {item.badge}
                  </span>
                </div>

                <h4 className="text-[var(--text-sm)] font-semibold text-[var(--color-text-primary)]">
                  {item.title}
                </h4>

                <p className="text-[var(--text-xs)] text-[var(--color-text-secondary)] leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Metric Preview Preview Card ────────────────────────── */}
      <div className="rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-6 space-y-4 shadow-[var(--shadow-xs)]">
        <div className="flex items-center justify-between border-b border-[var(--color-border-secondary)] pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[var(--color-accent)]" />
            <h4 className="text-[var(--text-sm)] font-semibold text-[var(--color-text-primary)]">
              Preview: Deliberation Compute Scaling Law
            </h4>
          </div>
          <span className="text-[10px] font-mono text-[var(--color-text-tertiary)]">
            Simulated Projection
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 rounded-[var(--radius-lg)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)]">
            <span className="text-[10px] uppercase font-semibold text-[var(--color-text-tertiary)] block">
              1 Iteration
            </span>
            <span className="text-lg font-mono font-semibold text-[var(--color-text-primary)]">
              42.4%
            </span>
            <span className="text-[10px] text-[var(--color-text-tertiary)] block">
              Zero-shot baseline
            </span>
          </div>

          <div className="p-3 rounded-[var(--radius-lg)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)]">
            <span className="text-[10px] uppercase font-semibold text-[var(--color-text-tertiary)] block">
              5 Iterations
            </span>
            <span className="text-lg font-mono font-semibold text-[var(--color-text-primary)]">
              68.1%
            </span>
            <span className="text-[10px] text-[var(--color-success)] block font-medium">
              +25.7% accuracy
            </span>
          </div>

          <div className="p-3 rounded-[var(--radius-lg)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)]">
            <span className="text-[10px] uppercase font-semibold text-[var(--color-text-tertiary)] block">
              15 Iterations
            </span>
            <span className="text-lg font-mono font-semibold text-[var(--color-text-primary)]">
              84.9%
            </span>
            <span className="text-[10px] text-[var(--color-success)] block font-medium">
              +42.5% accuracy
            </span>
          </div>

          <div className="p-3 rounded-[var(--radius-lg)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)]">
            <span className="text-[10px] uppercase font-semibold text-[var(--color-text-tertiary)] block">
              30 Iterations
            </span>
            <span className="text-lg font-mono font-semibold text-[var(--color-text-primary)]">
              91.3%
            </span>
            <span className="text-[10px] text-[var(--color-success)] block font-medium">
              Plateau convergence
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
