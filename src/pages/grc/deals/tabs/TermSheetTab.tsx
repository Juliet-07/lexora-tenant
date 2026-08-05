import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { updateTermSheet, sendForReview, type Deal } from "@/lib/grc/deals-api";

function useDealMutation<T = void>(
  dealId: string,
  fn: (arg: T) => Promise<Deal>,
  opts?: { successMsg?: string },
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
      if (opts?.successMsg) toast.success(opts.successMsg);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Action failed"),
  });
}

export default function TermSheetTab({ deal }: { deal: Deal }) {
  const [t, setT] = useState({
    structure: "",
    consideration: "",
    conditions: "",
    exclusivity: "",
    confidentiality: "",
    timeline: "",
    updatedAt: "",
    ...deal.termSheet,
  });
  const mut = useDealMutation(deal._id, () => updateTermSheet(deal._id, t), {
    successMsg: "Term sheet saved",
  });
  const reviewLoop = deal.offerReviewLoop ?? { tokens: [], responses: [] };
  const sendReviewMut = useMutation({
    mutationFn: () => sendForReview(deal._id, "offer"),
    onSuccess: (res) =>
      toast.success(
        `Sent to ${res.sent.length} part${res.sent.length === 1 ? "y" : "ies"}`,
      ),
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to send for review"),
  });

  const fields: [string, keyof typeof t][] = [
    ["Structure", "structure"],
    ["Consideration", "consideration"],
    ["Conditions", "conditions"],
    ["Exclusivity", "exclusivity"],
    ["Confidentiality", "confidentiality"],
    ["Timeline", "timeline"],
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Term Sheet Builder
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={sendReviewMut.isPending}
              onClick={() => sendReviewMut.mutate()}
            >
              Send for review
            </Button>
            <Button
              size="sm"
              disabled={mut.isPending}
              onClick={() => mut.mutate()}
            >
              {mut.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {fields.map(([label, key]) => (
            <div
              key={key}
              className={key === "structure" ? "md:col-span-2" : ""}
            >
              <Label>{label}</Label>
              <Textarea
                value={t[key] as string}
                onChange={(e) => setT({ ...t, [key]: e.target.value })}
                rows={2}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {reviewLoop.responses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review responses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {reviewLoop.responses.map((r, i) => (
              <div
                key={i}
                className={`border rounded-md p-2.5 text-sm ${r.decision === "Approved" ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}
              >
                <div className="flex justify-between">
                  <span className="font-medium">{r.partyName}</span>
                  <Badge variant="outline">{r.decision}</Badge>
                </div>
                {r.comment && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {r.comment}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
