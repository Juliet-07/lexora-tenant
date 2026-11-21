import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { fetchMandates } from "@/lib/crm/mandates-api";
import { fetchTeams } from "@/lib/hr/hr-api";
import { ADR_TYPES } from "@/lib/crm/adr-api";
import {
  deleteCase,
  fetchCaseDeleteImpact,
  updateCaseDetails,
  type CaseKind,
} from "@/lib/crm/case-manage-api";

const NONE = "none";

// Only the fields both case types share, plus the type-specific ones the
// tenant would expect to correct after filing. Parties, sessions, pleadings
// etc. keep their own screens inside the case.
export function EditCaseDialog({
  kind,
  c,
  open,
  onOpenChange,
}: {
  kind: CaseKind;
  c: any;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isAdr = kind === "ADR";

  const { data: mandates = [] } = useQuery({
    queryKey: ["adr-mandates"],
    queryFn: fetchMandates,
    enabled: open,
  });
  const { data: teams = [] } = useQuery({
    queryKey: ["adr-teams"],
    queryFn: fetchTeams,
    enabled: open,
  });

  const build = () => ({
    title: c.title ?? "",
    type: c.type ?? "",
    mandateId: c.mandateId ?? "",
    teamId: c.teamId ?? "",
    claimValue: c.claimValue ?? 0,
    currency: c.currency ?? "USD",
    // ADR
    category: c.category ?? "",
    neutral: c.neutral ?? "",
    venue: c.venue ?? "",
    governingLaw: c.governingLaw ?? "",
    adrClause: c.adrClause ?? "",
    escalationPath: c.escalationPath ?? "",
    // Litigation
    court: c.court ?? "",
    courtDivision: c.courtDivision ?? "",
    courtCaseNumber: c.courtCaseNumber ?? "",
    judge: c.judge ?? "",
    registry: c.registry ?? "",
  });
  const [d, setD] = useState(build);
  useEffect(() => {
    if (open) setD(build());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, c._id]);
  const set = (k: string, v: any) => setD((p) => ({ ...p, [k]: v }));

  const saveMut = useMutation({
    mutationFn: () => {
      const team = teams.find((t) => t._id === d.teamId);
      const dto: Record<string, unknown> = {
        title: d.title.trim(),
        mandateId: d.mandateId, // "" unlinks
        claimValue: Number(d.claimValue) || 0,
        currency: d.currency,
        ...(d.teamId !== (c.teamId ?? "")
          ? { teamId: d.teamId || null, teamName: team?.name ?? "" }
          : {}),
      };
      if (isAdr) {
        Object.assign(dto, {
          type: d.type,
          category: d.category,
          neutral: d.neutral,
          venue: d.venue,
          governingLaw: d.governingLaw,
          adrClause: d.adrClause,
          escalationPath: d.escalationPath,
        });
      } else {
        Object.assign(dto, {
          court: d.court,
          courtDivision: d.courtDivision,
          courtCaseNumber: d.courtCaseNumber || undefined,
          judge: d.judge,
          registry: d.registry,
        });
      }
      return updateCaseDetails(kind, c._id, dto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({ title: `${isAdr ? "ADR" : "Litigation"} case updated` });
      onOpenChange(false);
    },
    onError: (err: any) =>
      toast({
        title: "Could not update case",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const text = (label: string, k: keyof typeof d, props: any = {}) => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        value={d[k] as any}
        onChange={(e) => set(k, e.target.value)}
        {...props}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit case</DialogTitle>
          <DialogDescription>
            {c.ref} · change the case details. Time already logged follows the
            case if you move it to another mandate.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {text("Title", "title")}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Mandate</Label>
              <Select
                value={d.mandateId || NONE}
                onValueChange={(v) => set("mandateId", v === NONE ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No mandate</SelectItem>
                  {mandates.map((m: any) => (
                    <SelectItem key={m._id} value={m._id}>
                      {m.ref} · {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Team</Label>
              <Select
                value={d.teamId || NONE}
                onValueChange={(v) => set("teamId", v === NONE ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No team</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t._id} value={t._id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {text("Claim value", "claimValue", { type: "number", min: 0 })}
            {text("Currency", "currency")}
          </div>

          {isAdr ? (
            <>
              <div>
                <Label className="text-xs">ADR type</Label>
                <Select value={d.type} onValueChange={(v) => set("type", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ADR_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {text("Category", "category")}
                {text("Neutral", "neutral")}
                {text("Venue", "venue")}
                {text("Governing law", "governingLaw")}
                {text("ADR clause", "adrClause")}
                {text("Escalation path", "escalationPath")}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {text("Court", "court")}
              {text("Division", "courtDivision")}
              {text("Court case number", "courtCaseNumber")}
              {text("Judge", "judge")}
              {text("Registry", "registry")}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={saveMut.isPending || !d.title.trim()}
            onClick={() => saveMut.mutate()}
          >
            {saveMut.isPending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const DELETE_LABELS: Record<string, string> = {
  messages: "client messages",
  drafts: "drafts",
  documents: "filed documents",
  deadlineRules: "deadline rules",
  timeEntries: "time entries",
  disbursements: "disbursements",
};

const DETACH_LABELS: Record<string, string> = {
  invoicedTimeEntries: "time entries already billed on an invoice",
  escalatedLitigationCases: "litigation case escalated from this one",
  originatingAdrCases: "ADR case this was escalated from",
};

export function DeleteCaseDialog({
  kind,
  c,
  open,
  onOpenChange,
  onDeleted,
}: {
  kind: CaseKind;
  c: any;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDeleted: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [confirmText, setConfirmText] = useState("");
  useEffect(() => {
    if (open) setConfirmText("");
  }, [open]);

  const { data: impact, isLoading } = useQuery({
    queryKey: ["caseDeleteImpact", kind, c._id],
    queryFn: () => fetchCaseDeleteImpact(kind, c._id),
    enabled: open,
    staleTime: 0,
  });

  const delMut = useMutation({
    mutationFn: () => deleteCase(kind, c._id),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({
        title: "Case deleted",
        description: `${c.ref} and everything tied to it was removed.`,
      });
      onOpenChange(false);
      onDeleted();
    },
    onError: (err: any) =>
      toast({
        title: "Could not delete case",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const deleteRows = Object.entries(impact?.willDelete ?? {}).filter(
    ([, n]) => n > 0,
  );
  const detachRows = Object.entries(impact?.willDetach ?? {}).filter(
    ([, n]) => n > 0,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> Delete case
          </DialogTitle>
          <DialogDescription>
            {c.ref} · {c.title}. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {isLoading && (
            <p className="text-muted-foreground">Checking what is linked…</p>
          )}
          {impact && (
            <>
              <div>
                <p className="font-medium">
                  The case itself, with its parties, timeline and
                  {kind === "ADR" ? " sessions" : " pleadings and court dates"},
                  is deleted along with:
                </p>
                {deleteRows.length ? (
                  <ul className="mt-1 grid grid-cols-2 gap-x-4 text-muted-foreground">
                    {deleteRows.map(([k, n]) => (
                      <li key={k}>
                        {n} {DELETE_LABELS[k] ?? k}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">
                    Nothing else is attached to this case.
                  </p>
                )}
              </div>
              {detachRows.length > 0 && (
                <div>
                  <p className="font-medium">
                    These are kept, but no longer linked to this case:
                  </p>
                  <ul className="mt-1 text-muted-foreground">
                    {detachRows.map(([k, n]) => (
                      <li key={k}>
                        {n} {DETACH_LABELS[k] ?? k}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
          <div>
            <Label>
              Type <span className="font-mono">{c.ref}</span> to confirm
            </Label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={c.ref}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={
              confirmText.trim() !== c.ref || delMut.isPending || isLoading
            }
            onClick={() => delMut.mutate()}
          >
            {delMut.isPending ? "Deleting…" : "Delete case"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
