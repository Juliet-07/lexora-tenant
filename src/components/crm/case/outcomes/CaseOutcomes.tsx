import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Loader2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import {
  CaseOutcome,
  OutcomeCaseKind,
  OutcomeKind,
  daysLeft,
  downloadOutcomePdf,
  fetchCaseOutcomes,
  fmtDay,
  fmtNum,
  outcomeErrors,
  setOutcomePaymentPaid,
} from "@/lib/crm/case-outcomes-api";
import { OutcomeCase } from "./OutcomeForm";
import { SettlementPanel } from "./SettlementPanel";
import { AwardPanel } from "./AwardPanel";
import { ConsentJudgmentPanel } from "./ConsentJudgmentPanel";
import { JudgmentPanel } from "./JudgmentPanel";

export const OUTCOME_KINDS: Record<OutcomeCaseKind, OutcomeKind[]> = {
  adr: ["Settlement", "Award"],
  litigation: ["Consent judgment", "Judgment"],
};

/** Which panel / record is open. Lives in the page, above its early returns. */
export function useOutcomeUi() {
  const [panel, setPanel] = useState<OutcomeKind | null>(null);
  const [view, setView] = useState<OutcomeKind | null>(null);
  return {
    panel,
    view,
    openPanel: (k: OutcomeKind) => {
      setView(null);
      setPanel(k);
    },
    openView: (k: OutcomeKind) => setView(k),
    closePanel: () => setPanel(null),
    closeView: () => setView(null),
  };
}
export type OutcomeUi = ReturnType<typeof useOutcomeUi>;

export const useCaseOutcomes = (caseKind: OutcomeCaseKind, caseId?: string) =>
  useQuery({
    queryKey: ["caseOutcomes", caseKind, caseId],
    queryFn: () => fetchCaseOutcomes(caseKind, caseId!),
    enabled: !!caseId,
  });

const money = (n: number, cur: string) => `${cur} ${fmtNum(n)}`;
const hasPayments = (o: CaseOutcome) =>
  Array.isArray(o.form?.payments) && o.form.payments.length > 0;

function DeadlineBadge({ date }: { date: string }) {
  const n = daysLeft(date.slice(0, 10));
  if (n < 0) return <Badge variant="destructive">{Math.abs(n)}d overdue</Badge>;
  if (n <= 7)
    return <Badge className="bg-amber-500 hover:bg-amber-500">{n}d left</Badge>;
  return <Badge variant="secondary">{n}d left</Badge>;
}

function PaymentsList({
  o,
  caseKind,
  caseId,
}: {
  o: CaseOutcome;
  caseKind: OutcomeCaseKind;
  caseId: string;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const mut = useMutation({
    mutationFn: (v: { index: number; paid: boolean }) =>
      setOutcomePaymentPaid(caseKind, caseId, o.kind, v.index, v.paid),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["caseOutcomes", caseKind, caseId] }),
    onError: (e) =>
      toast({
        title: "Could not update the payment",
        description: outcomeErrors(e)[0],
        variant: "destructive",
      }),
  });
  const rows: any[] = o.form.payments ?? [];
  return (
    <div className="space-y-1.5">
      {rows.map((p, i) => (
        <label
          key={i}
          className="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm"
        >
          <Checkbox
            checked={!!p.paid}
            disabled={mut.isPending || o.status !== "Recorded"}
            onCheckedChange={(v) => mut.mutate({ index: i, paid: !!v })}
          />
          <span className="flex-1">
            {money(p.amount, o.currency)}
            <span className="text-muted-foreground">
              {" "}
              · due {fmtDay(p.dueOn) || "no date"}
              {p.method ? ` · ${p.method}` : ""}
            </span>
          </span>
          {p.paid ? (
            <Badge variant="secondary">
              Paid{p.paidOn ? ` ${fmtDay(p.paidOn)}` : ""}
            </Badge>
          ) : p.dueOn && daysLeft(p.dueOn) < 0 ? (
            <Badge variant="destructive">Overdue</Badge>
          ) : (
            <Badge variant="outline">Due</Badge>
          )}
        </label>
      ))}
    </div>
  );
}

function ViewSheet({
  o,
  caseKind,
  c,
  onClose,
  onEdit,
}: {
  o: CaseOutcome | undefined;
  caseKind: OutcomeCaseKind;
  c: OutcomeCase;
  onClose: () => void;
  onEdit: () => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const pdf = async () => {
    if (!o) return;
    setBusy(true);
    try {
      await downloadOutcomePdf(
        caseKind,
        c._id,
        o.kind,
        `${c.ref}-${o.kind.toLowerCase().replace(/\s+/g, "-")}.pdf`,
      );
    } catch (e) {
      toast({
        title: "Could not download the record",
        description: outcomeErrors(e)[0],
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open={!!o} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[620px]">
        {o && (
          <>
            <SheetHeader className="border-b px-5 py-4 text-left">
              <SheetTitle className="flex items-center gap-2">
                {o.kind}
                <Badge
                  variant={o.status === "Recorded" ? "default" : "outline"}
                >
                  {o.status}
                </Badge>
                {o.version > 1 && (
                  <Badge variant="secondary">v{o.version}</Badge>
                )}
              </SheetTitle>
              <SheetDescription>
                {c.ref} · {o.subtype}
                {o.recordedAt &&
                  ` · recorded ${fmtDay(o.recordedAt)}${o.recordedBy?.name ? ` by ${o.recordedBy.name}` : ""}`}
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
              {o.deadlines.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-sm font-semibold">Key dates</h4>
                  {o.deadlines.map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    >
                      <span>
                        {d.label}
                        <span className="text-muted-foreground">
                          {" "}
                          · {fmtDay(d.date)}
                        </span>
                      </span>
                      <DeadlineBadge date={d.date} />
                    </div>
                  ))}
                </div>
              )}
              {hasPayments(o) && (
                <div className="space-y-1.5">
                  <h4 className="text-sm font-semibold">Payments</h4>
                  <PaymentsList o={o} caseKind={caseKind} caseId={c._id} />
                </div>
              )}
              {o.sections.map((s) => (
                <div key={s.h} className="space-y-2">
                  <h4 className="text-sm font-semibold">{s.h}</h4>
                  {s.rows.length > 0 && (
                    <dl className="divide-y rounded-md border text-sm">
                      {s.rows.map(([k, v], i) => (
                        <div
                          key={i}
                          className="grid grid-cols-[170px_1fr] gap-3 px-3 py-2"
                        >
                          <dt className="text-muted-foreground">{k}</dt>
                          <dd className="whitespace-pre-wrap break-words">
                            {v}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {s.tables.map((t, ti) => (
                    <div key={ti} className="overflow-x-auto rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                          <tr>
                            {t.head.map((h, i) => (
                              <th key={i} className="px-3 py-1.5 font-medium">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {t.rows.map((r, ri) => (
                            <tr key={ri} className="border-t">
                              {r.map((cell, ci) => (
                                <td key={ci} className="px-3 py-1.5">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                  {s.ticks.length > 0 && (
                    <ul className="space-y-1 text-sm">
                      {s.ticks.map((t, i) => (
                        <li key={i}>✓ {t}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
              {o.documentName && (
                <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{o.documentName}</span>
                  {o.documentUrl && (
                    <Button asChild size="sm" variant="ghost">
                      <a href={o.documentUrl} target="_blank" rel="noreferrer">
                        Open
                      </a>
                    </Button>
                  )}
                </div>
              )}
              <div className="space-y-1.5">
                <h4 className="text-sm font-semibold">Sharing history</h4>
                {o.shared.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Not shared yet.
                  </p>
                ) : (
                  o.shared
                    .slice()
                    .reverse()
                    .map((s) => (
                      <div
                        key={s._id}
                        className="rounded-md border px-3 py-2 text-sm"
                      >
                        <p>{s.text}</p>
                        <p className="text-xs text-muted-foreground">
                          {fmtDay(s.at)}
                          {s.by?.name ? ` · ${s.by.name}` : ""}
                          {s.emailsFailed.length > 0 &&
                            ` · failed: ${s.emailsFailed.join(", ")}`}
                        </p>
                      </div>
                    ))
                )}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 border-t px-5 py-3">
              <Button
                variant="outline"
                disabled={busy || o.status !== "Recorded"}
                onClick={pdf}
              >
                {busy ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-1.5 h-4 w-4" />
                )}
                Download PDF
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                <Button onClick={onEdit}>
                  <Pencil className="mr-1.5 h-4 w-4" />
                  {o.status === "Draft" ? "Continue" : "Edit / share"}
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/**
 * The outcomes recorded on a case, the four forms that record them and the
 * sheet that shows a record. One place, shared by the ADR and the
 * litigation page.
 */
export function CaseOutcomes({
  caseKind,
  c,
  ui,
  onSaved,
  showCard = true,
}: {
  caseKind: OutcomeCaseKind;
  c: OutcomeCase;
  ui: OutcomeUi;
  onSaved: () => void;
  showCard?: boolean;
}) {
  const { data: res } = useCaseOutcomes(caseKind, c._id);
  const outcomes = res?.outcomes ?? [];
  const byKind = (k: OutcomeKind | null) => outcomes.find((o) => o.kind === k);
  const viewing = byKind(ui.view);
  const panelProps = {
    c,
    res,
    onSaved,
    onClose: ui.closePanel,
  };

  return (
    <>
      {showCard && outcomes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recorded outcomes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {outcomes.map((o) => {
              const next = o.deadlines
                .filter((d) => daysLeft(d.date.slice(0, 10)) >= -30)
                .sort((a, b) => a.date.localeCompare(b.date))[0];
              const paid = hasPayments(o)
                ? `${o.form.payments.filter((p: any) => p.paid).length}/${o.form.payments.length} paid`
                : "";
              return (
                <div
                  key={o._id}
                  className="flex flex-wrap items-center gap-3 rounded-md border px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {o.kind}
                      <Badge
                        variant={
                          o.status === "Recorded" ? "default" : "outline"
                        }
                      >
                        {o.status}
                      </Badge>
                      {o.version > 1 && (
                        <Badge variant="secondary">v{o.version}</Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {[
                        o.subtype,
                        o.amount ? money(o.amount, o.currency) : "",
                        paid,
                        o.occurredOn ? fmtDay(o.occurredOn) : "",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {next && o.status === "Recorded" && (
                      <p className="mt-1 flex items-center gap-2 text-xs">
                        {next.label} · {fmtDay(next.date)}{" "}
                        <DeadlineBadge date={next.date} />
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => ui.openView(o.kind)}
                  >
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => ui.openPanel(o.kind)}
                  >
                    {o.status === "Draft" ? "Continue" : "Edit"}
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <ViewSheet
        o={viewing}
        caseKind={caseKind}
        c={c}
        onClose={ui.closeView}
        onEdit={() => viewing && ui.openPanel(viewing.kind)}
      />

      {caseKind === "adr" ? (
        <>
          <SettlementPanel
            {...panelProps}
            open={ui.panel === "Settlement"}
            existing={byKind("Settlement")}
          />
          <AwardPanel
            {...panelProps}
            open={ui.panel === "Award"}
            existing={byKind("Award")}
          />
        </>
      ) : (
        <>
          <ConsentJudgmentPanel
            {...panelProps}
            open={ui.panel === "Consent judgment"}
            existing={byKind("Consent judgment")}
          />
          <JudgmentPanel
            {...panelProps}
            open={ui.panel === "Judgment"}
            existing={byKind("Judgment")}
          />
        </>
      )}
    </>
  );
}
