import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { toast } from "@/hooks/use-toast";
import {
  createShare,
  sendReportToInvestor,
  type ReadinessWorkspace,
  type PipelineInvestor,
  type RoomItem,
} from "@/lib/grc/readiness-workspace-api";
import type { ReadinessAssessment } from "@/lib/grc/readiness-api";
import { fail } from "./shared";

export interface SendTarget {
  investorId?: string;
  investorName?: string;
  organisation?: string;
  email?: string;
}

function heldByCategory(room: RoomItem[]) {
  const map = new Map<string, { held: number; total: number }>();
  for (const r of room) {
    if (r.status === "not_applicable") continue;
    const e = map.get(r.category) ?? { held: 0, total: 0 };
    e.total += 1;
    if ((r.status === "uploaded" || r.status === "review") && r.files.length) {
      e.held += 1;
    }
    map.set(r.category, e);
  }
  return map;
}

function InvestorPick({
  investors,
  onPick,
}: {
  investors: PipelineInvestor[];
  onPick: (i: PipelineInvestor) => void;
}) {
  if (!investors.length) return null;
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">From your pipeline</Label>
      <Select
        onValueChange={(id) => {
          const inv = investors.find((i) => i._id === id);
          if (inv) onPick(inv);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Choose an investor to prefill" />
        </SelectTrigger>
        <SelectContent>
          {investors.map((i) => (
            <SelectItem key={i._id} value={i._id}>
              {i.name}
              {i.organisation ? ` — ${i.organisation}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Send the data room to an investor as a secure, expiring link.
export function SendRoomDialog({
  open,
  onOpenChange,
  ws,
  target,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  ws: ReadinessWorkspace;
  target?: SendTarget;
  onDone: (w: ReadinessWorkspace) => void;
}) {
  const cats = heldByCategory(ws.room);
  const sendable = [...cats.entries()].filter(([, v]) => v.held > 0);

  const [f, setF] = useState({
    investorId: "",
    investorName: "",
    organisation: "",
    email: "",
    accessLevel: "view" as "view" | "download",
    expiry: "30",
    customDate: "",
    nda: "click" as "none" | "click" | "on_file",
    message: "",
    includeReport: false,
  });
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setF((p) => ({
      ...p,
      investorId: target?.investorId ?? "",
      investorName: target?.investorName ?? "",
      organisation: target?.organisation ?? "",
      email: target?.email ?? "",
    }));
    setPicked(sendable.map(([c]) => c));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const send = useMutation({
    mutationFn: () =>
      createShare({
        investorId: f.investorId || undefined,
        investorName: f.investorName.trim(),
        organisation: f.organisation.trim() || undefined,
        email: f.email.trim(),
        accessLevel: f.accessLevel,
        categories: picked,
        nda: f.nda,
        ...(f.expiry === "custom"
          ? { expiresAt: new Date(`${f.customDate}T23:59:59`).toISOString() }
          : { expiryDays: Number(f.expiry) }),
        message: f.message.trim() || undefined,
        includeReport: f.includeReport,
      }),
    onSuccess: (w) => {
      onDone(w);
      onOpenChange(false);
      toast(
        w.emailSent === false
          ? {
              title: "Link created, but the email did not send",
              description:
                "Copy the link from the shared access list, or use Resend once email is working.",
              variant: "destructive",
            }
          : {
              title: "Secure link sent",
              description: `${f.investorName} will receive access to ${picked.length} categor${picked.length === 1 ? "y" : "ies"}.`,
            },
      );
    },
    onError: (e) => fail("Could not send the data room", e),
  });

  const valid =
    f.investorName.trim() &&
    /\S+@\S+\.\S+/.test(f.email) &&
    picked.length > 0 &&
    (f.expiry !== "custom" || !!f.customDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send data room to investor</DialogTitle>
          <DialogDescription>
            The investor gets a secure link with time-limited access. Views and
            downloads are tracked in the shared access log.
          </DialogDescription>
        </DialogHeader>

        {sendable.length === 0 ? (
          <p className="rounded-md border p-4 text-sm text-muted-foreground">
            Nothing to send yet — upload at least one document to the data room
            first.
          </p>
        ) : (
          <div className="space-y-4">
            <InvestorPick
              investors={ws.investors}
              onPick={(i) =>
                setF((p) => ({
                  ...p,
                  investorId: i._id,
                  investorName: i.name,
                  organisation: i.organisation,
                  email: i.email,
                }))
              }
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sr-name">Investor name</Label>
                <Input
                  id="sr-name"
                  value={f.investorName}
                  onChange={(e) =>
                    setF({ ...f, investorName: e.target.value, investorId: "" })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sr-org">Organisation</Label>
                <Input
                  id="sr-org"
                  value={f.organisation}
                  onChange={(e) => setF({ ...f, organisation: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="sr-email">Email address</Label>
                <Input
                  id="sr-email"
                  type="email"
                  value={f.email}
                  onChange={(e) => setF({ ...f, email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Access level</Label>
                <Select
                  value={f.accessLevel}
                  onValueChange={(v) =>
                    setF({ ...f, accessLevel: v as "view" | "download" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">View only</SelectItem>
                    <SelectItem value="download">View and download</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Link expiry</Label>
                <Select
                  value={f.expiry}
                  onValueChange={(v) => setF({ ...f, expiry: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="custom">Custom date</SelectItem>
                  </SelectContent>
                </Select>
                {f.expiry === "custom" ? (
                  <Input
                    type="date"
                    aria-label="Expiry date"
                    value={f.customDate}
                    onChange={(e) => setF({ ...f, customDate: e.target.value })}
                  />
                ) : null}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>NDA / legal gate</Label>
                <Select
                  value={f.nda}
                  onValueChange={(v) =>
                    setF({ ...f, nda: v as "none" | "click" | "on_file" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No NDA required</SelectItem>
                    <SelectItem value="click">
                      Click-through confidentiality agreement
                    </SelectItem>
                    <SelectItem value="on_file">NDA already on file</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Categories to include</Label>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-3">
                {sendable.map(([c, v]) => (
                  <label
                    key={c}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={picked.includes(c)}
                      onCheckedChange={(on) =>
                        setPicked((p) =>
                          on ? [...p, c] : p.filter((x) => x !== c),
                        )
                      }
                    />
                    <span className="flex-1">{c}</span>
                    <span className="text-xs text-muted-foreground">
                      {v.held}/{v.total}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Only categories holding an uploaded document can be shared.
              </p>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={f.includeReport}
                  onCheckedChange={(on) =>
                    setF({ ...f, includeReport: on === true })
                  }
                />
                Also attach the latest Investor Readiness Report (PDF)
              </label>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sr-msg">Cover message (optional)</Label>
              <Textarea
                id="sr-msg"
                value={f.message}
                onChange={(e) => setF({ ...f, message: e.target.value })}
                className="min-h-[70px]"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => send.mutate()}
            disabled={!valid || send.isPending || sendable.length === 0}
          >
            {send.isPending ? "Sending…" : "Send secure link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Email the readiness report (PDF) to an investor.
export function SendReportDialog({
  open,
  onOpenChange,
  ws,
  assessment,
  target,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  ws: ReadinessWorkspace;
  assessment?: ReadinessAssessment;
  target?: SendTarget;
  onDone: (w: ReadinessWorkspace) => void;
}) {
  const [f, setF] = useState({
    investorId: "",
    investorName: "",
    organisation: "",
    email: "",
    message: "",
  });
  useEffect(() => {
    if (!open) return;
    setF({
      investorId: target?.investorId ?? "",
      investorName: target?.investorName ?? "",
      organisation: target?.organisation ?? "",
      email: target?.email ?? "",
      message: "",
    });
  }, [open, target]);

  const incomplete = assessment
    ? assessment.reportSections.filter((s) => s.state === "Incomplete").length
    : 0;

  const send = useMutation({
    mutationFn: () =>
      sendReportToInvestor({
        investorId: f.investorId || undefined,
        investorName: f.investorName.trim(),
        organisation: f.organisation.trim() || undefined,
        email: f.email.trim(),
        assessmentId: assessment!._id,
        message: f.message.trim() || undefined,
      }),
    onSuccess: (w) => {
      onDone(w);
      onOpenChange(false);
      toast(
        w.emailSent === false
          ? {
              title: "Report not sent",
              description: "The email could not be delivered.",
              variant: "destructive",
            }
          : { title: "Report sent", description: `Emailed to ${f.email}.` },
      );
    },
    onError: (e) => fail("Could not send the report", e),
  });

  const valid =
    !!assessment && f.investorName.trim() && /\S+@\S+\.\S+/.test(f.email);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send report to investor</DialogTitle>
          <DialogDescription>
            The Investor Readiness Report is attached to the email as a PDF.
          </DialogDescription>
        </DialogHeader>
        {incomplete > 0 ? (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700">
            {incomplete} section{incomplete === 1 ? " is" : "s are"} still
            marked Incomplete. Consider finishing them before sharing.
          </div>
        ) : null}
        <div className="space-y-3">
          <InvestorPick
            investors={ws.investors}
            onPick={(i) =>
              setF((p) => ({
                ...p,
                investorId: i._id,
                investorName: i.name,
                organisation: i.organisation,
                email: i.email,
              }))
            }
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rp-name">Investor name</Label>
              <Input
                id="rp-name"
                value={f.investorName}
                onChange={(e) =>
                  setF({ ...f, investorName: e.target.value, investorId: "" })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rp-org">Organisation</Label>
              <Input
                id="rp-org"
                value={f.organisation}
                onChange={(e) => setF({ ...f, organisation: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="rp-email">Email address</Label>
              <Input
                id="rp-email"
                type="email"
                value={f.email}
                onChange={(e) => setF({ ...f, email: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rp-msg">Cover message (optional)</Label>
            <Textarea
              id="rp-msg"
              value={f.message}
              onChange={(e) => setF({ ...f, message: e.target.value })}
              className="min-h-[70px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => send.mutate()}
            disabled={!valid || send.isPending}
          >
            {send.isPending ? "Sending…" : "Send report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
