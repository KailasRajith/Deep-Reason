/* ============================================================
   DEEP REASON — Model Laboratory (/models)
   Manage AI providers (OpenRouter, Gemini, OpenAI), configure
   secure API keys, test latency, and inspect model context windows & pricing.
   ============================================================ */
'use client';

import React, { useState, useEffect } from 'react';
import { useProvidersStore } from '@/lib/store';
import { providersApi } from '@/lib/api';
import type { Provider, ModelInfo, ProviderType, ModelCapabilities } from '@/types';
import { Button } from '@/components/ui/button';
import { cn, formatCompact } from '@/lib/utils';
import {
  FlaskConical,
  Key,
  CheckCircle2,
  XCircle,
  Activity,
  Layers,
  Sparkles,
  Zap,
  Globe,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  Cpu,
  Search,
  ExternalLink,
  Coins,
  ShieldCheck,
  X,
} from 'lucide-react';

const supportedProvidersList: {
  name: string;
  type: ProviderType;
  display_name: string;
  description: string;
  defaultBaseUrl?: string;
}[] = [
  {
    name: 'openrouter',
    type: 'openrouter',
    display_name: 'OpenRouter',
    description: 'Unified gateway to Claude 3.5 Sonnet, Llama 3.3, DeepSeek, and 200+ models.',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
  },
  {
    name: 'gemini',
    type: 'gemini',
    display_name: 'Google Gemini',
    description: 'Native access to Gemini 1.5 Pro and Gemini 2.0 Flash with 2M token context.',
  },
  {
    name: 'openai',
    type: 'openai',
    display_name: 'OpenAI',
    description: 'Direct integration with GPT-4o, GPT-4o-mini, and o1 reasoning models.',
    defaultBaseUrl: 'https://api.openai.com/v1',
  },
  {
    name: 'groq',
    type: 'groq',
    display_name: 'Groq LPU',
    description: 'Ultra-low latency inference for Llama 3 and Mixtral via LPU acceleration.',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
  },
];

function getCapabilityTags(capabilities?: string[] | ModelCapabilities): string[] {
  if (!capabilities) return [];
  if (Array.isArray(capabilities)) return capabilities;
  const tags: string[] = [];
  if (capabilities.supports_reasoning) tags.push('reasoning');
  if (capabilities.supports_structured_output) tags.push('structured');
  if (capabilities.supports_streaming) tags.push('streaming');
  return tags;
}

function getModelSpecs(model: ModelInfo) {
  const caps = typeof model.capabilities === 'object' && !Array.isArray(model.capabilities) ? model.capabilities : null;
  const ctx = model.context_window || model.context_length || caps?.context_window;
  const out = model.max_output_tokens || caps?.max_output_tokens;
  const price = model.pricing || caps?.pricing;
  return { ctx, out, price };
}

export default function ModelLabPage() {
  const {
    providers,
    loading,
    error,
    fetchProviders,
    configureProvider,
    testProvider,
  } = useProvidersStore();

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  // Selected Provider for inspection
  const [selectedProviderName, setSelectedProviderName] = useState<string>('openrouter');

  // Dialog State
  const [configuringProvider, setConfiguringProvider] = useState<Provider | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  // Test Connection State per provider
  const [testingStatus, setTestingStatus] = useState<
    Record<string, { loading: boolean; result?: { success: boolean; message: string; latency_ms?: number } }>
  >({});

  // Model search query
  const [modelSearch, setModelSearch] = useState('');

  // Individual model probe state
  const [testingModelId, setTestingModelId] = useState<string | null>(null);
  const [modelTestResults, setModelTestResults] = useState<
    Record<string, { success: boolean; latency_ms: number; message?: string; error?: string }>
  >({});

  const handleTestModel = async (model: ModelInfo) => {
    setTestingModelId(model.id);
    try {
      const res = await providersApi.testModel({
        provider_id: activeProvider.name,
        model_id: model.id,
        prompt: 'Respond with a one-sentence confirmation that Deep Reason model probe succeeded.',
      });
      setModelTestResults((prev) => ({
        ...prev,
        [model.id]: {
          success: res.success,
          latency_ms: res.latency_ms,
          message: res.content || res.message || (res.success ? 'Success' : 'Failed'),
          error: res.error || undefined,
        },
      }));
    } catch (err) {
      setModelTestResults((prev) => ({
        ...prev,
        [model.id]: {
          success: false,
          latency_ms: 0,
          error: err instanceof Error ? err.message : 'Model probe failed',
        },
      }));
    } finally {
      setTestingModelId(null);
    }
  };

  // Merge loaded providers with supported list
  const allProviders: Provider[] = supportedProvidersList.map((sup) => {
    const existing = providers.find((p) => p.name === sup.name || p.type === sup.type);
    if (existing) {
      return {
        ...existing,
        display_name: existing.display_name || sup.display_name || existing.name,
        type: existing.type || sup.type,
        models: existing.models || [],
      };
    }
    return {
      name: sup.name,
      type: sup.type,
      display_name: sup.display_name,
      configured: false,
      available: false,
      models: [],
    };
  });

  const activeProvider =
    allProviders.find((p) => p.name === selectedProviderName) || allProviders[0];

  const handleTestConnection = async (providerName: string) => {
    setTestingStatus((prev) => ({
      ...prev,
      [providerName]: { loading: true },
    }));

    try {
      const res = await testProvider(providerName);
      setTestingStatus((prev) => ({
        ...prev,
        [providerName]: { loading: false, result: res },
      }));
    } catch (err) {
      setTestingStatus((prev) => ({
        ...prev,
        [providerName]: {
          loading: false,
          result: {
            success: false,
            message: err instanceof Error ? err.message : 'Connection test failed',
          },
        },
      }));
    }
  };

  const handleOpenConfigure = (p: Provider) => {
    setConfiguringProvider(p);
    setApiKey('');
    setBaseUrl(p.base_url || '');
    setDialogError(null);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configuringProvider) return;
    if (!apiKey.trim()) {
      setDialogError('Please provide an API key.');
      return;
    }

    setSavingKey(true);
    setDialogError(null);

    try {
      await configureProvider(configuringProvider.name, {
        api_key: apiKey.trim(),
        base_url: baseUrl.trim() || undefined,
      });
      setConfiguringProvider(null);
      // Retest connection automatically
      handleTestConnection(configuringProvider.name);
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSavingKey(false);
    }
  };

  // Filtered models for active provider
  const filteredModels = (activeProvider?.models || []).filter((m) => {
    if (!modelSearch.trim()) return true;
    const q = modelSearch.toLowerCase();
    const tags = getCapabilityTags(m.capabilities);
    return (
      m.id.toLowerCase().includes(q) ||
      m.name?.toLowerCase().includes(q) ||
      tags.some((c) => c.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border-primary)] pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
            Model Laboratory & Providers
          </h1>
          <p className="text-[var(--text-sm)] text-[var(--color-text-secondary)] mt-1">
            Configure upstream LLM providers, manage API keys securely, and benchmark latency.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchProviders()}
          icon={<RefreshCw className="w-3.5 h-3.5" />}
          loading={loading}
        >
          Refresh Providers
        </Button>
      </div>

      {/* ── Provider Cards Grid ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {allProviders.map((provider) => {
          const isSelected = provider.name === selectedProviderName;
          const testStatus = testingStatus[provider.name];

          return (
            <div
              key={provider.name}
              onClick={() => setSelectedProviderName(provider.name)}
              className={cn(
                'rounded-[var(--radius-xl)] border p-5 flex flex-col justify-between transition-all cursor-pointer shadow-[var(--shadow-xs)] relative',
                isSelected
                  ? 'border-[var(--color-accent)] bg-[var(--color-bg-secondary)] ring-2 ring-[var(--color-accent-subtle)]'
                  : 'border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-border-focus)]',
              )}
            >
              <div className="space-y-3">
                {/* Header: Name + Status */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-[var(--radius-md)] bg-[var(--color-accent-subtle)] text-[var(--color-accent)] flex items-center justify-center font-bold text-xs uppercase">
                      {provider.display_name.slice(0, 2)}
                    </div>
                    <h3 className="text-[var(--text-sm)] font-semibold text-[var(--color-text-primary)]">
                      {provider.display_name}
                    </h3>
                  </div>

                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0',
                      provider.configured
                        ? 'bg-[var(--color-success-subtle)] text-[var(--color-success-text)]'
                        : 'bg-zinc-500/10 text-zinc-400',
                    )}
                  >
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        provider.configured
                          ? 'bg-[var(--color-success)]'
                          : 'bg-zinc-400',
                      )}
                    />
                    {provider.configured ? 'Configured' : 'Not configured'}
                  </span>
                </div>

                {/* Description */}
                <p className="text-[11px] text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">
                  {supportedProvidersList.find((s) => s.name === provider.name)?.description ||
                    'AI inference provider'}
                </p>

                {/* Model count badge */}
                <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-tertiary)] pt-1">
                  <Layers className="w-3.5 h-3.5" />
                  <span>
                    {provider.models?.length > 0
                      ? `${provider.models.length} models available`
                      : 'Models on configure'}
                  </span>
                </div>
              </div>

              {/* Actions & Test Status */}
              <div className="mt-5 pt-3 border-t border-[var(--color-border-secondary)] space-y-2">
                {testStatus?.result && (
                  <div
                    className={cn(
                      'p-2 rounded-[var(--radius-md)] text-[10px] flex items-center justify-between animate-fade-in',
                      testStatus.result.success
                        ? 'bg-[var(--color-success-subtle)] text-[var(--color-success-text)]'
                        : 'bg-[var(--color-error-subtle)] text-[var(--color-error-text)]',
                    )}
                  >
                    <span className="truncate">{testStatus.result.message}</span>
                    {testStatus.result.latency_ms && (
                      <span className="font-mono shrink-0 ml-1">
                        {testStatus.result.latency_ms}ms
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1 text-[var(--text-xs)]"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenConfigure(provider);
                    }}
                    icon={<Key className="w-3 h-3" />}
                  >
                    {provider.configured ? 'Edit Key' : 'Configure'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[var(--text-xs)]"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTestConnection(provider.name);
                    }}
                    loading={testStatus?.loading}
                    title="Test latency and connectivity"
                  >
                    Test
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Model List for Selected Provider ───────────────────── */}
      <div className="rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-5 sm:p-6 space-y-5 shadow-[var(--shadow-xs)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border-secondary)] pb-4">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-[var(--color-accent)]" />
            <div>
              <h2 className="text-[var(--text-base)] font-semibold text-[var(--color-text-primary)]">
                {activeProvider?.display_name} Available Models
              </h2>
              <p className="text-[var(--text-xs)] text-[var(--color-text-secondary)]">
                Models usable for MCTS generator rollouts and evaluation scoring.
              </p>
            </div>
          </div>

          {/* Model Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              placeholder="Filter models…"
              value={modelSearch}
              onChange={(e) => setModelSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] text-[var(--text-xs)] text-[var(--color-text-primary)] focus:border-[var(--color-border-focus)]"
            />
          </div>
        </div>

        {/* Model items */}
        {filteredModels.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center">
            <FlaskConical className="w-8 h-8 text-[var(--color-text-quaternary)] mb-2" />
            <p className="text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)]">
              {activeProvider?.configured
                ? 'No models matching search'
                : `Configure API key for ${activeProvider?.display_name} to load available models`}
            </p>
            {!activeProvider?.configured && (
              <Button
                variant="primary"
                size="sm"
                className="mt-3"
                onClick={() => handleOpenConfigure(activeProvider)}
                icon={<Key className="w-3.5 h-3.5" />}
              >
                Configure Provider Key
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredModels.map((model) => (
              <div
                key={model.id}
                className="p-4 rounded-[var(--radius-lg)] border border-[var(--color-border-secondary)] bg-[var(--color-bg-tertiary)] hover:border-[var(--color-border-primary)] transition-all space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-[var(--text-xs)] font-semibold text-[var(--color-text-primary)] font-mono truncate">
                      {model.name || model.id}
                    </h4>
                    <p className="text-[10px] text-[var(--color-text-tertiary)] font-mono truncate">
                      {model.id}
                    </p>
                  </div>
                  {model.is_free && (
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-success)] bg-[var(--color-success-subtle)] px-1.5 py-0.5 rounded-full shrink-0">
                      Free
                    </span>
                  )}
                </div>

                {/* Specs, Capabilities, and Probe */}
                {(() => {
                  const specs = getModelSpecs(model);
                  const tags = getCapabilityTags(model.capabilities);
                  const testRes = modelTestResults[model.id];
                  const isTesting = testingModelId === model.id;

                  return (
                    <>
                      <div className="flex flex-wrap items-center gap-3 text-[10px] text-[var(--color-text-secondary)] font-mono">
                        {specs.ctx && (
                          <span title="Context Window">
                            Ctx: {formatCompact(specs.ctx)}
                          </span>
                        )}
                        {specs.out && (
                          <span title="Max Output">
                            Out: {formatCompact(specs.out)}
                          </span>
                        )}
                        {specs.price && (
                          <span title="Prompt / Completion per 1M tokens">
                            ${specs.price.prompt_per_million}/M
                          </span>
                        )}
                      </div>

                      {/* Capabilities tags */}
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {tags.map((cap) => (
                            <span
                              key={cap}
                              className={cn(
                                "text-[9px] px-1.5 py-0.5 rounded capitalize",
                                cap === 'reasoning'
                                  ? "bg-amber-500/10 text-amber-500 border border-amber-500/20 font-medium"
                                  : "bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)] border border-[var(--color-border-secondary)]"
                              )}
                            >
                              {cap}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Probe Model Action */}
                      <div className="pt-2 border-t border-[var(--color-border-secondary)] flex items-center justify-between gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTestModel(model);
                          }}
                          loading={isTesting}
                          icon={<Zap className="w-3 h-3 text-[var(--color-accent)]" />}
                          className="h-6 text-[10px] px-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                        >
                          Probe Model
                        </Button>
                        {testRes && (
                          <span
                            className={cn(
                              "text-[9px] font-mono px-1.5 py-0.5 rounded truncate max-w-[130px]",
                              testRes.success
                                ? "bg-[var(--color-success-subtle)] text-[var(--color-success-text)]"
                                : "bg-[var(--color-error-subtle)] text-[var(--color-error-text)]"
                            )}
                            title={testRes.error || testRes.message}
                          >
                            {testRes.success
                              ? `${testRes.latency_ms}ms`
                              : (testRes.error || 'Failed')}
                          </span>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── API Key Configuration Modal ────────────────────────── */}
      {configuringProvider && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-6 max-w-md w-full shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-[var(--color-border-secondary)] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[var(--color-accent)]" />
                <h3 className="text-[var(--text-base)] font-semibold text-[var(--color-text-primary)]">
                  Configure {configuringProvider.display_name}
                </h3>
              </div>
              <button
                onClick={() => setConfiguringProvider(null)}
                className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {dialogError && (
              <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-error-subtle)] border border-[var(--color-border-error)] text-[var(--text-xs)] text-[var(--color-error-text)]">
                {dialogError}
              </div>
            )}

            <form onSubmit={handleSaveConfig} className="space-y-4">
              {/* API Key */}
              <div className="space-y-1.5">
                <label className="block text-[var(--text-xs)] font-medium text-[var(--color-text-secondary)]">
                  API Key <span className="text-[var(--color-error)]">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    required
                    autoFocus
                    className="w-full pl-3 pr-10 py-2 rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] text-[var(--text-sm)] text-[var(--color-text-primary)] font-mono placeholder-[var(--color-text-quaternary)] focus:border-[var(--color-border-focus)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                  >
                    {showApiKey ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-[var(--color-text-tertiary)]">
                  Keys are securely transmitted to backend memory/vault and never exposed in browser storage.
                </p>
              </div>

              {/* Base URL (Optional) */}
              <div className="space-y-1.5">
                <label className="block text-[var(--text-xs)] font-medium text-[var(--color-text-secondary)]">
                  Custom Base URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://api.openai.com/v1"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] text-[var(--text-sm)] text-[var(--color-text-primary)] font-mono placeholder-[var(--color-text-quaternary)] focus:border-[var(--color-border-focus)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--color-border-secondary)]">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setConfiguringProvider(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={savingKey}
                >
                  Save Configuration
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
