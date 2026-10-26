/* ============================================================
   DEEP REASON — New Reasoning Session (/new)
   Focused task creation form with generator & evaluator selection,
   advanced MCTS parameter controls, and live summary.
   ============================================================ */
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionsStore, useProvidersStore, useSettingsStore, useCouncilStore } from '@/lib/store';
import type { MCTSConfig, CreateSessionRequest, OperatingMode, ModelSelection } from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Cpu,
  Brain,
  Sliders,
  Info,
  Layers,
  ArrowRight,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Settings2,
  FileText,
  Scale,
  Zap,
  Check,
} from 'lucide-react';

export default function NewSessionPage() {
  const router = useRouter();
  const { createSession } = useSessionsStore();
  const { createRun: createCouncilRun } = useCouncilStore();
  const { providers, loading: providersLoading, fetchProviders } = useProvidersStore();
  const defaultSettingsConfig = useSettingsStore((s) => s.settings.default_config);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  // Operating Mode
  const [operatingMode, setOperatingMode] = useState<OperatingMode>('council');
  const [selectedCouncilModels, setSelectedCouncilModels] = useState<ModelSelection[]>([
    { provider_id: 'openrouter', model_id: 'deepseek/deepseek-r1', display_name: 'DeepSeek R1 (Reasoning)' },
    { provider_id: 'openrouter', model_id: 'anthropic/claude-3.5-sonnet', display_name: 'Claude 3.5 Sonnet' },
    { provider_id: 'gemini', model_id: 'gemini-2.0-flash', display_name: 'Gemini 2.0 Flash' },
    { provider_id: 'openai_compatible', model_id: 'gpt-4o', display_name: 'OpenAI GPT-4o' },
  ]);

  // Form Fields
  const [title, setTitle] = useState('');
  const [task, setTask] = useState('');
  const [context, setContext] = useState('');
  const [constraints, setConstraints] = useState('');
  const [desiredFormat, setDesiredFormat] = useState('');

  // Collapsible sections
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [showAdvancedMCTS, setShowAdvancedMCTS] = useState(false);

  // Model selection
  const [generatorProvider, setGeneratorProvider] = useState('openrouter');
  const [generatorModel, setGeneratorModel] = useState('anthropic/claude-3.5-sonnet');
  const [evaluatorProvider, setEvaluatorProvider] = useState('openrouter');
  const [evaluatorModel, setEvaluatorModel] = useState('openai/gpt-4o');

  // MCTS Configuration
  const [explorationConstant, setExplorationConstant] = useState<number>(
    defaultSettingsConfig?.exploration_constant ?? 1.414,
  );
  const [maxIterations, setMaxIterations] = useState<number>(
    defaultSettingsConfig?.max_iterations ?? 10,
  );
  const [maxDepth, setMaxDepth] = useState<number>(
    defaultSettingsConfig?.max_depth ?? 5,
  );
  const [branchingFactor, setBranchingFactor] = useState<number>(
    defaultSettingsConfig?.branching_factor ?? 3,
  );
  const [evaluationStrategy, setEvaluationStrategy] = useState<'single' | 'majority' | 'weighted'>(
    defaultSettingsConfig?.evaluation_strategy ?? 'single',
  );
  const [temperature, setTemperature] = useState<number>(
    defaultSettingsConfig?.temperature ?? 0.7,
  );
  const [maxTokens, setMaxTokens] = useState<number>(
    defaultSettingsConfig?.max_tokens ?? 2048,
  );

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fallback models if providers API returns empty models list
  const fallbackModels: Record<string, { id: string; name: string }[]> = {
    openrouter: [
      { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (Reasoning)' },
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
      { id: 'openai/o3-mini', name: 'OpenAI o3-mini' },
      { id: 'openai/gpt-4o', name: 'GPT-4o' },
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B' },
      { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3' },
    ],
    gemini: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    ],
    openai: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'o3-mini', name: 'o3-mini' },
      { id: 'llama3', name: 'Llama 3 (Local / Ollama)' },
    ],
  };

  const getProviderModels = (providerType: string) => {
    const p = providers.find(
      (pr) =>
        pr.name.toLowerCase() === providerType.toLowerCase() ||
        pr.type?.toLowerCase() === providerType.toLowerCase() ||
        (providerType === 'openai' && (pr.name === 'openai_compatible' || pr.type === 'openai_compatible'))
    );
    if (p && p.models && p.models.length > 0) {
      return p.models.map((m) => ({ id: m.id, name: m.name || m.id }));
    }
    return fallbackModels[providerType] || [
      { id: 'default-model', name: 'Default Model' },
    ];
  };

  const isProviderConfigured = (providerType: string) => {
    const p = providers.find(
      (pr) =>
        pr.name.toLowerCase() === providerType.toLowerCase() ||
        pr.type?.toLowerCase() === providerType.toLowerCase() ||
        (providerType === 'openai' && (pr.name === 'openai_compatible' || pr.type === 'openai_compatible'))
    );
    return p?.configured ?? false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a title for the reasoning session.');
      return;
    }
    if (!task.trim()) {
      setError('Please enter the problem or question for the deliberation engine.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const mctsConfig: Partial<MCTSConfig> = {
      exploration_constant: explorationConstant,
      max_iterations: maxIterations,
      max_depth: maxDepth,
      branching_factor: branchingFactor,
      evaluation_strategy: evaluationStrategy,
      generator_model: generatorModel,
      evaluator_model: evaluatorModel,
      generator_provider: generatorProvider,
      evaluator_provider: evaluatorProvider,
      temperature,
      max_tokens: maxTokens,
    };

    const sessionData: CreateSessionRequest = {
      title: title.trim(),
      task: task.trim(),
      context: context.trim() || undefined,
      constraints: constraints.trim() || undefined,
      desired_format: desiredFormat.trim() || undefined,
      config: mctsConfig,
    };

    try {
      const created = await createSession(sessionData);

      // Launch real Council deliberation run
      const councilRun = await createCouncilRun({
        task: task.trim(),
        title: title.trim() || undefined,
        mode: operatingMode,
        session_id: created.id,
        selected_models: operatingMode === 'quick'
          ? [{ provider_id: generatorProvider, model_id: generatorModel }]
          : selectedCouncilModels,
      });

      router.push(`/workspace?session=${created.id}&council_run=${councilRun.run_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create reasoning session');
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border-primary)] pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
            New Reasoning Session
          </h1>
          <p className="text-[var(--text-sm)] text-[var(--color-text-secondary)] mt-1">
            Configure task specifications, generator/evaluator models, and MCTS search bounds.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--color-error-subtle)] border border-[var(--color-border-error)] flex items-start gap-3 text-[var(--text-sm)] text-[var(--color-error-text)] animate-slide-down">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[var(--color-error)]" />
          <div className="flex-1">
            <span className="font-semibold">Configuration Error:</span> {error}
          </div>
        </div>
      )}

      {/* ── Form Layout ────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Task Inputs & Config */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 0: Operating Mode */}
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-5 sm:p-6 space-y-4 shadow-[var(--shadow-xs)]">
            <div className="flex items-center gap-2 border-b border-[var(--color-border-secondary)] pb-3">
              <Scale className="w-4 h-4 text-[var(--color-accent)]" />
              <h2 className="text-[var(--text-base)] font-semibold text-[var(--color-text-primary)]">
                Operating Mode
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Quick Mode */}
              <div
                onClick={() => setOperatingMode('quick')}
                className={cn(
                  'p-3.5 rounded-[var(--radius-lg)] border cursor-pointer transition-all space-y-2',
                  operatingMode === 'quick'
                    ? 'border-[var(--color-accent)] bg-[var(--color-bg-tertiary)] shadow-sm'
                    : 'border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-border-focus)]'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-[var(--color-text-primary)]">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Quick Mode</span>
                  </div>
                  {operatingMode === 'quick' && <Check className="w-3.5 h-3.5 text-[var(--color-accent)]" />}
                </div>
                <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                  Fast single-model inference for direct queries without cross-critique latency.
                </p>
              </div>

              {/* Council Mode */}
              <div
                onClick={() => setOperatingMode('council')}
                className={cn(
                  'p-3.5 rounded-[var(--radius-lg)] border cursor-pointer transition-all space-y-2',
                  operatingMode === 'council'
                    ? 'border-[var(--color-accent)] bg-[var(--color-bg-tertiary)] shadow-sm'
                    : 'border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-border-focus)]'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-[var(--color-text-primary)]">
                    <Scale className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                    <span>Council Mode</span>
                  </div>
                  {operatingMode === 'council' && <Check className="w-3.5 h-3.5 text-[var(--color-accent)]" />}
                </div>
                <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                  Parallel multi-model consultation, contradiction matrix, rotating peer critique & synthesis.
                </p>
              </div>

              {/* Deep Reasoning Mode */}
              <div
                onClick={() => setOperatingMode('deep_reasoning')}
                className={cn(
                  'p-3.5 rounded-[var(--radius-lg)] border cursor-pointer transition-all space-y-2',
                  operatingMode === 'deep_reasoning'
                    ? 'border-[var(--color-accent)] bg-[var(--color-bg-tertiary)] shadow-sm'
                    : 'border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-border-focus)]'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-[var(--color-text-primary)]">
                    <Brain className="w-3.5 h-3.5 text-purple-400" />
                    <span>Deep Reasoning</span>
                  </div>
                  {operatingMode === 'deep_reasoning' && <Check className="w-3.5 h-3.5 text-[var(--color-accent)]" />}
                </div>
                <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                  Full multi-agent deliberation pipeline + MCTS exploration tree foundation.
                </p>
              </div>
            </div>

            {/* Council Model Selection (when Council or Deep Reasoning is selected) */}
            {operatingMode !== 'quick' && (
              <div className="pt-2 border-t border-[var(--color-border-secondary)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                    Participating Council Models ({selectedCouncilModels.length} selected)
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { provider_id: 'openrouter', model_id: 'deepseek/deepseek-r1', display_name: 'DeepSeek R1 (Reasoning)' },
                    { provider_id: 'openrouter', model_id: 'anthropic/claude-3.5-sonnet', display_name: 'Claude 3.5 Sonnet' },
                    { provider_id: 'gemini', model_id: 'gemini-2.0-flash', display_name: 'Gemini 2.0 Flash' },
                    { provider_id: 'openai_compatible', model_id: 'gpt-4o', display_name: 'OpenAI GPT-4o' },
                    { provider_id: 'openrouter', model_id: 'openai/o3-mini', display_name: 'OpenAI o3-mini' },
                  ].map((m) => {
                    const isChecked = selectedCouncilModels.some(
                      (sel) => sel.provider_id === m.provider_id && sel.model_id === m.model_id
                    );
                    return (
                      <button
                        type="button"
                        key={`${m.provider_id}:${m.model_id}`}
                        onClick={() => {
                          if (isChecked) {
                            if (selectedCouncilModels.length > 1) {
                              setSelectedCouncilModels(
                                selectedCouncilModels.filter(
                                  (sel) => !(sel.provider_id === m.provider_id && sel.model_id === m.model_id)
                                )
                              );
                            }
                          } else {
                            setSelectedCouncilModels([...selectedCouncilModels, m]);
                          }
                        }}
                        className={cn(
                          'px-2.5 py-1 rounded-[var(--radius-md)] text-xs font-mono border transition-all flex items-center gap-1.5',
                          isChecked
                            ? 'bg-[var(--color-accent-subtle)] border-[var(--color-accent)] text-[var(--color-accent)] font-medium'
                            : 'bg-[var(--color-bg-tertiary)] border-[var(--color-border-secondary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
                        )}
                      >
                        <span className={cn('w-1.5 h-1.5 rounded-full', isChecked ? 'bg-[var(--color-accent)]' : 'bg-zinc-500')} />
                        <span>{m.display_name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Section 1: Task Specifications */}
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-5 sm:p-6 space-y-5 shadow-[var(--shadow-xs)]">
            <div className="flex items-center gap-2 border-b border-[var(--color-border-secondary)] pb-3">
              <FileText className="w-4 h-4 text-[var(--color-accent)]" />
              <h2 className="text-[var(--text-base)] font-semibold text-[var(--color-text-primary)]">
                Task Specification
              </h2>
            </div>

            {/* Task Title */}
            <div className="space-y-1.5">
              <label
                htmlFor="session-title"
                className="block text-[var(--text-xs)] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider"
              >
                Session Title <span className="text-[var(--color-error)]">*</span>
              </label>
              <input
                id="session-title"
                type="text"
                placeholder="e.g. Formal proof of quantum supremacy bound or Architecture refactor"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] text-[var(--text-sm)] text-[var(--color-text-primary)] placeholder-[var(--color-text-quaternary)] focus:border-[var(--color-border-focus)] focus:bg-[var(--color-bg-secondary)] transition-all"
              />
            </div>

            {/* Main Problem / Question */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="session-task"
                  className="block text-[var(--text-xs)] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider"
                >
                  Problem / Core Question <span className="text-[var(--color-error)]">*</span>
                </label>
                <span className="text-[10px] text-[var(--color-text-tertiary)] font-mono">
                  Markdown supported
                </span>
              </div>
              <textarea
                id="session-task"
                rows={5}
                placeholder="State the core hypothesis, mathematical problem, or multi-step logic problem to deliberate upon…"
                value={task}
                onChange={(e) => setTask(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] text-[var(--text-sm)] text-[var(--color-text-primary)] placeholder-[var(--color-text-quaternary)] focus:border-[var(--color-border-focus)] focus:bg-[var(--color-bg-secondary)] transition-all resize-y"
              />
            </div>

            {/* Optional Collapsible Fields */}
            <div>
              <button
                type="button"
                onClick={() => setShowOptionalFields(!showOptionalFields)}
                className="inline-flex items-center gap-1.5 text-[var(--text-xs)] font-medium text-[var(--color-accent)] hover:underline cursor-pointer"
              >
                {showOptionalFields ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    Hide context & constraints
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    Add background context, constraints, or desired format
                  </>
                )}
              </button>

              {showOptionalFields && (
                <div className="mt-4 space-y-4 pt-3 border-t border-[var(--color-border-secondary)] animate-slide-down">
                  {/* Context */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="session-context"
                      className="block text-[var(--text-xs)] font-medium text-[var(--color-text-secondary)]"
                    >
                      Background Context (Optional)
                    </label>
                    <textarea
                      id="session-context"
                      rows={3}
                      placeholder="Domain background, assumptions, prior proofs, or relevant facts…"
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                      className="w-full px-3 py-2 rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] text-[var(--text-sm)] text-[var(--color-text-primary)] placeholder-[var(--color-text-quaternary)] focus:border-[var(--color-border-focus)] resize-y"
                    />
                  </div>

                  {/* Constraints */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="session-constraints"
                      className="block text-[var(--text-xs)] font-medium text-[var(--color-text-secondary)]"
                    >
                      Strict Constraints (Optional)
                    </label>
                    <textarea
                      id="session-constraints"
                      rows={2}
                      placeholder="e.g. Must run in O(n log n), must not use external libraries, formal lemma required…"
                      value={constraints}
                      onChange={(e) => setConstraints(e.target.value)}
                      className="w-full px-3 py-2 rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] text-[var(--text-sm)] text-[var(--color-text-primary)] placeholder-[var(--color-text-quaternary)] focus:border-[var(--color-border-focus)] resize-y"
                    />
                  </div>

                  {/* Desired Output Format */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="session-format"
                      className="block text-[var(--text-xs)] font-medium text-[var(--color-text-secondary)]"
                    >
                      Desired Output Format (Optional)
                    </label>
                    <input
                      id="session-format"
                      type="text"
                      placeholder="e.g. JSON schema, step-by-step LaTeX proof, Python implementation"
                      value={desiredFormat}
                      onChange={(e) => setDesiredFormat(e.target.value)}
                      className="w-full px-3 py-2 rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] text-[var(--text-sm)] text-[var(--color-text-primary)] placeholder-[var(--color-text-quaternary)] focus:border-[var(--color-border-focus)]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Model Configuration */}
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-5 sm:p-6 space-y-5 shadow-[var(--shadow-xs)]">
            <div className="flex items-center gap-2 border-b border-[var(--color-border-secondary)] pb-3">
              <Brain className="w-4 h-4 text-[var(--color-accent)]" />
              <h2 className="text-[var(--text-base)] font-semibold text-[var(--color-text-primary)]">
                Model Architecture
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Generator Model */}
              <div className="space-y-3 p-4 rounded-[var(--radius-lg)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[var(--color-accent)]" />
                    <span className="text-[var(--text-sm)] font-medium text-[var(--color-text-primary)]">
                      Generator Model
                    </span>
                  </div>
                  <span
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-medium',
                      isProviderConfigured(generatorProvider)
                        ? 'bg-[var(--color-success-subtle)] text-[var(--color-success-text)]'
                        : 'bg-amber-500/10 text-amber-400',
                    )}
                  >
                    {isProviderConfigured(generatorProvider) ? 'Configured' : 'Needs Key'}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--color-text-tertiary)]">
                  Proposes reasoning steps and branching candidates.
                </p>

                {/* Provider select */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-semibold text-[var(--color-text-tertiary)]">
                    Provider
                  </label>
                  <select
                    value={generatorProvider}
                    onChange={(e) => {
                      const p = e.target.value;
                      setGeneratorProvider(p);
                      const models = getProviderModels(p);
                      if (models[0]) setGeneratorModel(models[0].id);
                    }}
                    className="w-full px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] text-[var(--text-xs)] text-[var(--color-text-primary)]"
                  >
                    <option value="openrouter">OpenRouter (Multi-model)</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="openai">OpenAI</option>
                  </select>
                </div>

                {/* Model select */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-semibold text-[var(--color-text-tertiary)]">
                    Model
                  </label>
                  <select
                    value={generatorModel}
                    onChange={(e) => setGeneratorModel(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] text-[var(--text-xs)] text-[var(--color-text-primary)] font-mono"
                  >
                    {getProviderModels(generatorProvider).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Evaluator Model */}
              <div className="space-y-3 p-4 rounded-[var(--radius-lg)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />
                    <span className="text-[var(--text-sm)] font-medium text-[var(--color-text-primary)]">
                      Evaluator Model
                    </span>
                  </div>
                  <span
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-medium',
                      isProviderConfigured(evaluatorProvider)
                        ? 'bg-[var(--color-success-subtle)] text-[var(--color-success-text)]'
                        : 'bg-amber-500/10 text-amber-400',
                    )}
                  >
                    {isProviderConfigured(evaluatorProvider) ? 'Configured' : 'Needs Key'}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--color-text-tertiary)]">
                  Scores candidate validity and guides backpropagation.
                </p>

                {/* Provider select */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-semibold text-[var(--color-text-tertiary)]">
                    Provider
                  </label>
                  <select
                    value={evaluatorProvider}
                    onChange={(e) => {
                      const p = e.target.value;
                      setEvaluatorProvider(p);
                      const models = getProviderModels(p);
                      if (models[0]) setEvaluatorModel(models[0].id);
                    }}
                    className="w-full px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] text-[var(--text-xs)] text-[var(--color-text-primary)]"
                  >
                    <option value="openrouter">OpenRouter (Multi-model)</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="openai">OpenAI</option>
                  </select>
                </div>

                {/* Model select */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-semibold text-[var(--color-text-tertiary)]">
                    Model
                  </label>
                  <select
                    value={evaluatorModel}
                    onChange={(e) => setEvaluatorModel(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] text-[var(--text-xs)] text-[var(--color-text-primary)] font-mono"
                  >
                    {getProviderModels(evaluatorProvider).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Advanced MCTS Parameters (Collapsible) */}
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-5 sm:p-6 shadow-[var(--shadow-xs)]">
            <button
              type="button"
              onClick={() => setShowAdvancedMCTS(!showAdvancedMCTS)}
              className="w-full flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[var(--color-accent)]" />
                <h2 className="text-[var(--text-base)] font-semibold text-[var(--color-text-primary)]">
                  MCTS Tree Parameters
                </h2>
              </div>
              <div className="flex items-center gap-2 text-[var(--text-xs)] text-[var(--color-accent)]">
                <span>{showAdvancedMCTS ? 'Collapse' : 'Expand Advanced'}</span>
                {showAdvancedMCTS ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </button>

            {showAdvancedMCTS && (
              <div className="mt-5 pt-5 border-t border-[var(--color-border-secondary)] space-y-6 animate-slide-down">
                {/* Exploration Constant (c) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <label className="text-[var(--text-xs)] font-medium text-[var(--color-text-primary)]">
                        Exploration Constant (c)
                      </label>
                      <span
                        className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] cursor-help"
                        title="Balances exploration of lesser-visited branches vs exploitation of high-reward branches in UCT formula."
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <span className="font-mono text-[var(--text-xs)] text-[var(--color-accent)] font-semibold">
                      {explorationConstant.toFixed(3)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="3.0"
                    step="0.05"
                    value={explorationConstant}
                    onChange={(e) => setExplorationConstant(parseFloat(e.target.value))}
                    className="w-full accent-[var(--color-accent)] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[var(--color-text-tertiary)] font-mono">
                    <span>0.1 (Exploit)</span>
                    <span>1.414 (Standard √2)</span>
                    <span>3.0 (Explore)</span>
                  </div>
                </div>

                {/* Max Iterations */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <label className="text-[var(--text-xs)] font-medium text-[var(--color-text-primary)]">
                        Max Iterations
                      </label>
                      <span
                        className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] cursor-help"
                        title="Number of 4-phase MCTS rollouts (Selection, Expansion, Simulation, Backpropagation)."
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <span className="font-mono text-[var(--text-xs)] text-[var(--color-accent)] font-semibold">
                      {maxIterations}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={maxIterations}
                    onChange={(e) => setMaxIterations(parseInt(e.target.value, 10))}
                    className="w-full accent-[var(--color-accent)] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[var(--color-text-tertiary)] font-mono">
                    <span>1 run</span>
                    <span>25 runs</span>
                    <span>50 runs</span>
                  </div>
                </div>

                {/* Max Depth & Branching Factor Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Max Depth */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <label className="text-[var(--text-xs)] font-medium text-[var(--color-text-primary)]">
                          Max Tree Depth
                        </label>
                        <span
                          className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] cursor-help"
                          title="Maximum reasoning steps chained from root to conclusion."
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                        </span>
                      </div>
                      <span className="font-mono text-[var(--text-xs)] text-[var(--color-accent)] font-semibold">
                        {maxDepth}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={maxDepth}
                      onChange={(e) => setMaxDepth(parseInt(e.target.value, 10))}
                      className="w-full accent-[var(--color-accent)] cursor-pointer"
                    />
                  </div>

                  {/* Branching Factor */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <label className="text-[var(--text-xs)] font-medium text-[var(--color-text-primary)]">
                          Branching Factor (k)
                        </label>
                        <span
                          className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] cursor-help"
                          title="Number of distinct alternative reasoning thoughts generated at each expansion."
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                        </span>
                      </div>
                      <span className="font-mono text-[var(--text-xs)] text-[var(--color-accent)] font-semibold">
                        {branchingFactor}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={branchingFactor}
                      onChange={(e) => setBranchingFactor(parseInt(e.target.value, 10))}
                      className="w-full accent-[var(--color-accent)] cursor-pointer"
                    />
                  </div>
                </div>

                {/* Evaluation Strategy */}
                <div className="space-y-2">
                  <label className="text-[var(--text-xs)] font-medium text-[var(--color-text-primary)] flex items-center gap-1.5">
                    Evaluation Strategy
                    <span
                      className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] cursor-help"
                      title="Single: evaluate once per node; Majority: sample 3 times and take consensus; Weighted: weighted confidence average."
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                    </span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['single', 'majority', 'weighted'] as const).map((strategy) => (
                      <button
                        key={strategy}
                        type="button"
                        onClick={() => setEvaluationStrategy(strategy)}
                        className={cn(
                          'px-3 py-2 rounded-[var(--radius-md)] text-[var(--text-xs)] font-medium capitalize border transition-all text-center',
                          evaluationStrategy === strategy
                            ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)] text-[var(--color-accent)]'
                            : 'border-[var(--color-border-primary)] bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]',
                        )}
                      >
                        {strategy}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Temperature & Max Tokens Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Temperature */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[var(--text-xs)] font-medium text-[var(--color-text-primary)]">
                        Temperature
                      </label>
                      <span className="font-mono text-[var(--text-xs)] text-[var(--color-accent)] font-semibold">
                        {temperature.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.05"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full accent-[var(--color-accent)] cursor-pointer"
                    />
                  </div>

                  {/* Max Tokens */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[var(--text-xs)] font-medium text-[var(--color-text-primary)]">
                        Max Output Tokens
                      </label>
                      <span className="font-mono text-[var(--text-xs)] text-[var(--color-accent)] font-semibold">
                        {maxTokens}
                      </span>
                    </div>
                    <input
                      type="number"
                      min={256}
                      max={8192}
                      step={256}
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(parseInt(e.target.value, 10) || 2048)}
                      className="w-full px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] text-[var(--text-xs)] text-[var(--color-text-primary)] font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Sticky Configuration Summary & Launch Action */}
        <div className="space-y-5">
          <div className="sticky top-20 rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-5 sm:p-6 shadow-[var(--shadow-sm)] space-y-5">
            <div className="flex items-center gap-2 border-b border-[var(--color-border-secondary)] pb-3">
              <Settings2 className="w-4 h-4 text-[var(--color-accent)]" />
              <h3 className="text-[var(--text-sm)] font-semibold text-[var(--color-text-primary)]">
                Configuration Summary
              </h3>
            </div>

            <div className="space-y-3 text-[var(--text-xs)]">
              {/* Task Title */}
              <div>
                <span className="text-[var(--color-text-tertiary)] block text-[10px] uppercase font-semibold">
                  Session Title
                </span>
                <span className="font-medium text-[var(--color-text-primary)] line-clamp-1">
                  {title || 'Untitled Session'}
                </span>
              </div>

              {/* Generator Model */}
              <div className="pt-2 border-t border-[var(--color-border-secondary)]">
                <span className="text-[var(--color-text-tertiary)] block text-[10px] uppercase font-semibold">
                  Generator
                </span>
                <span className="font-mono text-[11px] text-[var(--color-text-primary)] truncate block">
                  {generatorModel}
                </span>
              </div>

              {/* Evaluator Model */}
              <div className="pt-2 border-t border-[var(--color-border-secondary)]">
                <span className="text-[var(--color-text-tertiary)] block text-[10px] uppercase font-semibold">
                  Evaluator
                </span>
                <span className="font-mono text-[11px] text-[var(--color-text-primary)] truncate block">
                  {evaluatorModel}
                </span>
              </div>

              {/* Parameters Pills */}
              <div className="pt-2 border-t border-[var(--color-border-secondary)] grid grid-cols-2 gap-2">
                <div className="p-2 rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)]">
                  <span className="text-[10px] text-[var(--color-text-tertiary)] block">Iterations</span>
                  <span className="font-mono font-semibold text-[var(--color-text-primary)]">
                    {maxIterations}
                  </span>
                </div>
                <div className="p-2 rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)]">
                  <span className="text-[10px] text-[var(--color-text-tertiary)] block">Max Depth</span>
                  <span className="font-mono font-semibold text-[var(--color-text-primary)]">
                    {maxDepth}
                  </span>
                </div>
                <div className="p-2 rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)]">
                  <span className="text-[10px] text-[var(--color-text-tertiary)] block">Branching</span>
                  <span className="font-mono font-semibold text-[var(--color-text-primary)]">
                    {branchingFactor}
                  </span>
                </div>
                <div className="p-2 rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)]">
                  <span className="text-[10px] text-[var(--color-text-tertiary)] block">Exploration (c)</span>
                  <span className="font-mono font-semibold text-[var(--color-text-primary)]">
                    {explorationConstant.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Tree Estimate */}
              <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)] text-[11px] text-[var(--color-text-secondary)] space-y-1">
                <div className="flex items-center justify-between text-[var(--color-text-tertiary)]">
                  <span>Strategy:</span>
                  <span className="font-medium capitalize text-[var(--color-text-primary)]">
                    {evaluationStrategy}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[var(--color-text-tertiary)]">
                  <span>Temperature:</span>
                  <span className="font-mono text-[var(--color-text-primary)]">
                    {temperature}
                  </span>
                </div>
              </div>
            </div>

            {/* Launch CTA */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={submitting}
                iconRight={<ArrowRight className="w-4 h-4" />}
                className="w-full justify-center shadow-md text-[var(--text-sm)]"
              >
                {submitting ? 'Creating Session…' : 'Start Reasoning Session'}
              </Button>
              <p className="text-[10px] text-center text-[var(--color-text-tertiary)] mt-2">
                Navigates to workspace and initiates MCTS tree exploration.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
