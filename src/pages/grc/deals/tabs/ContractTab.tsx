import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileStack, Sparkles, AlertTriangle } from "lucide-react";
import { GenerateDealContractDialog } from "@/components/grc/GenerateDealContractDialog";
import { DealContractDialog } from "@/components/grc/DealContractDialog";
import type { Deal } from "@/lib/grc/deals-api";

// A deal's contracts. They are created only from templates the platform
// admin publishes, and each opens in a pop-up where it is previewed,
// edited, redlined, sent for review and exported. Redlining and execution
// work as they always have.
export default function ContractTab({ deal }: { deal: Deal }) {
  const [generateOpen, setGenerateOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const contracts = deal.contracts ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <FileStack className="h-4 w-4" />
            Contracts
          </h3>
          <p className="text-sm text-muted-foreground">
            Generated from the templates your platform admin publishes, filled
            in from this deal and your company profile. Open one to preview,
            edit, redline and send it for review.
          </p>
        </div>
        <Button size="sm" onClick={() => setGenerateOpen(true)}>
          <Sparkles className="mr-1 h-4 w-4" />
          Generate from template
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {contracts.map((c) => {
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
                    <FileStack className="h-4 w-4 shrink-0" />
                    {c.name}
                  </CardTitle>
                  <Badge variant="outline" className="shrink-0">
                    {c.sections.length} section
                    {c.sections.length === 1 ? "" : "s"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {c.reference ? `${c.reference} · ` : ""}
                  {c.templateName
                    ? `From “${c.templateName}” · `
                    : "Built from the clause library · "}
                  created {new Date(c.createdAt).toLocaleDateString()}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {missing > 0 && (
                    <Badge
                      variant="outline"
                      className="gap-1 border-warning/50 text-warning"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {missing} field{missing === 1 ? "" : "s"} to fill
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

      {contracts.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No contracts yet. Choose <b>Generate from template</b> to create the
            first one.
          </CardContent>
        </Card>
      )}

      <GenerateDealContractDialog
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
