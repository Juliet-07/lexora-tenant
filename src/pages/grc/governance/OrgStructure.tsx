import { useMemo, useRef, useState, type CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ReactFlow,
  Controls,
  Handle,
  Position,
  getNodesBounds,
  getViewportForBounds,
  type Node,
  type Edge,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";
import {
  Building2,
  Network,
  ListTree,
  Download,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  fetchOrgStructure,
  createOrgStructureNode,
  updateOrgStructureNode,
  moveOrgStructureNode,
  deleteOrgStructureNode,
  type OrgStructureNode,
  type OrgStructureNodeType,
} from "@/lib/grc/governance-api";

// ─────────────────────────────────────────────────────────────
// Organisation Structure (Oct 2026 rework) — previously a read-only
// chart derived from HR's own Employee records, with no direct editing
// surface ("Manage in HR" sent the tenant away to edit individual
// employee records, which the PO found unclear). Reworked into a
// freeform structure the tenant builds and arranges directly: add a
// node (Shareholder / Board / Department / Role), say what sits under
// what, edit or remove anything, and download the result as an image.
// Nothing here is derived from HR or any other module — every node is
// one the tenant explicitly created.
// ─────────────────────────────────────────────────────────────

const TYPE_OPTIONS: OrgStructureNodeType[] = [
  "Shareholder",
  "Board",
  "Department",
  "Role",
];

const TYPE_STYLES: Record<OrgStructureNodeType, string> = {
  Shareholder: "bg-violet-500/10 text-violet-600 border-violet-500/30",
  Board: "bg-primary/10 text-primary border-primary/30",
  Department: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  Role: "bg-amber-500/10 text-amber-600 border-amber-500/30",
};

// Walks every occurrence in the chart — a node connected to more than
// one parent (Oct 2026: "one thing can be connected to 2 things")
// appears once per parent, each as its own entry here.
function flatten(
  nodes: OrgStructureNode[],
  depth = 0,
): { node: OrgStructureNode; depth: number }[] {
  return nodes.flatMap((n) => [
    { node: n, depth },
    ...flatten(n.children, depth + 1),
  ]);
}

// One entry per real node, keeping its shallowest occurrence — for
// anywhere a node should be listed/selectable exactly once regardless
// of how many parents it's connected to (the "All Nodes" tab, and the
// "reports to / sits under" picker).
function dedupeByNode(
  occurrences: { node: OrgStructureNode; depth: number }[],
): { node: OrgStructureNode; depth: number }[] {
  const seen = new Set<string>();
  const result: { node: OrgStructureNode; depth: number }[] = [];
  for (const entry of occurrences) {
    if (seen.has(entry.node.id)) continue;
    seen.add(entry.node.id);
    result.push(entry);
  }
  return result;
}

// Self + every descendant, however many parents each one has — used
// to stop a node being set to report to itself or to one of its own
// descendants. Cycle-safe (visited guard) even though the backend
// never actually creates one.
function collectIds(
  node: OrgStructureNode,
  visited: Set<string> = new Set(),
): Set<string> {
  if (visited.has(node.id)) return visited;
  visited.add(node.id);
  for (const c of node.children) collectIds(c, visited);
  return visited;
}

interface Handlers {
  onAddChild: (parent: OrgStructureNode) => void;
  onEdit: (node: OrgStructureNode) => void;
  onDelete: (node: OrgStructureNode) => void;
  onMove: (node: OrgStructureNode, direction: "up" | "down") => void;
}

function NodeCard({
  node,
  isFirst,
  isLast,
  handlers,
}: {
  node: OrgStructureNode;
  isFirst: boolean;
  isLast: boolean;
  handlers: Handlers;
}) {
  return (
    <Card
      className={`inline-block w-60 border ${TYPE_STYLES[node.type]} shadow-sm`}
    >
      <CardContent className="p-3 space-y-1.5">
        <div className="flex items-center justify-between gap-1">
          <Badge variant="outline" className="text-[10px]">
            {node.type}
          </Badge>
          <div className="flex items-center gap-0.5">
            <Button
              size="icon"
              variant="ghost"
              className="h-5 w-5"
              disabled={isFirst}
              onClick={() => handlers.onMove(node, "up")}
              title="Move left"
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-5 w-5"
              disabled={isLast}
              onClick={() => handlers.onMove(node, "down")}
              title="Move right"
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <p className="font-semibold text-sm leading-tight text-center">
          {node.name}
        </p>
        {node.subtitle && (
          <p className="text-[11px] text-muted-foreground text-center">
            {node.subtitle}
          </p>
        )}
        <div className="flex items-center justify-center gap-1 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[11px]"
            onClick={() => handlers.onAddChild(node)}
          >
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-6 w-6"
            onClick={() => handlers.onEdit(node)}
            title="Edit"
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={() => handlers.onDelete(node)}
            title="Remove"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Chart layout (ReactFlow + dagre) ────────────────────────────
// Previously rendered with react-organizational-chart's Tree/TreeNode,
// which draws connector lines as CSS pseudo-elements sized off flex-
// box measurements — it falls apart (off-center, disconnected-looking
// lines) once branches differ in depth or width, which is exactly
// what a real org structure does (PO, Oct 2026: "the image is
// scattered, not properly centered, the lines are all over the place
// and not properly connected"). dagre computes exact, non-overlapping
// node positions and ReactFlow draws every edge as a real SVG path
// anchored to each box's measured edge, so the result stays centered
// and cleanly connected regardless of how lopsided the tree is.
const ORG_NODE_WIDTH = 240; // matches NodeCard's `w-60`
const ORG_NODE_HEIGHT = 150; // generous estimate — a 2-line name + subtitle + both button rows
const ROOT_NODE_WIDTH = 224; // matches the root card's `w-56`
const ROOT_NODE_HEIGHT = 104;

// Invisible anchor points — edges still connect at each box's exact
// top/bottom-center, they just don't render as a visible dot the way
// an editable flow chart would.
const HANDLE_STYLE: CSSProperties = {
  opacity: 0,
  width: 1,
  height: 1,
  minWidth: 1,
  minHeight: 1,
  border: "none",
  background: "transparent",
};

type OrgFlowNodeData = {
  node: OrgStructureNode;
  isFirst: boolean;
  isLast: boolean;
  handlers: Handlers;
};

function OrgFlowNode({ data }: NodeProps) {
  const { node, isFirst, isLast, handlers } =
    data as unknown as OrgFlowNodeData;
  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        style={HANDLE_STYLE}
        isConnectable={false}
      />
      <NodeCard
        node={node}
        isFirst={isFirst}
        isLast={isLast}
        handlers={handlers}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={HANDLE_STYLE}
        isConnectable={false}
      />
    </>
  );
}

function OrgRootFlowNode({ data }: NodeProps) {
  const { label, totalNodes } = data as unknown as {
    label: string;
    totalNodes: number;
  };
  return (
    <>
      <Card className="inline-block w-56 border-primary/40 bg-primary/5 shadow-sm">
        <CardContent className="p-3 text-center space-y-1">
          <Building2 className="h-4 w-4 mx-auto text-primary" />
          <p className="font-semibold text-sm leading-tight">{label}</p>
          <p className="text-[11px] text-muted-foreground">
            {totalNodes} node{totalNodes === 1 ? "" : "s"}
          </p>
        </CardContent>
      </Card>
      <Handle
        type="source"
        position={Position.Bottom}
        style={HANDLE_STYLE}
        isConnectable={false}
      />
    </>
  );
}

const CHART_NODE_TYPES: NodeTypes = {
  orgNode: OrgFlowNode,
  orgRoot: OrgRootFlowNode,
};

const ROOT_FLOW_ID = "org-root";

// Walks the (already occurrence-flattened) tree and emits a ReactFlow
// node + edge per occurrence, unpositioned — dagre fills in `position`
// next. Node ids are `${node.id}__${contextParentId}` so the same real
// node connected to two parents still gets two distinct boxes/ids,
// matching how the backend's getTree() renders a multi-parent node
// once per parent.
function buildGraph(
  roots: OrgStructureNode[],
  orgLabel: string,
  totalNodes: number,
  handlers: Handlers,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [
    {
      id: ROOT_FLOW_ID,
      type: "orgRoot",
      position: { x: 0, y: 0 },
      width: ROOT_NODE_WIDTH,
      height: ROOT_NODE_HEIGHT,
      draggable: false,
      selectable: false,
      data: { label: orgLabel, totalNodes },
    },
  ];
  const edges: Edge[] = [];

  const walk = (list: OrgStructureNode[], parentFlowId: string) => {
    list.forEach((node, index) => {
      const flowId = `${node.id}__${node.contextParentId ?? "root"}`;
      nodes.push({
        id: flowId,
        type: "orgNode",
        position: { x: 0, y: 0 },
        width: ORG_NODE_WIDTH,
        height: ORG_NODE_HEIGHT,
        draggable: false,
        selectable: false,
        data: {
          node,
          isFirst: index === 0,
          isLast: index === list.length - 1,
          handlers,
        } satisfies OrgFlowNodeData,
      });
      edges.push({
        id: `${parentFlowId}->${flowId}`,
        source: parentFlowId,
        target: flowId,
        type: "smoothstep",
        style: { stroke: "hsl(var(--border))", strokeWidth: 2 },
      });
      walk(node.children, flowId);
    });
  };

  walk(roots, ROOT_FLOW_ID);
  return { nodes, edges };
}

// Top-to-bottom hierarchical layout — centers every parent over the
// horizontal span of its children and keeps a fixed gap between ranks
// (ranksep) and siblings (nodesep), so nothing overlaps or drifts off
// to one side regardless of how unbalanced the two branches are.
function layoutGraph(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: "TB",
    nodesep: 36,
    ranksep: 64,
    marginx: 24,
    marginy: 24,
  });
  for (const n of nodes) {
    g.setNode(n.id, {
      width: (n.width as number) ?? ORG_NODE_WIDTH,
      height: (n.height as number) ?? ORG_NODE_HEIGHT,
    });
  }
  for (const e of edges) {
    g.setEdge(e.source, e.target);
  }
  dagre.layout(g);
  return nodes.map((n) => {
    const pos = g.node(n.id);
    const w = (n.width as number) ?? ORG_NODE_WIDTH;
    const h = (n.height as number) ?? ORG_NODE_HEIGHT;
    return { ...n, position: { x: pos.x - w / 2, y: pos.y - h / 2 } };
  });
}

export default function OrgStructure() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  // Wraps the <ReactFlow> canvas — used only to reach the rendered
  // `.react-flow__viewport` element for downloadAsImage below.
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["org-structure"],
    queryFn: fetchOrgStructure,
  });

  const roots = data?.roots ?? [];
  // All occurrences (for the chart, which intentionally renders a
  // multi-parent node once per parent) vs. one entry per real node
  // (for anywhere it should only be listed/selectable once).
  const flatOccurrences = useMemo(() => flatten(roots), [roots]);
  const flat = useMemo(() => dedupeByNode(flatOccurrences), [flatOccurrences]);
  const totalNodes = data?.stats?.totalNodes ?? 0;

  // ── Add / Edit dialog ──────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formId, setFormId] = useState<string | null>(null);
  const [formType, setFormType] = useState<OrgStructureNodeType>("Department");
  const [formName, setFormName] = useState("");
  const [formSubtitle, setFormSubtitle] = useState("");
  // Oct 2026: "make it possible that in the reports to/sits under
  // field more than 1 can be selected, to allow that one thing can be
  // connected to 2 things" — empty means top-level/root.
  const [formParentIds, setFormParentIds] = useState<string[]>([]);
  const [excludedParentIds, setExcludedParentIds] = useState<Set<string>>(
    new Set(),
  );

  const openCreate = (parent: OrgStructureNode | null) => {
    setFormMode("create");
    setFormId(null);
    setFormType(parent ? "Role" : "Department");
    setFormName("");
    setFormSubtitle("");
    setFormParentIds(parent ? [parent.id] : []);
    setExcludedParentIds(new Set());
    setFormOpen(true);
  };

  const openEdit = (node: OrgStructureNode) => {
    setFormMode("edit");
    setFormId(node.id);
    setFormType(node.type);
    setFormName(node.name);
    setFormSubtitle(node.subtitle ?? "");
    setFormParentIds(node.parentIds ?? []);
    // A node can't report to itself or to one of its own descendants.
    setExcludedParentIds(collectIds(node));
    setFormOpen(true);
  };

  const createMut = useMutation({
    mutationFn: createOrgStructureNode,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-structure"] });
      toast({ title: "Node added" });
      setFormOpen(false);
    },
    onError: (e: any) =>
      toast({
        title: "Couldn't add that node",
        description: e?.response?.data?.message ?? e.message,
        variant: "destructive",
      }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      updateOrgStructureNode(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-structure"] });
      toast({ title: "Node updated" });
      setFormOpen(false);
    },
    onError: (e: any) =>
      toast({
        title: "Couldn't update that node",
        description: e?.response?.data?.message ?? e.message,
        variant: "destructive",
      }),
  });

  const moveMut = useMutation({
    mutationFn: ({
      id,
      direction,
      contextParentId,
    }: {
      id: string;
      direction: "up" | "down";
      contextParentId: string | null;
    }) => moveOrgStructureNode(id, direction, contextParentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-structure"] }),
    onError: (e: any) =>
      toast({
        title: "Couldn't move that node",
        description: e?.response?.data?.message ?? e.message,
        variant: "destructive",
      }),
  });

  const deleteMut = useMutation({
    mutationFn: ({ id, cascade }: { id: string; cascade: boolean }) =>
      deleteOrgStructureNode(id, cascade),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-structure"] });
      toast({ title: "Removed" });
      setDeleteTarget(null);
    },
    onError: (e: any) =>
      toast({
        title: "Couldn't remove that node",
        description: e?.response?.data?.message ?? e.message,
        variant: "destructive",
      }),
  });

  const submitForm = () => {
    if (!formName.trim()) {
      toast({ title: "Give the node a name first", variant: "destructive" });
      return;
    }
    const payload = {
      type: formType,
      name: formName.trim(),
      subtitle: formSubtitle.trim() || null,
      parentIds: formParentIds,
    };
    if (formMode === "create") {
      createMut.mutate(payload as any);
    } else if (formId) {
      updateMut.mutate({ id: formId, payload });
    }
  };

  // ── Delete confirmation ─────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<OrgStructureNode | null>(
    null,
  );
  const deleteDescendantCount = deleteTarget
    ? collectIds(deleteTarget).size - 1
    : 0;

  const handlers: Handlers = {
    onAddChild: openCreate,
    onEdit: openEdit,
    onDelete: setDeleteTarget,
    onMove: (node, direction) =>
      moveMut.mutate({
        id: node.id,
        direction,
        contextParentId: node.contextParentId,
      }),
  };

  // dagre-positioned nodes/edges for the chart — see buildGraph/
  // layoutGraph above for why this replaced react-organizational-chart.
  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    const graph = buildGraph(
      roots,
      user?.businessName || "Organisation",
      totalNodes,
      handlers,
    );
    return { nodes: layoutGraph(graph.nodes, graph.edges), edges: graph.edges };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roots, totalNodes, user?.businessName]);

  // Renders the chart's own full extent as a PNG, independent of
  // whatever's currently panned/zoomed into view — the official
  // ReactFlow export recipe (getNodesBounds + getViewportForBounds,
  // then capture the `.react-flow__viewport` element with that exact
  // transform applied) rather than html2canvas on the outer container,
  // which mishandles the CSS transform ReactFlow pans/zooms with and
  // was the direct cause of the previous "scattered" exports.
  const downloadAsImage = async () => {
    const viewportEl = chartWrapperRef.current?.querySelector<HTMLElement>(
      ".react-flow__viewport",
    );
    if (!viewportEl || flowNodes.length === 0) return;
    setDownloading(true);
    try {
      const { toPng } = await import("html-to-image");
      const padding = 48;
      const bounds = getNodesBounds(flowNodes);
      const imageWidth = Math.ceil(bounds.width + padding * 2);
      const imageHeight = Math.ceil(bounds.height + padding * 2);
      const viewport = getViewportForBounds(
        bounds,
        imageWidth,
        imageHeight,
        0.1,
        2,
        padding,
      );
      const dataUrl = await toPng(viewportEl, {
        backgroundColor: "#ffffff",
        width: imageWidth,
        height: imageHeight,
        pixelRatio: 2,
        style: {
          width: `${imageWidth}px`,
          height: `${imageHeight}px`,
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        },
      });
      const link = document.createElement("a");
      link.download = `org-structure-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      toast({
        title: "Download failed",
        description: "Couldn't generate the image. Try again.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading your organisation structure…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        Couldn't load the organisation structure right now. Try refreshing the
        page.
      </div>
    );
  }

  const { stats } = data;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Network className="h-6 w-6 text-primary" />
            Organisation Structure
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Build your company's real structure — shareholders, board,
            departments and roles — and download it as an image.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openCreate(null)}>
            <Plus className="h-4 w-4 mr-2" />
            Add node
          </Button>
          <Button
            onClick={downloadAsImage}
            disabled={downloading || totalNodes === 0}
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download as image
          </Button>
        </div>
      </div>

      {/* Type counts */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total nodes", value: stats.totalNodes },
          { label: "Shareholders", value: stats.Shareholder ?? 0 },
          { label: "Board", value: stats.Board ?? 0 },
          { label: "Departments", value: stats.Department ?? 0 },
          { label: "Roles", value: stats.Role ?? 0 },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-2xl font-bold mt-1">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="chart">
        <TabsList>
          <TabsTrigger value="chart" className="gap-2">
            <Network className="h-4 w-4" /> Org Chart
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-2">
            <ListTree className="h-4 w-4" /> All Nodes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chart" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Company Organogram</CardTitle>
              <CardDescription>
                Click Add on any node to nest something under it. Scroll to
                zoom, drag the background to pan — it opens centered and fitted
                to the whole structure.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-8">
              {roots.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Nothing here yet. Start with your top-level entities —
                    Shareholders, the Board, or your first department.
                  </p>
                  <Button onClick={() => openCreate(null)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add your first node
                  </Button>
                </div>
              ) : (
                <div
                  ref={chartWrapperRef}
                  className="h-[70vh] min-h-[420px] w-full rounded-lg border bg-white"
                >
                  <ReactFlow
                    nodes={flowNodes}
                    edges={flowEdges}
                    nodeTypes={CHART_NODE_TYPES}
                    fitView
                    fitViewOptions={{ padding: 0.15 }}
                    minZoom={0.1}
                    maxZoom={1.5}
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable={false}
                    panOnScroll
                    proOptions={{ hideAttribution: true }}
                  >
                    <Controls showInteractive={false} />
                  </ReactFlow>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">All Nodes</CardTitle>
              <CardDescription>
                Every node, indented by depth — a quick way to scan or edit
                without the diagram.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {flat.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No structure yet.
                </p>
              ) : (
                <div className="space-y-0.5">
                  {flat.map(({ node, depth }) => (
                    <div
                      key={node.id}
                      className="flex items-center gap-2 py-2 px-2 rounded-md hover:bg-muted/60"
                      style={{ paddingLeft: `${depth * 24 + 8}px` }}
                    >
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm">{node.name}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${TYPE_STYLES[node.type]}`}
                      >
                        {node.type}
                      </Badge>
                      {node.subtitle && (
                        <span className="text-xs text-muted-foreground hidden md:inline">
                          · {node.subtitle}
                        </span>
                      )}
                      <div className="ml-auto flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => openCreate(node)}
                          title="Add child"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => openEdit(node)}
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(node)}
                          title="Remove"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {formMode === "create" ? "Add node" : "Edit node"}
            </DialogTitle>
            <DialogDescription>
              {formMode === "create"
                ? "Add a shareholder, the board, a department, or a role."
                : "Update this node's details or where it sits in the structure."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={formType}
                onValueChange={(v) => setFormType(v as OrgStructureNodeType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                placeholder="e.g. Jane Doe, or Marketing Department"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Title / detail (optional)</Label>
              <Input
                placeholder="e.g. Chief Marketing Officer, or 35% ownership"
                value={formSubtitle}
                onChange={(e) => setFormSubtitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Reports to / sits under</Label>
              <p className="text-xs text-muted-foreground">
                Select one or more — connecting it to more than one makes it
                appear in both places on the chart. Leave all unchecked for a
                top-level node.
              </p>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                {flat.filter(({ node }) => !excludedParentIds.has(node.id))
                  .length === 0 && (
                  <p className="py-2 text-center text-xs text-muted-foreground">
                    No other nodes yet — this will be a top-level node.
                  </p>
                )}
                {flat
                  .filter(({ node }) => !excludedParentIds.has(node.id))
                  .map(({ node, depth }) => (
                    <label
                      key={node.id}
                      className="flex items-center gap-2.5 rounded-md p-1.5 text-sm cursor-pointer hover:bg-muted/50"
                      style={{ paddingLeft: `${depth * 14 + 6}px` }}
                    >
                      <Checkbox
                        checked={formParentIds.includes(node.id)}
                        onCheckedChange={(v) =>
                          setFormParentIds((ids) =>
                            v
                              ? [...ids, node.id]
                              : ids.filter((id) => id !== node.id),
                          )
                        }
                      />
                      <span className="flex-1">{node.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {node.type}
                      </Badge>
                    </label>
                  ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitForm}
              disabled={createMut.isPending || updateMut.isPending}
            >
              {(createMut.isPending || updateMut.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {formMode === "create" ? "Add" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDescendantCount > 0
                ? `This will also remove every node nested under it that has no other parent — up to ${deleteDescendantCount} node${deleteDescendantCount === 1 ? "" : "s"}. A node connected to another parent too stays on the chart. This can't be undone.`
                : "This can't be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMut.isPending}
              onClick={() =>
                deleteTarget &&
                deleteMut.mutate({
                  id: deleteTarget.id,
                  cascade: deleteDescendantCount > 0,
                })
              }
            >
              {deleteMut.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
