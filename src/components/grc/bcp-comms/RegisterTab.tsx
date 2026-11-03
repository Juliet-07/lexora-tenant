import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  COMMS_KEY,
  deleteCommsContact,
  deleteCommsGroup,
  errMessage,
  reorderCommsGroups,
  type CommsGroup,
} from "@/lib/grc/bcp-comms-api";
import { Chip, GroupIcon, slaText, useConfirm } from "./commsUi";
import { ContactDialog, GroupDialog } from "./dialogs";

export function RegisterTab({ groups }: { groups: CommsGroup[] }) {
  const qc = useQueryClient();
  const [confirmNode, confirm] = useConfirm();
  const [edit, setEdit] = useState<{ g: CommsGroup | null } | null>(null);
  const [addTo, setAddTo] = useState<CommsGroup | null>(null);
  const done = () => qc.invalidateQueries({ queryKey: [COMMS_KEY] });
  const fail = (e: unknown) =>
    toast({ title: errMessage(e), variant: "destructive" });

  const move = useMutation({
    mutationFn: (ids: string[]) => reorderCommsGroups(ids),
    onSuccess: done,
    onError: fail,
  });
  const delGroup = useMutation({
    mutationFn: deleteCommsGroup,
    onSuccess: () => {
      done();
      toast({ title: "Stakeholder group removed" });
    },
    onError: fail,
  });
  const delContact = useMutation({
    mutationFn: deleteCommsContact,
    onSuccess: done,
    onError: fail,
  });

  const shift = (i: number, d: -1 | 1) => {
    const ids = groups.map((g) => g._id);
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    move.mutate(ids);
  };

  return (
    <div className="space-y-3">
      {confirmNode}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Stakeholder register</h3>
          <p className="text-xs text-muted-foreground">
            The order here is the order in which stakeholders are notified.
          </p>
        </div>
        <Button size="sm" onClick={() => setEdit({ g: null })}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add stakeholder group
        </Button>
      </div>

      {groups.length === 0 && (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          No stakeholder groups yet.
        </div>
      )}

      {groups.map((g, i) => (
        <div key={g._id} className="rounded-lg border bg-card">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex flex-col">
              <button
                type="button"
                aria-label="Move up"
                disabled={i === 0 || move.isPending}
                onClick={() => shift(i, -1)}
                className="text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="Move down"
                disabled={i === groups.length - 1 || move.isPending}
                onClick={() => shift(i, 1)}
                className="text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>
            <GroupIcon icon={g.icon} color={g.color} />
            <div className="min-w-[220px] flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{g.name}</span>
                {g.approvalMinLevel > 0 && (
                  <Chip tone="purple">
                    {g.approvalMinLevel === 1
                      ? "Approval always"
                      : `Approval from L${g.approvalMinLevel}`}
                  </Chip>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {slaText(g.slaHours, g.reactive)} · {g.channel}
                {g.ownerName
                  ? ` · Lead: ${g.ownerName}`
                  : " · No lead assigned"}
              </div>
              <div className="text-xs text-muted-foreground">
                Brought in: {g.triggerText || "never automatically"}
              </div>
            </div>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEdit({ g })}
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() =>
                  confirm({
                    title: `Remove ${g.name}?`,
                    text: "Its contacts are removed too. A group with communications on record cannot be removed.",
                    label: "Remove",
                    danger: true,
                    run: () => delGroup.mutate(g._id),
                  })
                }
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="border-t bg-muted/20 px-4 py-2.5">
            {g.source === "crm_clients" ? (
              <p className="text-[13px] text-muted-foreground">
                Recipients are the clients in CRM
                {g.clientCount !== undefined && (
                  <>
                    : <b className="text-foreground">{g.clientCount}</b> with an
                    email address
                  </>
                )}
                . You choose which ones when you write the notice.
              </p>
            ) : (
              <>
                {(g.contacts ?? []).map((c) => (
                  <div
                    key={c._id}
                    className="flex items-center justify-between gap-3 py-1 text-[13px]"
                  >
                    <span className="min-w-0 truncate">
                      <b>{c.name}</b>{" "}
                      <span className="text-xs text-muted-foreground">
                        {[c.role, c.email, c.phone].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${c.name}`}
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        confirm({
                          title: `Remove ${c.name}?`,
                          text: "Past notices keep their record of this contact.",
                          label: "Remove",
                          danger: true,
                          run: () => delContact.mutate(c._id),
                        })
                      }
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {!(g.contacts ?? []).length && (
                  <p className="py-1 text-[13px] text-muted-foreground">
                    No contacts yet. Add the people who should receive notices.
                  </p>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-1 h-7 px-2"
                  onClick={() => setAddTo(g)}
                >
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                  Add contact
                </Button>
              </>
            )}
          </div>
        </div>
      ))}

      <GroupDialog
        open={!!edit}
        group={edit?.g ?? null}
        onClose={() => setEdit(null)}
      />
      <ContactDialog group={addTo} onClose={() => setAddTo(null)} />
    </div>
  );
}
