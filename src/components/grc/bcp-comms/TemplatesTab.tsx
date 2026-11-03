import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  COMMS_KEY,
  deleteCommsTemplate,
  errMessage,
  type CommsGroup,
  type CommsTemplate,
} from "@/lib/grc/bcp-comms-api";
import { Chip, useConfirm } from "./commsUi";
import { TemplateDialog } from "./dialogs";

export function TemplatesTab({
  templates,
  groups,
  incidentRef,
  canUse,
  onUse,
}: {
  templates: CommsTemplate[];
  groups: CommsGroup[];
  incidentRef: string | null;
  canUse: boolean;
  onUse: (t: CommsTemplate) => void;
}) {
  const qc = useQueryClient();
  const [confirmNode, confirm] = useConfirm();
  const [edit, setEdit] = useState<{ t: CommsTemplate | null } | null>(null);
  const [preview, setPreview] = useState<CommsTemplate | null>(null);
  const del = useMutation({
    mutationFn: deleteCommsTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [COMMS_KEY] });
      toast({ title: "Template removed" });
    },
    onError: (e) => toast({ title: errMessage(e), variant: "destructive" }),
  });
  return (
    <div className="space-y-3">
      {confirmNode}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Notification templates</h3>
          <p className="text-xs text-muted-foreground">
            Starting wording for each stakeholder. Text in [square brackets]
            must be completed before a notice can be approved.
          </p>
        </div>
        <Button size="sm" onClick={() => setEdit({ t: null })}>
          <Plus className="mr-1.5 h-4 w-4" />
          New template
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {templates.map((t) => (
          <div
            key={t._id}
            className="flex flex-col rounded-lg border bg-card p-4"
          >
            <div className="flex items-start gap-2">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{t.name}</div>
                <div className="text-xs text-muted-foreground">
                  {t.description}
                </div>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Chip tone={t.groupId ? "primary" : "grey"}>
                {t.groupName || "Any stakeholder"}
              </Chip>
              {t.edited && <Chip tone="amber">Edited</Chip>}
            </div>
            <div className="mt-auto flex flex-wrap gap-2 pt-3">
              <Button size="sm" variant="outline" onClick={() => setPreview(t)}>
                Preview
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEdit({ t })}
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
              {canUse && incidentRef && (
                <Button size="sm" onClick={() => onUse(t)}>
                  Use for {incidentRef}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Delete ${t.name}`}
                className="text-destructive hover:text-destructive"
                onClick={() =>
                  confirm({
                    title: `Delete ${t.name}?`,
                    text: "Notices already written from it are not affected.",
                    label: "Delete",
                    danger: true,
                    run: () => del.mutate(t._id),
                  })
                }
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {templates.length === 0 && (
          <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground md:col-span-2">
            No templates yet.
          </div>
        )}
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>{preview?.name}</DialogTitle>
            <DialogDescription>Subject: {preview?.subject}</DialogDescription>
          </DialogHeader>
          <pre className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 font-sans text-[13.5px] leading-relaxed">
            {preview?.body}
          </pre>
        </DialogContent>
      </Dialog>
      <TemplateDialog
        open={!!edit}
        template={edit?.t ?? null}
        groups={groups}
        onClose={() => setEdit(null)}
      />
    </div>
  );
}
