import React, { useMemo } from "react";

export type LineageGraphEdge = {
  source: string;
  target: string;
  relationship: string;
  similarity?: number | null;
};

export type LineageGraphNode = {
  id: string;
  label?: string | null;
  type?: string | null;
  signer_address?: string | null;
  sha256_hash?: string | null;
  ipfs_cid?: string | null;
  file_url?: string | null;
  algo_tx?: string | null;
  content_key?: string | null;
  status?: string | null;
  generation_time?: string | null;
  similarity?: number | null;
  source_url?: string | null;
  canonical_strategy?: string | null;
};

export type LineageGraph = {
  nodes: LineageGraphNode[];
  edges: LineageGraphEdge[];
  suspect_id?: string | null;
  anchor_id?: string | null;
  threshold?: number | null;
  graph_top_k?: number | null;
};

const NODE_COLORS: Record<string, string> = {
  query: "#2563eb",
  anchor: "#16a34a",
  duplicate: "#a855f7",
  declared: "#f97316",
  match: "#facc15",
  neighbor: "#facc15",
  default: "#6b7280",
};

const EDGE_COLORS: Record<string, string> = {
  query_match: "#60a5fa",
  query_neighbor: "#cbd5f5",
  similarity: "#94a3b8",
  same_content: "#c084fc",
  declared_lineage: "#fb923c",
  default: "#94a3b8",
};

type Props = {
  graph?: LineageGraph | null;
};

const WIDTH = 640;
const HEIGHT = 360;

const formatPercent = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }
  const pct = value > 1 ? value * 100 : value * 100;
  return `${pct.toFixed(1)}%`;
};

const buildTooltip = (node: LineageGraphNode) => {
  const parts: string[] = [];
  if (node.label) parts.push(node.label);
  if (node.sha256_hash) parts.push(`sha256: ${node.sha256_hash}`);
  if (node.ipfs_cid) parts.push(`cid: ${node.ipfs_cid}`);
  if (node.signer_address) parts.push(`signer: ${node.signer_address}`);
  if (node.similarity !== undefined && node.similarity !== null) {
    const pct = formatPercent(node.similarity);
    if (pct) parts.push(`similarity: ${pct}`);
  }
  if (node.type) parts.push(`type: ${node.type}`);
  return parts.join("\n");
};

const ProvenanceGraph: React.FC<Props> = ({ graph }) => {
  const prepared = useMemo(() => {
    if (!graph || !graph.nodes || graph.nodes.length <= 1) {
      return null;
    }

    const suspectId = graph.suspect_id || "suspect";
    const anchorId =
      graph.anchor_id ||
      graph.nodes.find((node) => node.type === "anchor" && node.id !== suspectId)?.id ||
      graph.nodes.find((node) => node.id !== suspectId)?.id;

    const positions: Record<string, { x: number; y: number }> = {};
    const radius = 18;

    positions[suspectId] = { x: WIDTH * 0.18, y: HEIGHT / 2 };
    if (anchorId) {
      positions[anchorId] = { x: WIDTH * 0.48, y: HEIGHT / 2 };
    }

    const otherNodes = graph.nodes.filter((node) => node.id !== suspectId && node.id !== anchorId);
    const duplicates = otherNodes.filter((node) => node.type === "duplicate");
    const declared = otherNodes.filter((node) => node.type === "declared");
    const remaining = otherNodes.filter((node) => node.type !== "duplicate" && node.type !== "declared");

    const placeAroundAnchor = (nodes: LineageGraphNode[], distance: number, startAngle: number) => {
      if (!anchorId || nodes.length === 0) return;
      const anchorPos = positions[anchorId];
      nodes.forEach((node, index) => {
        const angle = startAngle + (index / Math.max(nodes.length, 1)) * Math.PI;
        positions[node.id] = {
          x: anchorPos.x + distance * Math.cos(angle),
          y: anchorPos.y + distance * Math.sin(angle),
        };
      });
    };

    placeAroundAnchor(duplicates, 80, Math.PI * 0.25);
    placeAroundAnchor(declared, 110, -Math.PI * 0.75);

    if (remaining.length) {
      const columnX = WIDTH * 0.78;
      const gap = HEIGHT / (remaining.length + 1);
      remaining.forEach((node, idx) => {
        positions[node.id] = { x: columnX, y: gap * (idx + 1) };
      });
    }

    // Ensure every node has a position (fallback to circle layout)
    graph.nodes.forEach((node, index) => {
      if (!positions[node.id]) {
        const angle = (index / graph.nodes.length) * Math.PI * 2;
        positions[node.id] = {
          x: WIDTH * 0.6 + 100 * Math.cos(angle),
          y: HEIGHT * 0.5 + 100 * Math.sin(angle),
        };
      }
    });

    const edges = graph.edges
      .map((edge) => {
        const src = positions[edge.source];
        const tgt = positions[edge.target];
        if (!src || !tgt) {
          return null;
        }
        const labelParts: string[] = [];
        if (edge.relationship) labelParts.push(edge.relationship.replace(/_/g, " "));
        const pct = formatPercent(edge.similarity ?? undefined);
        if (pct) labelParts.push(pct);
        return {
          ...edge,
          sourcePos: src,
          targetPos: tgt,
          label: labelParts.join(" • "),
        };
      })
      .filter(Boolean) as Array<LineageGraphEdge & {
      sourcePos: { x: number; y: number };
      targetPos: { x: number; y: number };
      label: string;
    }>;

    return {
      nodes: graph.nodes,
      edges,
      positions,
      radius,
      anchorId,
      suspectId,
    };
  }, [graph]);

  if (!prepared) {
    return null;
  }

  const legendItems = [
    { label: "Query", type: "query" },
    { label: "Anchor", type: "anchor" },
    { label: "Near Match", type: "match" },
    { label: "Duplicate", type: "duplicate" },
    { label: "Declared", type: "declared" },
  ];

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-600">
        Visual lineage of near-duplicate content. Edge labels show relationship and similarity.
      </div>
      <div className="border border-gray-200 rounded-lg bg-white">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-80">
          {prepared.edges.map((edge) => {
            const color = EDGE_COLORS[edge.relationship] || EDGE_COLORS.default;
            const strokeWidth = edge.similarity && edge.similarity > 0 ? 1.5 + edge.similarity * 2 : 1.5;
            const midX = (edge.sourcePos.x + edge.targetPos.x) / 2;
            const midY = (edge.sourcePos.y + edge.targetPos.y) / 2;
            return (
              <g key={`${edge.source}-${edge.target}-${edge.relationship}`}>
                <line
                  x1={edge.sourcePos.x}
                  y1={edge.sourcePos.y}
                  x2={edge.targetPos.x}
                  y2={edge.targetPos.y}
                  stroke={color}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  opacity={0.8}
                />
                {edge.label && (
                  <text x={midX} y={midY - 6} textAnchor="middle" fill="#374151" fontSize={11} fontWeight={500}>
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}

          {prepared.nodes.map((node) => {
            const pos = prepared.positions[node.id];
            if (!pos) return null;
            const color = NODE_COLORS[node.type || "default"] || NODE_COLORS.default;
            const label = node.label || node.id;
            return (
              <g key={node.id}>
                <circle cx={pos.x} cy={pos.y} r={prepared.radius} fill={color} stroke="#111827" strokeWidth={1}>
                  <title>{buildTooltip(node)}</title>
                </circle>
                <text x={pos.x} y={pos.y + prepared.radius + 16} textAnchor="middle" fontSize={12} fill="#111827">
                  {label.length > 18 ? `${label.slice(0, 15)}…` : label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-gray-600">
        {legendItems.map((item) => (
          <div key={item.type} className="flex items-center gap-2">
            <span
              className="inline-flex h-3 w-3 rounded-full"
              style={{ backgroundColor: NODE_COLORS[item.type] || NODE_COLORS.default }}
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProvenanceGraph;
