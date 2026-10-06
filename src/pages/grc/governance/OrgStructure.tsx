import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Tree, TreeNode } from "react-organizational-chart";
import {
  Building2,
  Users,
  Network,
  ListTree,
  UserCircle2,
  Download,
  Loader2,
  ExternalLink,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  fetchOrgChart,
  type OrgChartNode,
  type EmployeeHierarchyRole,
} from "@/lib/grc/governance-api";

// ─────────────────────────────────────────────────────────────
// Organisation Structure — the real org chart, derived server-side
// from HR's own Employee records (reportsToManagerId/jobTitle/teamId),
// per the PO's explicit choice of HR-derived over a freeform
// tenant-designed structure. Read-only here: the reporting line, job
// title and team that shape this chart are managed on HR → Employees.
// ─────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<EmployeeHierarchyRole, string> = {
  owner: "Owner",
  head_of_department: "Head of Department",
  manager: "Manager",
  regular: "Employee",
};

const ROLE_STYLES: Record<EmployeeHierarchyRole, string> = {
  owner: "bg-primary/10 text-primary border-primary/30",
  head_of_department:
    "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  manager: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  regular: "bg-slate-500/10 text-slate-600 border-slate-500/30",
};

function NodeCard({ node }: { node: OrgChartNode }) {
  return (
    <Card
      className={`inline-block w-56 border ${ROLE_STYLES[node.hierarchyRole]} shadow-sm`}
    >
      <CardContent className="p-3 text-center space-y-1">
        <p className="font-semibold text-sm leading-tight">{node.name}</p>
        <Badge variant="outline" className="text-[10px]">
          {ROLE_LABEL[node.hierarchyRole]}
        </Badge>
        <p className="text-[11px] text-muted-foreground">{node.jobTitle}</p>
        {node.teamName && (
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <UserCircle2 className="h-3.5 w-3.5" />
            <span>{node.teamName}</span>
          </div>
        )}
        {node.reportCount > 0 && (
          <p className="text-[11px] text-muted-foreground">
            {node.reportCount} report{node.reportCount === 1 ? "" : "s"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ChartNode({ node }: { node: OrgChartNode }) {
  return (
    <TreeNode label={<NodeCard node={node} />}>
      {node.children.map((c) => (
        <ChartNode key={c.id} node={c} />
      ))}
    </TreeNode>
  );
}

function flatten(
  nodes: OrgChartNode[],
  depth = 0,
): { node: OrgChartNode; depth: number }[] {
  return nodes.flatMap((n) => [
    { node: n, depth },
    ...flatten(n.children, depth + 1),
  ]);
}

function countAll(nodes: OrgChartNode[]): number {
  return nodes.reduce((s, n) => s + 1 + countAll(n.children), 0);
}

export default function OrgStructure() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const chartRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["org-chart"],
    queryFn: fetchOrgChart,
  });

  const roots = data?.roots ?? [];
  const flat = useMemo(() => flatten(roots), [roots]);
  const totalInChart = useMemo(() => countAll(roots), [roots]);

  const downloadAsImage = async () => {
    if (!chartRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const el = chartRef.current;
      const canvas = await html2canvas(el, {
        backgroundColor: "#ffffff",
        scale: 2,
        width: el.scrollWidth,
        height: el.scrollHeight,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight,
      });
      const link = document.createElement("a");
      link.download = `org-structure-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL("image/png");
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
            Your real reporting hierarchy, derived from HR's employee records.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/hr/employees")}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Manage in HR
          </Button>
          <Button
            onClick={downloadAsImage}
            disabled={downloading || totalInChart === 0}
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

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Teams", value: stats.teams },
          { label: "Heads of Department", value: stats.headsOfDepartment },
          { label: "Managers", value: stats.managers },
          { label: "Total Employees", value: stats.totalEmployees },
          { label: "Teams without a Head", value: stats.teamsWithoutHead },
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
          <TabsTrigger value="tree" className="gap-2">
            <ListTree className="h-4 w-4" /> Hierarchy List
          </TabsTrigger>
          <TabsTrigger value="directory" className="gap-2">
            <Users className="h-4 w-4" /> Directory
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chart" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Company Organogram</CardTitle>
              <CardDescription>
                Visual layout of the real reporting structure. Scroll
                horizontally for wide structures.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto pb-8">
              {roots.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No reporting structure yet. Add employees with a job title,
                  team and reporting line under HR → Employees to see them here.
                </p>
              ) : (
                <div
                  ref={chartRef}
                  className="inline-block min-w-full p-4 bg-white"
                >
                  <Tree
                    lineWidth="2px"
                    lineColor="hsl(var(--border))"
                    lineBorderRadius="8px"
                    label={
                      <Card className="inline-block w-56 border-primary/40 bg-primary/5 shadow-sm">
                        <CardContent className="p-3 text-center space-y-1">
                          <Building2 className="h-4 w-4 mx-auto text-primary" />
                          <p className="font-semibold text-sm leading-tight">
                            {user?.businessName || "Organisation"}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {stats.totalEmployees} employees · {stats.teams}{" "}
                            teams
                          </p>
                        </CardContent>
                      </Card>
                    }
                  >
                    {roots.map((r) => (
                      <ChartNode key={r.id} node={r} />
                    ))}
                  </Tree>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tree" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hierarchy</CardTitle>
              <CardDescription>
                Every real reporting line, indented by depth.
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
                        className={`text-[10px] ${ROLE_STYLES[node.hierarchyRole]}`}
                      >
                        {ROLE_LABEL[node.hierarchyRole]}
                      </Badge>
                      <span className="text-xs text-muted-foreground hidden md:inline">
                        · {node.jobTitle}
                        {node.teamName ? ` · ${node.teamName}` : ""}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {node.reportCount > 0
                          ? `${node.reportCount} reports`
                          : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="directory" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Structure Directory</CardTitle>
              <CardDescription>
                Every employee in the chart, with their real team and reporting
                line.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">Name</th>
                      <th className="py-2 pr-4 font-medium">Role</th>
                      <th className="py-2 pr-4 font-medium">Job Title</th>
                      <th className="py-2 pr-4 font-medium">Team</th>
                      <th className="py-2 pr-4 font-medium">Email</th>
                      <th className="py-2 font-medium">
                        Direct + indirect reports
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {flat.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-8 text-center text-muted-foreground"
                        >
                          No employees in the chart yet.
                        </td>
                      </tr>
                    ) : (
                      flat.map(({ node }) => (
                        <tr key={node.id} className="border-b last:border-0">
                          <td className="py-2.5 pr-4 font-medium">
                            {node.name}
                          </td>
                          <td className="py-2.5 pr-4">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${ROLE_STYLES[node.hierarchyRole]}`}
                            >
                              {ROLE_LABEL[node.hierarchyRole]}
                            </Badge>
                          </td>
                          <td className="py-2.5 pr-4 text-muted-foreground">
                            {node.jobTitle}
                          </td>
                          <td className="py-2.5 pr-4 text-muted-foreground">
                            {node.teamName ?? "—"}
                          </td>
                          <td className="py-2.5 pr-4 text-muted-foreground">
                            {node.email}
                          </td>
                          <td className="py-2.5">{node.reportCount}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
