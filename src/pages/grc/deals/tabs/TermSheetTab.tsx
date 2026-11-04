import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, FileSignature, Sparkles } from "lucide-react";
import { GenerateTermSheetDialog } from "@/components/grc/GenerateTermSheetDialog";
import { DealContractDialog } from "@/components/grc/DealContractDialog";
import { DocReviewBadge } from "@/components/grc/DocReviewBadge";
import type { Deal, TermSheet } from "@/lib/grc/deals-api";

// The deal's term sheets. A term sheet is a document in its own right: it
// is generated from a "Term sheets" template the platform admin publishes,
// filled in from the deal, completed on its Fields tab, sent to the parties
// for review and exported — exactly like a contract, but kept apart from
// the contracts and never merged into them.
const LEGACY_FIELDS: [string, keyof TermSheet][] = [
  ["Structure", "structure"],
  ["Consideration", "consideration"],
  ["Conditions", "conditions"],
  ["Exclusivity", "exclusivity"],
  ["Confidentiality", "confidentiality"],
  ["Timeline", "timeline"],
];

export default function TermSheetTab({ deal }: { deal: Deal }) {
  const [generateOpen, setGenerateOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const termSheets = (deal.contracts ?? []).filter(
    (c) => c.kind === "term_sheet",
  );

  // Notes typed into the older six-box term sheet stay readable.
  const legacy = LEGACY_FIELDS.filter(([, k]) =>
    String(deal.termSheet?.[k] ?? "").trim(),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <FileSignature className="h-4 w-4" />
            Term sheets
          </h3>
          <p className="text-sm text-muted-foreground">
            Generated from the term sheet templates your platform admin
            publishes and filled in from this deal. Complete the terms, send it
            to the parties for review and export it. Once it is agreed, draft
            the contract on the <b>Contract</b> tab.
          </p>
        </div>
        <Button size="sm" onClick={() => setGenerateOpen(true)}>
          <Sparkles className="mr-1 h-4 w-4" />
          Generate from template
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {termSheets.map((c) => {
          const missing = (c.fields ?? []).filter((f) => !f.filled).length;
          const responses = c.reviewLoop?.responses?.length ?? 0;
          return (
            <Card
              key={c._id}
              role="button"
              tabIndex={0}
              aria-label={`Open ${c.name}`}
              className="cursor-pointer transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setOpenId(c._id)}
              onKeyDown={(e) => e.key === "Enter" && setOpenId(c._id)}
            >
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileSignature className="h-4 w-4 shrink-0" />
                    {c.name}
                  </CardTitle>
                  <DocReviewBadge review={c.review} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {c.reference ? `${c.reference} · ` : ""}
                  {c.templateName ? `From “${c.templateName}” · ` : ""}
                  created {new Date(c.createdAt).toLocaleDateString()}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {missing > 0 && (
                    <Badge
                      variant="outline"
                      className="gap-1 border-warning/50 text-warning"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {missing} term{missing === 1 ? "" : "s"} to complete
                    </Badge>
                  )}
                  {responses > 0 && (
                    <Badge variant="secondary">
                      {responses} review response
                      {responses === 1 ? "" : "s"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {termSheets.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No term sheet yet. Choose <b>Generate from template</b> to create
            the first one.
          </CardContent>
        </Card>
      )}

      {/* {legacy.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Earlier term sheet notes
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Typed into this deal before term sheets became documents. They are
              kept for reference and are no longer added to contracts.
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            {legacy.map(([label, key]) => (
              <div key={key}>
                <div className="text-xs font-medium text-muted-foreground">
                  {label}
                </div>
                <p className="whitespace-pre-wrap">
                  {String(deal.termSheet?.[key] ?? "")}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )} */}

      <GenerateTermSheetDialog
        deal={deal}
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        onGenerated={setOpenId}
      />
      <DealContractDialog
        deal={deal}
        contractId={openId}
        open={openId !== null}
        onOpenChange={(o) => !o && setOpenId(null)}
      />
    </div>
  );
}
