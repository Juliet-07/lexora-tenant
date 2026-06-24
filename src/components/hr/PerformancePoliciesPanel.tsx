import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { FileText, Plus, Pencil, Trash2, Eye, Calendar } from "lucide-react";
import { toast } from "sonner";
import {
  createPolicy,
  deletePolicy,
  updatePolicy,
  usePolicies,
  type PerformancePolicy,
} from "@/lib/policiesStore";

const CATEGORIES = ["Reviews", "Improvement", "Recognition", "Goals", "General"];

interface Props {
  /** When true, hides edit/create controls (employee view). */
  readOnly?: boolean;
}

export function PerformancePoliciesPanel({ readOnly }: Props) {
  const policies = usePolicies();
  const [view, setView] = useState<PerformancePolicy | null>(null);
  const [editing, setEditing] = useState<PerformancePolicy | null>(null);
  const [open, setOpen] = useState(false);

  const blank = {
    title: "",
    category: "General",
    description: "",
    content: "",
    effectiveDate: new Date().toISOString().slice(0, 10),
  };
  const [form, setForm] = useState(blank);

  const startCreate = () => {
    setEditing(null);
    setForm(blank);
    setOpen(true);
  };

  const startEdit = (p: PerformancePolicy) => {
    setEditing(p);
    setForm({
      title: p.title,
      category: p.category,
      description: p.description,
      content: p.content,
      effectiveDate: p.effectiveDate,
    });
    setOpen(true);
  };

  const save = () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (editing) {
      updatePolicy(editing.id, form);
      toast.success("Policy updated");
    } else {
      createPolicy(form);
      toast.success("Policy created");
    }
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Define the policies that govern how performance is managed across
            the organisation.
          </p>
          <Button
            className="bg-gradient-to-r from-primary to-secondary"
            onClick={startCreate}
          >
            <Plus className="h-4 w-4 mr-2" /> New Policy
          </Button>
        </div>
      )}

      {policies.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No performance policies yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {policies.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{p.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">
                          {p.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(p.effectiveDate).toLocaleDateString(
                            "en-GB",
                            { day: "numeric", month: "short", year: "numeric" },
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {p.description}
                </p>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => setView(p)}>
                    <Eye className="h-3 w-3 mr-1" /> View
                  </Button>
                  {!readOnly && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(p)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          deletePolicy(p.id);
                          toast.success("Policy deleted");
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View sheet */}
      <Sheet open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {view && (
            <>
              <SheetHeader>
                <SheetTitle>{view.title}</SheetTitle>
                <SheetDescription>
                  {view.category} · Effective{" "}
                  {new Date(view.effectiveDate).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                    Summary
                  </p>
                  <p className="text-sm">{view.description}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                    Policy
                  </p>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {view.content}
                  </p>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create / edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Policy" : "New Performance Policy"}
            </DialogTitle>
            <DialogDescription>
              Employees will be able to view this in their performance area.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Effective date</Label>
                <Input
                  type="date"
                  value={form.effectiveDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, effectiveDate: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Summary</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Policy details</Label>
              <Textarea
                rows={6}
                value={form.content}
                onChange={(e) =>
                  setForm((f) => ({ ...f, content: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>
              {editing ? "Save Changes" : "Create Policy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
