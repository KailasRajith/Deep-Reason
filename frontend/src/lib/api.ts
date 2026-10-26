/* ============================================================
   DEEP REASON — API Client
   Centralized HTTP + WebSocket client for backend communication.
   ============================================================ */

import type {
  Session,
  CreateSessionRequest,
  Provider,
  ProviderConfigRequest,
  MCTSNode,
  TreeData,
  OverviewStats,
  WSEvent,
  ModelInfo,
  CouncilRunCreate,
  CouncilRunState,
  CandidateResponse,
  ComparisonMatrix,
  CritiqueResult,
  CouncilSynthesis,
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

// ── HTTP Helpers ─────────────────────────────────────────

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    let details: unknown;
    try {
      details = await res.json();
    } catch {
      details = await res.text();
    }
    throw new ApiError(
      res.status,
      `API Error: ${res.status} ${res.statusText}`,
      details,
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Sessions API ─────────────────────────────────────────

export const sessionsApi = {
  list: () => request<Session[]>('/api/sessions'),

  get: (id: string) => request<Session>(`/api/sessions/${id}`),

  create: (data: CreateSessionRequest) =>
    request<Session>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/api/sessions/${id}`, { method: 'DELETE' }),

  getTree: (id: string) =>
    request<TreeData>(`/api/sessions/${id}/tree`),

  getNode: (sessionId: string, nodeId: string) =>
    request<MCTSNode>(`/api/sessions/${sessionId}/nodes/${nodeId}`),
};

// ── Stats API ────────────────────────────────────────────

export const statsApi = {
  overview: () => request<OverviewStats>('/api/stats/overview'),
};

// ── Providers API ────────────────────────────────────────

export const providersApi = {
  list: () => request<Provider[]>('/api/providers'),

  get: (name: string) => request<Provider>(`/api/providers/${name}`),

  configure: (name: string, config: ProviderConfigRequest) =>
    request<Provider>(`/api/providers/${name}/configure`, {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  test: (name: string) =>
    request<{ success: boolean; message: string; latency_ms?: number }>(
      `/api/providers/${name}/test`,
    ),

  models: (name: string) =>
    request<ModelInfo[]>(`/api/providers/${name}/models`),

  listAllModels: () => request<ModelInfo[]>('/api/models'),

  testModel: (req: { provider_id: string; model_id: string; prompt: string }) =>
    request<{
      success: boolean;
      provider_id: string;
      model_id: string;
      latency_ms: number;
      content?: string | null;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null;
      error?: string | null;
      message?: string | null;
    }>('/api/models/test', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
};

// ── AI Council API (Phase 2) ─────────────────────────────

export const councilApi = {
  createRun: (req: CouncilRunCreate) =>
    request<CouncilRunState>('/api/council/runs', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  listRuns: (limit: number = 50) =>
    request<CouncilRunState[]>(`/api/council/runs?limit=${limit}`),

  getRun: (runId: string) =>
    request<CouncilRunState>(`/api/council/runs/${runId}`),

  getCandidates: (runId: string) =>
    request<CandidateResponse[]>(`/api/council/runs/${runId}/candidates`),

  getComparison: (runId: string) =>
    request<ComparisonMatrix | null>(`/api/council/runs/${runId}/comparison`),

  getCritiques: (runId: string) =>
    request<CritiqueResult[]>(`/api/council/runs/${runId}/critiques`),

  getSynthesis: (runId: string) =>
    request<CouncilSynthesis | null>(`/api/council/runs/${runId}/synthesis`),

  cancelRun: (runId: string) =>
    request<{ status: string; run_id: string }>(`/api/council/runs/${runId}/cancel`, {
      method: 'POST',
    }),
};

// ── Health API ───────────────────────────────────────────

export const healthApi = {
  check: () => request<{ status: string; version: string }>('/api/health'),
};

// ── WebSocket Connection ─────────────────────────────────

export type WSMessageHandler = (event: WSEvent) => void;
export type WSCloseHandler = (code: number, reason: string) => void;
export type WSErrorHandler = (error: Event) => void;

export interface WSConnection {
  send: (data: Record<string, unknown>) => void;
  close: () => void;
  isConnected: () => boolean;
}

export function connectSession(
  sessionId: string,
  handlers: {
    onMessage: WSMessageHandler;
    onClose?: WSCloseHandler;
    onError?: WSErrorHandler;
    onOpen?: () => void;
  },
): WSConnection {
  const url = `${WS_BASE}/ws/sessions/${sessionId}`;
  let ws: WebSocket | null = null;
  let reconnectAttempts = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let intentionalClose = false;

  function connect() {
    ws = new WebSocket(url);

    ws.onopen = () => {
      reconnectAttempts = 0;
      handlers.onOpen?.();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WSEvent;
        handlers.onMessage(data);
      } catch (err) {
        console.error('[WS] Failed to parse message:', err);
      }
    };

    ws.onclose = (event) => {
      handlers.onClose?.(event.code, event.reason);
      if (!intentionalClose && reconnectAttempts < 5) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 16000);
        reconnectTimer = setTimeout(() => {
          reconnectAttempts++;
          connect();
        }, delay);
      }
    };

    ws.onerror = (event) => {
      handlers.onError?.(event);
    };
  }

  connect();

  return {
    send: (data) => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    },
    close: () => {
      intentionalClose = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    },
    isConnected: () => ws?.readyState === WebSocket.OPEN,
  };
}

export { ApiError };
