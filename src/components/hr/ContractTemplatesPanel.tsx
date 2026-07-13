import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Trash2, Loader2, Pencil, FileText } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  fetchContractTemplates,
  fetchAvailableMergeFields,
  createContractTemplate,
  updateContractTemplate,
  deleteContractTemplate,
  type ContractTemplate,
  type WorkerCategory,
} from "@/lib/hr-contracts-api";

export function ContractTemplatesPanel() {
  return (
    <Tabs defaultValue="employee" className="space-y-4">
      <TabsList>
        <TabsTrigger value="employee">Employee Templates</TabsTrigger>
        <TabsTrigger value="consultant">Consultant Templates</TabsTrigger>
      </TabsList>
      <TabsContent value="employee">
        <TemplateList workerCategory="employee" />
      </TabsContent>
      <TabsContent value="consultant">
        <TemplateList workerCategory="consultant" />
      </TabsContent>
    </Tabs>
  );
}

function TemplateList({ workerCategory }: { workerCategory: WorkerCategory }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ContractTemplate | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["contract-templates", workerCategory],
    queryFn: () => fetchContractTemplates(workerCategory),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteContractTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-templates"] });
      toast.success("Template removed.");
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Templates for{" "}
          {workerCategory === "consultant" ? "consultants" : "employees"}. Use
          merge fields like{" "}
          <code className="text-xs bg-muted px-1 rounded">
            {"{{employeeName}}"}
          </code>{" "}
          — they'll be filled in automatically when a contract is generated.
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
            No templates yet for this category.
          </CardContent>
        </Card>
      ) : (
        templates.map((t) => (
          <Card key={t._id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">{t.name}</h3>
                  {!t.isActive && (
                    <Badge variant="secondary" className="text-[10px]">
                      Inactive
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {t.category ?? "contract"}
                  </Badge>
                  {t.requiresSignature === false && (
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-info/10 text-info border-info/20"
                    >
                      No signature needed
                    </Badge>
                  )}
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
              {t.description && (
                <p className="text-xs text-muted-foreground">{t.description}</p>
              )}
              <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/30 rounded p-2 font-mono">
                {t.body}
              </p>
            </CardContent>
          </Card>
        ))
      )}

      {(editing || creatingNew) && (
        <TemplateEditorDialog
          template={editing}
          workerCategory={workerCategory}
          onClose={() => {
            setEditing(null);
            setCreatingNew(false);
          }}
        />
      )}
    </div>
  );
}

function TemplateEditorDialog({
  template,
  workerCategory,
  onClose,
}: {
  template: ContractTemplate | null;
  workerCategory: WorkerCategory;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [body, setBody] = useState(template?.body ?? "");
  const [category, setCategory] = useState<"contract" | "letter">(
    template?.category ?? "contract",
  );
  const [requiresSignature, setRequiresSignature] = useState(
    template?.requiresSignature ?? true,
  );

  const { data: mergeFields = [] } = useQuery({
    queryKey: ["contract-merge-fields"],
    queryFn: fetchAvailableMergeFields,
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      template
        ? updateContractTemplate(template._id, {
            name,
            description,
            body,
            category,
            requiresSignature,
          })
        : createContractTemplate({
            name,
            workerCategory,
            body,
            description,
            category,
            requiresSignature,
          }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-templates"] });
      onClose();
      toast.success("Template saved.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to save template"),
  });

  const insertField = (field: string) => {
    setBody((prev) => `${prev}{{${field}}}`);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? "Edit Template" : "New Template"}
          </DialogTitle>
          <DialogDescription>
            For {workerCategory === "consultant" ? "consultants" : "employees"}.
            Click a merge field below to insert it into the body.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input
              placeholder="e.g. Permanent Employment Agreement"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Description (shown in the template picker)</Label>
            <Input
              placeholder="e.g. Standard full-time agreement"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(v) => {
                  const next = v as "contract" | "letter";
                  setCategory(next);
                  setRequiresSignature(next === "contract");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contract">
                    Contract (both parties sign)
                  </SelectItem>
                  <SelectItem value="letter">
                    Letter (you sign only — warnings, suspension, etc.)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Requires recipient signature?</Label>
              <Select
                value={requiresSignature ? "yes" : "no"}
                onValueChange={(v) => setRequiresSignature(v === "yes")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No — issued by you only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {!requiresSignature && (
            <div className="rounded-md bg-info/10 border border-info/20 text-info text-xs p-2">
              This becomes a one-way letter: when generated for someone, you add
              your own signature/stamp and it's emailed to them immediately as a
              PDF — no signing link, no waiting on a reply.
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {mergeFields.map((f) => (
              <Button
                key={f}
                size="sm"
                variant="outline"
                className="h-6 text-[11px]"
                onClick={() => insertField(f)}
              >
                {`{{${f}}}`}
              </Button>
            ))}
          </div>

          <div className="space-y-1">
            <Label>Body</Label>
            <Textarea
              rows={14}
              className="font-mono text-sm"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Dear {{employeeName}}, this agreement confirms your employment as {{jobTitle}}..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!name || !body || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? (
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
