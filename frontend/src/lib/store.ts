/* ============================================================
   DEEP REASON — Global State Store (Zustand)
   ============================================================ */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Session,
  Provider,
  OverviewStats,
  WSEvent,
  TimelineEvent,
  AppSettings,
  MCTSNode,
  TreeData,
  CouncilRunState,
  CouncilRunCreate,
} from '@/types';
import {
  sessionsApi,
  providersApi,
  councilApi,
  statsApi,
  healthApi,
  connectSession,
  type WSConnection,
} from '@/lib/api';

// ── Settings Store (persisted) ───────────────────────────

interface SettingsState {
  settings: AppSettings;
  mobileMenuOpen: boolean;
  setTheme: (theme: AppSettings['theme']) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: {
        theme: 'dark',
        sidebar_collapsed: false,
        default_config: {
          exploration_constant: 1.414,
          max_iterations: 10,
          max_depth: 5,
          branching_factor: 3,
          evaluation_strategy: 'single',
          temperature: 0.7,
          max_tokens: 2048,
        },
        show_advanced_controls: false,
        notifications_enabled: true,
        auto_scroll_timeline: true,
      },
      mobileMenuOpen: false,
      setTheme: (theme) =>
        set((s) => ({ settings: { ...s.settings, theme } })),
      toggleSidebar: () =>
        set((s) => ({
          settings: {
            ...s.settings,
            sidebar_collapsed: !s.settings.sidebar_collapsed,
          },
        })),
      setSidebarCollapsed: (collapsed) =>
        set((s) => ({
          settings: { ...s.settings, sidebar_collapsed: collapsed },
        })),
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
      toggleMobileMenu: () => set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen })),
      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),
    }),
    {
      name: 'deep-reason-settings',
      partialize: (state) => ({ settings: state.settings }),
    },
  ),
);

// ── Sessions Store ───────────────────────────────────────

interface SessionsState {
  sessions: Session[];
  currentSession: Session | null;
  loading: boolean;
  error: string | null;
  stats: OverviewStats | null;
  statsLoading: boolean;

  fetchSessions: () => Promise<void>;
  fetchSession: (id: string) => Promise<void>;
  createSession: (data: Parameters<typeof sessionsApi.create>[0]) => Promise<Session>;
  deleteSession: (id: string) => Promise<void>;
  setCurrentSession: (session: Session | null) => void;
  fetchStats: () => Promise<void>;
  updateSessionInList: (session: Session) => void;
}

export const useSessionsStore = create<SessionsState>()((set, get) => ({
  sessions: [],
  currentSession: null,
  loading: false,
  error: null,
  stats: null,
  statsLoading: false,

  fetchSessions: async () => {
    set({ loading: true, error: null });
    try {
      const sessions = await sessionsApi.list();
      set({ sessions, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch sessions',
        loading: false,
      });
    }
  },

  fetchSession: async (id) => {
    set({ loading: true, error: null });
    try {
      const session = await sessionsApi.get(id);
      set({ currentSession: session, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch session',
        loading: false,
      });
    }
  },

  createSession: async (data) => {
    const session = await sessionsApi.create(data);
    set((s) => ({ sessions: [session, ...s.sessions] }));
    return session;
  },

  deleteSession: async (id) => {
    await sessionsApi.delete(id);
    set((s) => ({
      sessions: s.sessions.filter((sess) => sess.id !== id),
      currentSession:
        s.currentSession?.id === id ? null : s.currentSession,
    }));
  },

  setCurrentSession: (session) => set({ currentSession: session }),

  fetchStats: async () => {
    set({ statsLoading: true });
    try {
      const stats = await statsApi.overview();
      set({ stats, statsLoading: false });
    } catch {
      set({ statsLoading: false });
    }
  },

  updateSessionInList: (session) =>
    set((s) => ({
      sessions: s.sessions.map((sess) =>
        sess.id === session.id ? session : sess,
      ),
      currentSession:
        s.currentSession?.id === session.id ? session : s.currentSession,
    })),
}));

// ── Providers Store ──────────────────────────────────────

interface ProvidersState {
  providers: Provider[];
  loading: boolean;
  error: string | null;
  fetchProviders: () => Promise<void>;
  configureProvider: (
    name: string,
    config: { api_key: string; base_url?: string },
  ) => Promise<void>;
  testProvider: (name: string) => Promise<{ success: boolean; message: string; latency_ms?: number }>;
}

export const useProvidersStore = create<ProvidersState>()((set) => ({
  providers: [],
  loading: false,
  error: null,

  fetchProviders: async () => {
    set({ loading: true, error: null });
    try {
      const providers = await providersApi.list();
      set({ providers, loading: false });
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : 'Failed to fetch providers',
        loading: false,
      });
    }
  },

  configureProvider: async (name, config) => {
    const updated = await providersApi.configure(name, config);
    set((s) => ({
      providers: s.providers.map((p) => (p.name === name ? updated : p)),
    }));
  },

  testProvider: async (name) => {
    const result = await providersApi.test(name);
    return result;
  },
}));

// ── Execution Store (WebSocket + Timeline) ───────────────

interface ExecutionState {
  connection: WSConnection | null;
  connected: boolean;
  timeline: TimelineEvent[];
  selectedNodeId: string | null;
  treeData: TreeData | null;
  treeLoading: boolean;
  executionStatus: 'idle' | 'connecting' | 'running' | 'paused' | 'completed' | 'error';

  connectToSession: (sessionId: string) => void;
  disconnect: () => void;
  startExecution: (sessionId: string) => void;
  pauseExecution: () => void;
  resumeExecution: () => void;
  stopExecution: () => void;
  stepExecution: (sessionId: string) => Promise<void>;
  selectNode: (nodeId: string | null) => void;
  fetchTree: (sessionId: string) => Promise<void>;
  clearTimeline: () => void;
  addTimelineEvent: (event: TimelineEvent) => void;
}

let eventCounter = 0;

function wsEventToTimeline(event: WSEvent): TimelineEvent {
  const messages: Record<string, string> = {
    session_started: 'Reasoning session started',
    iteration_started: `Iteration ${event.iteration ?? '?'} started: Exploring hypotheses`,
    node_selected: 'UCT selection identified high-potential candidate',
    node_expanded: 'Node expanded with multi-hypothesis branches',
    candidate_generated: 'AI model generated novel reasoning hypothesis',
    candidate_evaluated: 'Evaluator assigned scalar reward and critique',
    simulation_completed: 'Trajectory rollout and evaluation completed',
    reward_propagated: 'Reward backpropagated through ancestor path',
    branch_pruned: 'Sub-threshold reasoning trajectory pruned',
    iteration_completed: `Iteration ${event.iteration ?? '?'} deliberation finished`,
    search_completed: 'Search complete — optimal decision trajectory resolved',
    connection_established: 'Live connection established with MCTS engine',
    error: `Error: ${(event.data as { message?: string })?.message || 'Reasoning error encountered'}`,
    heartbeat: 'Connection heartbeat',
  };

  return {
    id: `evt-${++eventCounter}`,
    type: event.type,
    timestamp: event.timestamp || new Date().toISOString(),
    message: messages[event.type] || event.type,
    node_id: event.node_id,
    iteration: event.iteration,
    metadata: event.data,
  };
}

export const useExecutionStore = create<ExecutionState>()((set, get) => ({
  connection: null,
  connected: false,
  timeline: [],
  selectedNodeId: null,
  treeData: null,
  treeLoading: false,
  executionStatus: 'idle',

  connectToSession: (sessionId) => {
    const existing = get().connection;
    if (existing) existing.close();

    set({ executionStatus: 'connecting', connected: false });

    const conn = connectSession(sessionId, {
      onOpen: () => {
        set({ connected: true });
        // Don't blindly force running status on open!
      },
      onMessage: (event) => {
        if (event.type === 'heartbeat') return;

        // Handle initial connection snapshot
        if ((event.type as string) === 'connection_established') {
          const snapshot = event.data as {
            is_running?: boolean;
            is_paused?: boolean;
            current_iteration?: number;
          };
          if (snapshot?.is_running) {
            set({ executionStatus: 'running' });
          } else if (snapshot?.is_paused || (snapshot?.current_iteration && snapshot.current_iteration > 0)) {
            set({ executionStatus: 'paused' });
          } else {
            set({ executionStatus: 'idle' });
          }
          get().fetchTree(sessionId);
          return;
        }

        // Handle status change
        if ((event.type as string) === 'status_change') {
          const newStatus = (event as unknown as { status?: string }).status;
          if (newStatus === 'running' || newStatus === 'paused' || newStatus === 'completed' || newStatus === 'stopped') {
            set({ executionStatus: newStatus === 'stopped' ? 'idle' : (newStatus as any) });
          }
          get().fetchTree(sessionId);
          return;
        }

        const timelineEvent = wsEventToTimeline(event);
        set((s) => ({
          timeline: [...s.timeline, timelineEvent],
        }));

        if (event.type === 'search_completed') {
          set({ executionStatus: 'completed' });
          get().fetchTree(sessionId);
        }

        if (event.type === 'error') {
          set({ executionStatus: 'error' });
        }

        // Refresh tree on key deliberation steps
        if (
          ['node_expanded', 'reward_propagated', 'branch_pruned', 'iteration_completed', 'candidate_evaluated'].includes(
            event.type,
          )
        ) {
          get().fetchTree(sessionId);
        }
      },
      onClose: () => {
        set({ connected: false });
      },
      onError: () => {
        set({ executionStatus: 'error', connected: false });
      },
    });

    set({ connection: conn });
  },

  disconnect: () => {
    const conn = get().connection;
    if (conn) conn.close();
    set({ connection: null, connected: false });
  },

  startExecution: (sessionId) => {
    const conn = get().connection;
    if (conn?.isConnected()) {
      conn.send({ action: 'start', session_id: sessionId });
      set({ executionStatus: 'running' });
    }
  },

  pauseExecution: () => {
    const conn = get().connection;
    if (conn?.isConnected()) {
      conn.send({ action: 'pause' });
      set({ executionStatus: 'paused' });
    }
  },

  resumeExecution: () => {
    const conn = get().connection;
    if (conn?.isConnected()) {
      conn.send({ action: 'resume' });
      set({ executionStatus: 'running' });
    }
  },

  stopExecution: () => {
    const conn = get().connection;
    if (conn?.isConnected()) {
      conn.send({ action: 'stop' });
      set({ executionStatus: 'idle' });
    }
  },

  stepExecution: async (sessionId: string) => {
    const conn = get().connection;
    if (conn?.isConnected()) {
      conn.send({ action: 'step' });
    } else {
      // Direct REST fallback
      await fetch(`http://localhost:8000/api/sessions/${sessionId}/step`, {
        method: 'POST',
      });
    }
    await get().fetchTree(sessionId);
  },

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  fetchTree: async (sessionId) => {
    set({ treeLoading: true });
    try {
      const treeData = await sessionsApi.getTree(sessionId);
      set({ treeData, treeLoading: false });
      // If no node selected yet, select best leaf or root
      if (!get().selectedNodeId && treeData.nodes.length > 0) {
        const bestLeaf =
          treeData.nodes.find((n) => n.is_best_path && n.depth > 0) ||
          treeData.nodes.find((n) => n.id === treeData.root_id) ||
          treeData.nodes[0];
        if (bestLeaf) {
          set({ selectedNodeId: bestLeaf.id });
        }
      }
    } catch {
      set({ treeLoading: false });
    }
  },

  clearTimeline: () => set({ timeline: [] }),

  addTimelineEvent: (event) =>
    set((s) => ({ timeline: [...s.timeline, event] })),
}));

// ── Backend Health Store ─────────────────────────────────

interface HealthState {
  backendOnline: boolean;
  backendVersion: string | null;
  lastChecked: string | null;
  checking: boolean;
  checkHealth: () => Promise<void>;
}

export const useHealthStore = create<HealthState>()((set) => ({
  backendOnline: false,
  backendVersion: null,
  lastChecked: null,
  checking: false,

  checkHealth: async () => {
    set({ checking: true });
    try {
      const result = await healthApi.check();
      set({
        backendOnline: result.status === 'ok' || result.status === 'healthy',
        backendVersion: result.version,
        lastChecked: new Date().toISOString(),
        checking: false,
      });
    } catch {
      set({
        backendOnline: false,
        lastChecked: new Date().toISOString(),
        checking: false,
      });
    }
  },
}));

// ── AI Council Store (Phase 2) ───────────────────────────

interface CouncilState {
  currentRun: CouncilRunState | null;
  runs: CouncilRunState[];
  loading: boolean;
  error: string | null;
  activePollingId: string | null;

  createRun: (params: CouncilRunCreate) => Promise<CouncilRunState>;
  fetchRun: (runId: string) => Promise<CouncilRunState | null>;
  fetchRuns: () => Promise<void>;
  cancelRun: (runId: string) => Promise<void>;
  pollRunUntilComplete: (runId: string) => Promise<void>;
  setCurrentRun: (run: CouncilRunState | null) => void;
}

export const useCouncilStore = create<CouncilState>()((set, get) => ({
  currentRun: null,
  runs: [],
  loading: false,
  error: null,
  activePollingId: null,

  createRun: async (params) => {
    set({ loading: true, error: null });
    try {
      const run = await councilApi.createRun(params);
      set((s) => ({
        currentRun: run,
        runs: [run, ...s.runs.filter((r) => r.run_id !== run.run_id)],
        loading: false,
      }));
      // Kick off polling until run finishes
      get().pollRunUntilComplete(run.run_id);
      return run;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to launch Council deliberation',
        loading: false,
      });
      throw err;
    }
  },

  fetchRun: async (runId) => {
    try {
      const run = await councilApi.getRun(runId);
      set((s) => ({
        currentRun: run,
        runs: s.runs.map((r) => (r.run_id === runId ? run : r)),
      }));
      return run;
    } catch {
      return null;
    }
  },

  fetchRuns: async () => {
    try {
      const runs = await councilApi.listRuns();
      set({ runs });
    } catch {
      // Ignore
    }
  },

  cancelRun: async (runId) => {
    try {
      await councilApi.cancelRun(runId);
      set((s) => ({
        currentRun: s.currentRun?.run_id === runId ? { ...s.currentRun, status: 'cancelled' } : s.currentRun,
        activePollingId: null,
      }));
    } catch {
      // Ignore
    }
  },

  pollRunUntilComplete: async (runId) => {
    set({ activePollingId: runId });
    const maxAttempts = 60;
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;
      if (get().activePollingId !== runId || attempts > maxAttempts) {
        clearInterval(interval);
        return;
      }

      try {
        const run = await councilApi.getRun(runId);
        set((s) => ({
          currentRun: s.currentRun?.run_id === runId ? run : s.currentRun,
          runs: s.runs.map((r) => (r.run_id === runId ? run : r)),
        }));

        if (['completed', 'partially_completed', 'failed', 'cancelled'].includes(run.status)) {
          clearInterval(interval);
          set({ activePollingId: null });
        }
      } catch {
        clearInterval(interval);
        set({ activePollingId: null });
      }
    }, 1200);
  },

  setCurrentRun: (run) => set({ currentRun: run }),
}));
