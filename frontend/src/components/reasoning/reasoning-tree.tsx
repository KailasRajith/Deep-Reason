/* ============================================================
   DEEP REASON — MCTS Tree Visualization
   Interactive tree using React Flow for exploring reasoning.
   ============================================================ */
'use client';

import React, { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  Panel,
  useReactFlow,
  MarkerType,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { TreeData, MCTSNode, NodeStatus } from '@/types';
import { cn, formatScore, truncate } from '@/lib/utils';
import { useExecutionStore } from '@/lib/store';
import { Target, ZoomIn, ZoomOut, Maximize2, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ── Node status colors ──────────────────────────────────
const statusColors: Record<NodeStatus, string> = {
  unexplored: 'var(--color-text-quaternary)',
  exploring: 'var(--color-accent)',
  expanded: 'var(--color-node-explored)',
  evaluated: 'var(--color-info)',
  completed: 'var(--color-node-completed)',
  pruned: 'var(--color-node-pruned)',
  failed: 'var(--color-node-failed)',
};

const statusLabels: Record<NodeStatus, string> = {
  unexplored: 'Unexplored',
  exploring: 'Exploring',
  expanded: 'Expanded',
  evaluated: 'Evaluated',
  completed: 'Completed',
  pruned: 'Pruned',
  failed: 'Failed',
};

// ── Custom MCTS Node Component ──────────────────────────
interface MCTSNodeData {
  label: string;
  node: MCTSNode;
  isSelected: boolean;
  isBestPath: boolean;
  [key: string]: unknown;
}

function MCTSTreeNode({ data }: { data: MCTSNodeData }) {
  const { node, isSelected, isBestPath } = data;
  const isRoot = node.depth === 0;
  const statusColor = statusColors[node.status] || 'var(--color-border-primary)';

  return (
    <div
      className={cn(
        'group relative rounded-[var(--radius-xl)] px-3.5 py-3 min-w-[210px] max-w-[260px]',
        'bg-[var(--color-bg-secondary)] border transition-all duration-150 ease-out select-none',
        'hover:shadow-[var(--shadow-lg)] hover:-translate-y-0.5',
        isSelected
          ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/30 shadow-[var(--shadow-md)]'
          : isBestPath
          ? 'border-emerald-500/70 shadow-[0_0_12px_rgba(16,185,129,0.18)]'
          : 'border-[var(--color-border-primary)] hover:border-[var(--color-border-focus)]',
      )}
    >
      {/* React Flow Handles for top/bottom edge attachment */}
      {!isRoot && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-2.5 !h-2.5 !bg-[var(--color-bg-tertiary)] !border-2 !border-[var(--color-border-primary)] !-top-1.5"
        />
      )}

      {/* Header Row: Status dot + Depth + Best Tag */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={cn(
              'w-2 h-2 rounded-full shrink-0',
              node.status === 'exploring' && 'animate-ping',
            )}
            style={{ backgroundColor: statusColor }}
          />
          <span className="text-[10px] font-mono text-[var(--color-text-tertiary)] font-medium">
            Depth {node.depth}
          </span>
        </div>

        {isBestPath ? (
          <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
            <Award className="w-2.5 h-2.5" />
            Best Path
          </span>
        ) : (
          <span className="text-[10px] font-mono text-[var(--color-text-quaternary)]">
            #{node.id.slice(-6)}
          </span>
        )}
      </div>

      {/* Node Reasoning Content (State/Action) */}
      <p className="text-[var(--text-xs)] font-medium text-[var(--color-text-primary)] leading-snug mb-2.5 line-clamp-2">
        {node.action || truncate(node.state || 'Initial Problem Definition', 75)}
      </p>

      {/* Metrics Row: Visits, Q-Value, Evaluator Score */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border-secondary)] text-[10px] font-mono">
        <div className="flex items-center gap-2">
          <span className="text-[var(--color-text-secondary)]" title="Visit Count N(s)">
            N: <strong className="text-[var(--color-text-primary)]">{node.visits}</strong>
          </span>
          <span className="text-[var(--color-border-primary)]">|</span>
          <span className="text-[var(--color-text-secondary)]" title="Average Accumulated Value Q(s)">
            Q: <strong className="text-[var(--color-text-primary)]">{node.avg_value > 0 ? formatScore(node.avg_value) : '0.00'}</strong>
          </span>
        </div>

        {node.reward !== undefined && node.reward > 0 && (
          <span className="text-emerald-400 font-semibold" title="Immediate Reward Score">
            +{formatScore(node.reward)}
          </span>
        )}
      </div>

      {/* Target handle for children */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-[var(--color-bg-tertiary)] !border-2 !border-[var(--color-border-primary)] !-bottom-1.5"
      />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  mctsNode: MCTSTreeNode,
};

// ── Layout helpers ──────────────────────────────────────

function layoutTree(
  nodes: MCTSNode[],
  rootId: string,
  bestPathIds: string[],
  selectedNodeId: string | null,
): { flowNodes: Node[]; flowEdges: Edge[] } {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const flowNodes: Node[] = [];
  const flowEdges: Edge[] = [];

  const HORIZONTAL_GAP = 300;
  const VERTICAL_GAP = 180;

  const root = nodeMap.get(rootId);
  if (!root) return { flowNodes: [], flowEdges: [] };

  // Calculate subtree widths for hierarchical balance
  const subtreeWidths = new Map<string, number>();

  function calcWidth(nodeId: string): number {
    const n = nodeMap.get(nodeId);
    if (!n || n.children_ids.length === 0) {
      subtreeWidths.set(nodeId, 1);
      return 1;
    }
    const validChildren = n.children_ids.filter((cid) => nodeMap.has(cid));
    if (validChildren.length === 0) {
      subtreeWidths.set(nodeId, 1);
      return 1;
    }
    const w = validChildren.reduce((sum, cid) => sum + calcWidth(cid), 0);
    subtreeWidths.set(nodeId, w);
    return w;
  }

  calcWidth(rootId);

  // Hierarchical BFS
  interface LayoutItem {
    id: string;
    depth: number;
    xStart: number;
    xEnd: number;
  }

  const rootWidth = subtreeWidths.get(rootId) || 1;
  const totalWidth = rootWidth * HORIZONTAL_GAP;
  const layoutQueue: LayoutItem[] = [
    { id: rootId, depth: 0, xStart: -totalWidth / 2, xEnd: totalWidth / 2 },
  ];

  while (layoutQueue.length > 0) {
    const { id, depth, xStart, xEnd } = layoutQueue.shift()!;
    const node = nodeMap.get(id);
    if (!node) continue;

    const x = (xStart + xEnd) / 2;
    const y = depth * VERTICAL_GAP;
    const isBestPath = bestPathIds.includes(id);

    flowNodes.push({
      id,
      type: 'mctsNode',
      position: { x, y },
      data: {
        label: truncate(node.state || 'Root', 50),
        node,
        isSelected: selectedNodeId === id,
        isBestPath,
      } as MCTSNodeData,
    });

    const children = node.children_ids.filter((cid) => nodeMap.has(cid));
    if (children.length > 0) {
      const parentWidth = xEnd - xStart;
      let currentX = xStart;

      for (const childId of children) {
        const childWidth = subtreeWidths.get(childId) || 1;
        const childSpan = (childWidth / (subtreeWidths.get(id) || 1)) * parentWidth;

        layoutQueue.push({
          id: childId,
          depth: depth + 1,
          xStart: currentX,
          xEnd: currentX + childSpan,
        });

        const isChildBest = isBestPath && bestPathIds.includes(childId);
        const childNode = nodeMap.get(childId);

        flowEdges.push({
          id: `${id}-${childId}`,
          source: id,
          target: childId,
          type: 'smoothstep',
          animated: childNode?.status === 'exploring',
          style: {
            stroke: isChildBest
              ? '#10B981'
              : 'var(--color-node-explored)',
            strokeWidth: isChildBest ? 2.5 : 1.5,
            opacity: childNode?.status === 'pruned' ? 0.35 : 0.65,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 14,
            height: 14,
            color: isChildBest ? '#10B981' : 'var(--color-node-explored)',
          },
        });

        currentX += childSpan;
      }
    }
  }

  return { flowNodes, flowEdges };
}

// ── Legend Component ─────────────────────────────────────

function TreeLegend() {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 px-3.5 py-2 rounded-[var(--radius-xl)]',
        'bg-[var(--color-bg-secondary)]/90 backdrop-blur-md',
        'border border-[var(--color-border-primary)] shadow-[var(--shadow-sm)]',
        'text-[10px] text-[var(--color-text-secondary)]',
      )}
    >
      {Object.entries(statusLabels).map(([status, label]) => (
        <div key={status} className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: statusColors[status as NodeStatus] }}
          />
          <span className="font-medium">{label}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5 pl-2 border-l border-[var(--color-border-secondary)]">
        <span className="w-2.5 h-0.5 bg-emerald-500 rounded-full" />
        <span className="text-emerald-600 dark:text-emerald-400 font-medium">Optimal Trajectory</span>
      </div>
    </div>
  );
}

// ── Tree Zoom Controls ───────────────────────────────────

function TreeControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div
      className={cn(
        'flex items-center gap-1 p-1 rounded-[var(--radius-xl)]',
        'bg-[var(--color-bg-secondary)]/90 backdrop-blur-md',
        'border border-[var(--color-border-primary)] shadow-[var(--shadow-sm)]',
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={() => zoomIn()}
        title="Zoom in"
        className="w-7 h-7 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
      >
        <ZoomIn className="w-3.5 h-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => zoomOut()}
        title="Zoom out"
        className="w-7 h-7 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
      >
        <ZoomOut className="w-3.5 h-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => fitView({ padding: 0.25 })}
        title="Fit to view"
        className="w-7 h-7 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
      >
        <Maximize2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

// ── Main Tree Visualization ─────────────────────────────

interface ReasoningTreeProps {
  treeData: TreeData | null;
  loading?: boolean;
  onNodeSelect?: (nodeId: string) => void;
  className?: string;
}

export function ReasoningTree({
  treeData,
  loading,
  onNodeSelect,
  className,
}: ReasoningTreeProps) {
  const selectedNodeId = useExecutionStore((s) => s.selectedNodeId);
  const selectNode = useExecutionStore((s) => s.selectNode);

  const { flowNodes: initialNodes, flowEdges: initialEdges } = useMemo(() => {
    if (!treeData || treeData.nodes.length === 0) {
      return { flowNodes: [], flowEdges: [] };
    }
    return layoutTree(
      treeData.nodes,
      treeData.root_id,
      treeData.best_path_ids || [],
      selectedNodeId,
    );
  }, [treeData, selectedNodeId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id);
      onNodeSelect?.(node.id);
    },
    [selectNode, onNodeSelect],
  );

  if (loading) {
    return (
      <div
        className={cn(
          'flex items-center justify-center h-full',
          'text-[var(--color-text-tertiary)] text-[var(--text-sm)]',
          className,
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
          <span className="font-medium">Synthesizing MCTS graph…</span>
        </div>
      </div>
    );
  }

  if (!treeData || treeData.nodes.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center h-full',
          'text-[var(--color-text-tertiary)]',
          className,
        )}
      >
        <div className="flex flex-col items-center gap-3 text-center px-8 max-w-sm">
          <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] flex items-center justify-center shadow-sm">
            <Target className="w-6 h-6 text-[var(--color-accent)]" />
          </div>
          <h3 className="text-[var(--text-base)] font-semibold text-[var(--color-text-primary)]">
            Reasoning Tree Standing By
          </h3>
          <p className="text-[var(--text-xs)] text-[var(--color-text-secondary)] leading-relaxed">
            Execute MCTS iterations to observe candidate expansions, evaluation critiques, and reward propagation in real time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('h-full w-full relative', className)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.15}
        maxZoom={1.8}
        proOptions={{ hideAttribution: true }}
        className="bg-[var(--color-bg-primary)]"
      >
        <Background
          gap={24}
          size={1}
          color="rgba(128, 128, 128, 0.15)"
        />
        <Controls
          showZoom={false}
          showFitView={false}
          showInteractive={false}
          className="hidden"
        />
        <MiniMap
          className="!bg-[var(--color-bg-secondary)] !border-[var(--color-border-primary)] rounded-[var(--radius-xl)] shadow-lg"
          maskColor="rgba(128, 128, 128, 0.2)"
          nodeColor={(n) => {
            const data = n.data as MCTSNodeData;
            return statusColors[data.node.status] || '#6B7280';
          }}
          style={{ width: 130, height: 85 }}
        />

        {/* Custom top-right controls */}
        <Panel position="top-right">
          <TreeControls />
        </Panel>

        {/* Legend */}
        <Panel position="bottom-left">
          <TreeLegend />
        </Panel>

        {/* Tree summary pills */}
        {treeData.stats && (
          <Panel position="top-left">
            <div
              className={cn(
                'flex items-center gap-3.5 px-3.5 py-1.5 rounded-[var(--radius-xl)]',
                'bg-[var(--color-bg-secondary)]/90 backdrop-blur-md',
                'border border-[var(--color-border-primary)] shadow-[var(--shadow-sm)]',
                'text-[11px] font-mono text-[var(--color-text-secondary)]',
              )}
            >
              <span>
                Nodes: <strong className="text-[var(--color-text-primary)]">{treeData.stats.total_nodes}</strong>
              </span>
              <span>·</span>
              <span>
                Depth: <strong className="text-[var(--color-text-primary)]">{treeData.stats.max_depth}</strong>
              </span>
              <span>·</span>
              <span>
                Visits: <strong className="text-[var(--color-text-primary)]">{treeData.stats.total_visits}</strong>
              </span>
              <span>·</span>
              <span>
                Pruned: <strong className="text-amber-400">{treeData.stats.pruned_count}</strong>
              </span>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}
