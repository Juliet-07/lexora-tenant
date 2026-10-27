import type { ReactNode } from "react";
import { Download, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ReportAction, ReportCommentary, ReportRisk } from "@/lib/crm/report-api";
import {
  BudgetSection,
  CashFlowSection,
  CostsSection,
  KpisSection,
  PayablesSection,
  ReceivablesSection,
  RevenueSection,
  SummarySection,
} from "./ManagementSections";
import { Pill, useReport } from "./shared";

const Section = ({ n, title, children }: { n: number; title: string; children: ReactNode }) => (
  <section className="space-y-3">
    <h3 className="border-b-2 border-primary/30 pb-1 text-base font-bold">
      {n}. {title}
    </h3>
    {children}
  </section>
);

const Commentary = ({ text }: { text: string }) =>
  text.trim() ? (
    <div className="rounded-md border-l-4 border-primary/40 bg-muted/40 p-3 text-sm leading-relaxed">
      {text.split(/\n{2,}/).map((p, i) => (
        <p key={i} className={i ? "mt-2" : ""}>
          {p}
        </p>
      ))}
    </div>
  ) : null;

const fmtDue = (d: string) => {
  if (!d) return "";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
};

// Full-screen read-only view of the report exactly as it is assembled
// for the PDF: the same data blocks, with the author's commentary as
// text. Reads the in-progress commentary, so unsaved edits show too.
export function ManagementPreview({
  open,
  onOpenChange,
  commentary,
  risks,
  actions,
  onDownload,
  onEmail,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  commentary: ReportCommentary;
  risks: ReportRisk[];
  actions: ReportAction[];
  onDownload: () => void;
  onEmail: () => void;
}) {
  const { pack } = useReport();
  const m = pack.meta;
  const live = risks.filter((r) => r.text.trim());
  const todo = actions.filter((a) => a.text.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Management Report — {m.periodLabel}</DialogTitle>
          <DialogDescription>
            Preview of what the Board receives. Amounts in {m.currency}
            {m.currency !== m.baseCurrency ? ` (converted from ${m.baseCurrency} at ${m.rate.toFixed(4)})` : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 pb-2">
          <Section n={1} title="CEO / Managing Director's message">
            {commentary.ceoMessage.trim() ? (
              <Commentary text={commentary.ceoMessage} />
            ) : (
              <p className="text-sm italic text-muted-foreground">No message written yet.</p>
            )}
          </Section>

          <Section n={2} title="Executive summary and income statement">
            <SummarySection />
          </Section>

          <Section n={3} title="Revenue analysis">
            <RevenueSection />
            <Commentary text={commentary.revenue} />
          </Section>

          <Section n={4} title="Cost analysis">
            <CostsSection />
            <Commentary text={commentary.costs} />
          </Section>

          <Section n={5} title="Cash flow">
            <CashFlowSection />
            <Commentary text={commentary.cashflow} />
          </Section>

          <Section n={6} title="Receivables aging">
            <ReceivablesSection />
            <Commentary text={commentary.receivables} />
          </Section>

          <Section n={7} title="Payables aging">
            <PayablesSection />
            <Commentary text={commentary.payables} />
          </Section>

          <Section n={8} title="Budget vs actual">
            <BudgetSection />
            <Commentary text={commentary.budget} />
          </Section>

          <Section n={9} title="Key performance indicators">
            <KpisSection />
          </Section>

          <Section n={10} title="Risks and issues">
            {live.length ? (
              <div className="space-y-2">
                {live.map((r, i) => (
                  <div key={i} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <b>{r.text}</b>
                      <Pill tone={r.severity === "high" ? "red" : r.severity === "medium" ? "amber" : "green"}>
                        {r.severity[0].toUpperCase() + r.severity.slice(1)}
                      </Pill>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[r.owner && `Owner: ${r.owner}`, r.likelihood && `Likelihood: ${r.likelihood}`].filter(Boolean).join(" · ")}
                    </p>
                    {r.impact && (
                      <p className="mt-1 text-xs">
                        <b>Impact:</b> {r.impact}
                      </p>
                    )}
                    {r.mitigation && (
                      <p className="mt-0.5 text-xs">
                        <b>Mitigation:</b> {r.mitigation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm italic text-muted-foreground">No risks recorded.</p>
            )}
          </Section>

          <Section n={11} title="Actions for next period">
            {todo.length ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2">Priority</th>
                    <th className="py-2">Action</th>
                    <th className="py-2">Owner</th>
                    <th className="py-2">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {todo.map((a, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-2 capitalize">{a.priority}</td>
                      <td className="py-2">{a.text}</td>
                      <td className="py-2">{a.owner || "—"}</td>
                      <td className="py-2">{fmtDue(a.due) || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm italic text-muted-foreground">No actions recorded.</p>
            )}
          </Section>
        </div>

        <div className="sticky bottom-0 -mx-6 flex justify-end gap-2 border-t bg-background px-6 py-3">
          <Button variant="outline" onClick={onDownload}>
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
          <Button onClick={onEmail}>
            <Mail className="mr-2 h-4 w-4" /> Email to Board
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
