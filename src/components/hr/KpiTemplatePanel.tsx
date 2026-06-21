import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Trash2, Loader2, Target, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  fetchAllKpiTemplates,
  upsertKpiTemplate,
  deleteKpiTemplate,
  type KpiTemplate,
  type KpiDefinition,
} from "@/lib/hr-performance-api";

export function KpiTemplatesPanel() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<KpiTemplate | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["kpi-templates"],
    queryFn: fetchAllKpiTemplates,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteKpiTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-templates"] });
      toast.success("Template removed.");
    },
  });

  const upsertMutation = useMutation({
    mutationFn: upsertKpiTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-templates"] });
      setEditing(null);
      setCreatingNew(false);
      toast.success("KPI template saved.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to save template"),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          One KPI set per job title. Weights must sum to 100%. New review cycles
          snapshot these onto each employee's review — later edits here don't
          change reviews already created.
        </p>
        <Button variant="outline" onClick={() => setCreatingNew(true)}>
          <Plus className="h-3.5 w-3.5 mr-2" /> New Template
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading templates…</span>
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No KPI templates configured yet. Create one per job title before
            launching a review cycle.
          </CardContent>
        </Card>
      ) : (
        templates.map((t) => {
          const totalWeight = t.kpis.reduce((s, k) => s + k.weight, 0);
          return (
            <Card key={t._id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold">{t.jobTitle}</h3>
                    <Badge
                      variant="outline"
                      className={
                        Math.abs(totalWeight - 1) < 0.01
                          ? "bg-success/10 text-success border-success/20"
                          : "bg-warning/10 text-warning border-warning/20"
                      }
                    >
                      {(totalWeight * 100).toFixed(0)}% total
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(t)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(t._id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {t.kpis.map((k) => (
                    <div key={k.key} className="border rounded-md p-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{k.title}</span>
                        <span className="text-muted-foreground">
                          {(k.weight * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-0.5 line-clamp-2">
                        {k.performanceStandard}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      {(editing || creatingNew) && (
        <KpiTemplateEditorDialog
          template={editing}
          onClose={() => {
            setEditing(null);
            setCreatingNew(false);
          }}
          onSave={(dto) => upsertMutation.mutate(dto)}
          saving={upsertMutation.isPending}
        />
      )}
    </div>
  );
}

function KpiTemplateEditorDialog({
  template,
  onClose,
  onSave,
  saving,
}: {
  template: KpiTemplate | null;
  onClose: () => void;
  onSave: (dto: { jobTitle: string; kpis: KpiDefinition[] }) => void;
  saving: boolean;
}) {
  const [jobTitle, setJobTitle] = useState(template?.jobTitle ?? "");
  const [kpis, setKpis] = useState<KpiDefinition[]>(template?.kpis ?? []);

  const addKpi = () =>
    setKpis((prev) => [
      ...prev,
      {
        key: `kpi_${Date.now()}`,
        title: "",
        performanceStandard: "",
        weight: 0,
      },
    ]);

  const updateKpi = (key: string, patch: Partial<KpiDefinition>) =>
    setKpis((prev) =>
      prev.map((k) => (k.key === key ? { ...k, ...patch } : k)),
    );

  const removeKpi = (key: string) =>
    setKpis((prev) => prev.filter((k) => k.key !== key));

  const totalWeight = kpis.reduce((s, k) => s + (k.weight || 0), 0);
  const weightValid = Math.abs(totalWeight - 1) < 0.01;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? "Edit KPI Template" : "New KPI Template"}
          </DialogTitle>
          <DialogDescription>
            Define the KPIs for this job title. Weights are entered as
            percentages and must sum to 100%.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Job title</Label>
            <Input
              placeholder="e.g. Packhouse Manager"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              disabled={!!template}
            />
            {template && (
              <p className="text-xs text-muted-foreground">
                Job title can't be changed after creation — delete and recreate
                if needed.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <Label>
              KPIs{" "}
              <span className={weightValid ? "text-success" : "text-warning"}>
                ({(totalWeight * 100).toFixed(0)}% of 100%)
              </span>
            </Label>
            <Button size="sm" variant="outline" onClick={addKpi}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add KPI
            </Button>
          </div>

          {kpis.map((k) => (
            <div
              key={k.key}
              className="border rounded-lg p-3 space-y-2 bg-muted/20"
            >
              <div className="flex items-center gap-2">
                <Input
                  placeholder="KPI title"
                  value={k.title}
                  onChange={(e) => updateKpi(k.key, { title: e.target.value })}
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="Weight %"
                  className="w-28"
                  value={k.weight ? Math.round(k.weight * 100) : ""}
                  onChange={(e) =>
                    updateKpi(k.key, {
                      weight: (parseFloat(e.target.value) || 0) / 100,
                    })
                  }
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeKpi(k.key)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
              <Input
                placeholder="Performance standard — what's expected for this KPI"
                value={k.performanceStandard}
                onChange={(e) =>
                  updateKpi(k.key, { performanceStandard: e.target.value })
                }
              />
            </div>
          ))}

          {kpis.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No KPIs added yet.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!jobTitle || kpis.length === 0 || !weightValid || saving}
            onClick={() => onSave({ jobTitle, kpis })}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Save Template"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
