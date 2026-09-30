import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Eye, FileText, Plus, Loader2, Clock, Trash2 } from "lucide-react";
import {
  fetchBoardTrainingModules,
  createBoardTrainingModule,
  deleteBoardTrainingModule,
  resolveGrcFileUrl,
  type BoardTrainingModule,
} from "@/lib/grc/governance-api";

// ─────────────────────────────────────────────────────────────
// TRAINING MODULES — the tenant's own mandatory-training catalog for
// Step 4 of onboarding. Tenant-wide, not scoped to one director (every
// director gets the same modules), unlike documentsToSign/induction
// pack, which is why this lives here rather than on a director's own
// detail page. Real, tenant-authored content replaces the fixed
// AML/CFT/Privacy/Anti-Bribery placeholder list this used to be.
// ─────────────────────────────────────────────────────────────

export function TrainingModulesTab() {
  const queryClient = useQueryClient();
  const { data: modules = [], isLoading } = useQuery({
    queryKey: ["board-training-modules"],
    queryFn: fetchBoardTrainingModules,
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["board-training-modules"] });

  const createMutation = useMutation({
    mutationFn: () =>
      createBoardTrainingModule(
        title.trim(),
        description.trim(),
        file ?? undefined,
      ),
    onSuccess: () => {
      invalidate();
      setTitle("");
      setDescription("");
      setFile(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBoardTrainingModule(id),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5 space-y-3">
          <h3 className="text-sm font-semibold">Add a training module</h3>
          <p className="text-xs text-muted-foreground">
            Every director must mark all of these complete before their
            onboarding can move on to the induction pack. Attach a resource
            (slides, a PDF, a recording) or a link if you have one — a module
            with nothing attached is still completable by the director as
            self-attestation.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input
              placeholder="Module title (e.g. AML / CFT Awareness)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              placeholder="Pass mark, duration, or other short note (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <label>
              <input
                type="file"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <span className="inline-flex items-center gap-1.5 text-xs border rounded px-3 py-1.5 cursor-pointer hover:bg-muted/50">
                <FileText className="h-3 w-3" />
                {file ? file.name : "Attach a resource (optional)"}
              </span>
            </label>
            <Button
              size="sm"
              disabled={!title.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5 mr-1.5" />
              )}
              Add module
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : modules.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-sm font-semibold">No training modules yet</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Directors will have nothing required at Step 4 until you add at
              least one module above.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {modules.map((m: BoardTrainingModule) => (
            <div
              key={m._id}
              className="flex items-center justify-between rounded-lg border p-3 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{m.title}</p>
                {m.description && (
                  <p className="text-xs text-muted-foreground truncate">
                    {m.description}
                  </p>
                )}
                {m.resourceUrl && (
                  <Badge variant="outline" className="mt-1 text-[10px]">
                    Resource attached
                  </Badge>
                )}
              </div>
              <button onClick={() => deleteMutation.mutate(m._id)}>
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}