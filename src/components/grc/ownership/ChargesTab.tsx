import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Download, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  createCharge,
  deleteCharge,
  fetchCharges,
  removeChargeDocument,
  satisfyCharge,
  updateCharge,
  uploadChargeDocument,
  type ChargeInput,
  type ChargeType,
  type RegisteredCharge,
} from "@/lib/grc/ownership-api";
import { exportReportExcel, exportReportPdf } from "@/lib/grc/reportExport";
import {
  ConfirmDialog,
  CurrencySwitcher,
  DocChips,
  EmptyState,
  Field,
  StatCards,
  UploadButton,
  errMsg,
  fmtDate,
  todayInput,
  toDateInput,
  useMoney,
} from "./shared";

const CHARGE_TYPES: ChargeType[] = [
  "Fixed Charge",
  "Floating Charge",
  "Mortgage",
  "Debenture",
  "Lien",
  "Pledge",
];
const STATUS_TONE = (s: string) =>
  s === "Active"
    ? "bg-amber-500/10 text-amber-700 border-amber-500/30"
    : "bg-emerald-500/10 text-emerald-700 border-emerald-500/30";

// ── Register / edit ─────────────────────────────────────────────
function ChargeDialog({
  charge,
  open,
  onOpenChange,
  baseCurrency,
}: {
  charge: RegisteredCharge | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  baseCurrency: string;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    chargeType: "Fixed Charge" as ChargeType,
    chargeHolder: "",
    dateCreated: todayInput(),
    amountSecured: "",
    propertyCharged: "",
    regRef: "",
    description: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [seeded, setSeeded] = useState<string | null>(null);
  const key = open ? (charge?._id ?? "new") : null;
  if (key !== seeded) {
    setSeeded(key);
    if (key) {
      setFile(null);
      setForm({
        chargeType: charge?.chargeType ?? "Fixed Charge",
        chargeHolder: charge?.chargeHolder ?? "",
        dateCreated: charge ? toDateInput(charge.dateCreated) : todayInput(),
        amountSecured: charge ? String(charge.amountSecured) : "",
        propertyCharged: charge?.propertyCharged ?? "",
        regRef: charge?.regRef ?? "",
        description: charge?.description ?? "",
      });
    }
  }
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: async () => {
      const payload: ChargeInput = {
        chargeType: form.chargeType,
        chargeHolder: form.chargeHolder.trim(),
        dateCreated: form.dateCreated,
        amountSecured:
          form.amountSecured === "" ? 0 : Number(form.amountSecured),
        propertyCharged: form.propertyCharged.trim(),
        regRef: form.regRef.trim(),
        description: form.description.trim(),
      };
      const saved = charge
        ? await updateCharge(charge._id, payload)
        : await createCharge(payload);
      if (file) await uploadChargeDocument(saved._id, file);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["charges"] });
      toast({ title: charge ? "Charge updated" : "Charge registered" });
      onOpenChange(false);
    },
    onError: (e) =>
      toast({
        title: "Couldn't save the charge",
        description: errMsg(e),
        variant: "destructive",
      }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {charge ? "Edit charge" : "Register charge"}
          </DialogTitle>
          <DialogDescription>
            Record a security interest granted over company assets.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Charge type">
              <Select
                value={form.chargeType}
                onValueChange={(v) => set("chargeType", v as ChargeType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHARGE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Charge holder">
              <Input
                placeholder="e.g. First Bank Nigeria"
                value={form.chargeHolder}
                onChange={(e) => set("chargeHolder", e.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date created">
              <Input
                type="date"
                value={form.dateCreated}
                onChange={(e) => set("dateCreated", e.target.value)}
              />
            </Field>
            <Field label={`Amount secured (${baseCurrency})`}>
              <Input
                type="number"
                min={0}
                value={form.amountSecured}
                onChange={(e) => set("amountSecured", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Property charged">
            <Input
              placeholder="e.g. All present and future assets"
              value={form.propertyCharged}
              onChange={(e) => set("propertyCharged", e.target.value)}
            />
          </Field>
          <Field label="Registration reference">
            <Input
              value={form.regRef}
              onChange={(e) => set("regRef", e.target.value)}
            />
          </Field>
          <Field label="Description">
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>
          <Field
            label="Document (optional)"
            hint={
              charge
                ? "More files can be added from the register."
                : "The charge instrument or certificate."
            }
          >
            <Input
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={
              mut.isPending || !form.chargeHolder.trim() || !form.dateCreated
            }
            onClick={() => mut.mutate()}
          >
            {mut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {charge ? "Save changes" : "Register charge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SatisfyDialog({
  charge,
  onClose,
}: {
  charge: RegisteredCharge | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [date, setDate] = useState(todayInput());
  const mut = useMutation({
    mutationFn: () => satisfyCharge(charge!._id, date),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["charges"] });
      toast({ title: "Charge marked as satisfied" });
      onClose();
    },
    onError: (e) =>
      toast({
        title: "Couldn't mark the charge satisfied",
        description: errMsg(e),
        variant: "destructive",
      }),
  });
  return (
    <Dialog open={!!charge} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Mark as satisfied</DialogTitle>
          <DialogDescription>
            {charge?.chargeType} held by {charge?.chargeHolder} — the debt has
            been repaid and the security released.
          </DialogDescription>
        </DialogHeader>
        <Field label="Date satisfied">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!date || mut.isPending}
            onClick={() => mut.mutate()}
          >
            {mut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Mark satisfied
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── The tab ─────────────────────────────────────────────────────
export function ChargesTab({
  displayCurrency,
  onDisplayCurrencyChange,
}: {
  displayCurrency: string;
  onDisplayCurrencyChange: (c: string) => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [sub, setSub] = useState("overview");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState<RegisteredCharge | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [satisfying, setSatisfying] = useState<RegisteredCharge | null>(null);
  const [toDelete, setToDelete] = useState<RegisteredCharge | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["charges"],
    queryFn: fetchCharges,
  });
  const fx = useMoney(data?.baseCurrency, displayCurrency);
  const { money } = fx;

  const refresh = () => qc.invalidateQueries({ queryKey: ["charges"] });
  const fail = (title: string) => (e: unknown) =>
    toast({ title, description: errMsg(e), variant: "destructive" });

  const del = useMutation({
    mutationFn: (id: string) => deleteCharge(id),
    onSuccess: () => {
      refresh();
      toast({ title: "Charge deleted" });
      setToDelete(null);
    },
    onError: (e) => {
      fail("Couldn't delete the charge")(e);
      setToDelete(null);
    },
  });
  const upload = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      uploadChargeDocument(id, file),
    onSuccess: refresh,
    onError: fail("Couldn't upload that file"),
  });
  const removeDoc = useMutation({
    mutationFn: ({ id, index }: { id: string; index: number }) =>
      removeChargeDocument(id, index),
    onSuccess: refresh,
    onError: fail("Couldn't remove that file"),
  });

  const charges = data?.charges ?? [];
  const filtered = useMemo(
    () =>
      statusFilter === "all"
        ? charges
        : charges.filter((c) => c.status === statusFilter),
    [charges, statusFilter],
  );
  const events = useMemo(() => {
    const out: {
      key: string;
      date: string;
      event: "Charge Created" | "Charge Satisfied";
      charge: RegisteredCharge;
    }[] = [];
    for (const c of charges) {
      out.push({
        key: `${c._id}-c`,
        date: c.dateCreated,
        event: "Charge Created",
        charge: c,
      });
      if (c.dateSatisfied) {
        out.push({
          key: `${c._id}-s`,
          date: c.dateSatisfied,
          event: "Charge Satisfied",
          charge: c,
        });
      }
    }
    return out.sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }, [charges]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <EmptyState
        title="Couldn't load the register of charges"
        hint="Refresh the page and try again."
      />
    );
  }
  const { stats } = data;
  const edit = (c: RegisteredCharge) => {
    setEditing(c);
    setFormOpen(true);
  };

  const reportDef = () => ({
    id: "charges-report",
    title: "Register of Charges Report",
    subtitle: `Organisation Structure — values in ${fx.currency}`,
    summary: [
      { label: "Total charges", value: stats.total },
      { label: "Active", value: stats.active },
      { label: "Satisfied", value: stats.satisfied },
      { label: "Secured (active)", value: money(stats.activeAmount) },
    ],
    sections: [
      {
        heading: "Statutory register of charges",
        columns: [
          "Charge type",
          "Holder",
          "Created",
          "Satisfied",
          "Amount secured",
          "Property charged",
          "Reg. ref.",
          "Status",
        ],
        rows: filtered.map((c) => [
          c.chargeType,
          c.chargeHolder,
          fmtDate(c.dateCreated),
          c.dateSatisfied ? fmtDate(c.dateSatisfied) : "Outstanding",
          money(c.amountSecured),
          c.propertyCharged || "—",
          c.regRef || "—",
          c.status,
        ]),
      },
      {
        heading: "Timeline",
        columns: ["Date", "Event", "Charge type", "Holder", "Amount"],
        rows: events.map((e) => [
          fmtDate(e.date),
          e.event,
          e.charge.chargeType,
          e.charge.chargeHolder,
          money(e.charge.amountSecured),
        ]),
      },
    ],
  });

  const docCell = (c: RegisteredCharge) => (
    <div className="space-y-1">
      <DocChips
        docs={c.documents}
        onRemove={(index) => removeDoc.mutate({ id: c._id, index })}
      />
      <UploadButton
        pending={upload.isPending && upload.variables?.id === c._id}
        onFile={(file) => upload.mutate({ id: c._id, file })}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CurrencySwitcher
          baseCurrency={data.baseCurrency}
          value={displayCurrency}
          onChange={onDisplayCurrencyChange}
          status={fx}
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" /> Register Charge
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportReportPdf(reportDef())}
          >
            <Download className="h-4 w-4 mr-1.5" /> Download Charges Report
          </Button>
        </div>
      </div>

      <StatCards
        items={[
          { label: "Total charges", value: stats.total },
          {
            label: "Active charges",
            value: stats.active,
            tone: "text-amber-600",
          },
          {
            label: "Satisfied",
            value: stats.satisfied,
            tone: "text-emerald-600",
          },
          { label: "Total secured (active)", value: money(stats.activeAmount) },
        ]}
      />

      <Tabs value={sub} onValueChange={setSub}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="register">Statutory Register</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          {charges.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  title="No charges registered"
                  hint="Mortgages, debentures and other security granted over company assets are recorded here."
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {charges.map((c) => (
                <Card key={c._id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{c.chargeType}</p>
                      <Badge
                        variant="outline"
                        className={STATUS_TONE(c.status)}
                      >
                        {c.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      {[
                        ["Charge holder", c.chargeHolder],
                        ["Amount secured", money(c.amountSecured)],
                        ["Date created", fmtDate(c.dateCreated)],
                        [
                          "Date satisfied",
                          c.dateSatisfied
                            ? fmtDate(c.dateSatisfied)
                            : "Outstanding",
                        ],
                        ["Property charged", c.propertyCharged || "—"],
                        ["Reg. reference", c.regRef || "—"],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <p className="text-muted-foreground">{k}</p>
                          <p className="font-medium">{v}</p>
                        </div>
                      ))}
                    </div>
                    {c.description && (
                      <p className="text-xs text-muted-foreground">
                        {c.description}
                      </p>
                    )}
                    {docCell(c)}
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => edit(c)}
                      >
                        <Pencil className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      {c.status === "Active" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setSatisfying(c)}
                        >
                          <Check className="h-3 w-3 mr-1" /> Mark satisfied
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setToDelete(c)}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="register" className="mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">
                Statutory Register of Charges
              </CardTitle>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Satisfied">Satisfied</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => exportReportExcel(reportDef())}
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" /> Export
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <EmptyState title="No charges match" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Charge type</TableHead>
                      <TableHead>Charge holder</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Satisfied</TableHead>
                      <TableHead className="text-right">
                        Amount secured
                      </TableHead>
                      <TableHead>Property charged</TableHead>
                      <TableHead>Reg. ref.</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Documents</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((c) => (
                      <TableRow key={c._id}>
                        <TableCell className="font-medium">
                          {c.chargeType}
                        </TableCell>
                        <TableCell>{c.chargeHolder}</TableCell>
                        <TableCell className="tabular-nums">
                          {fmtDate(c.dateCreated)}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {c.dateSatisfied
                            ? fmtDate(c.dateSatisfied)
                            : "Outstanding"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {money(c.amountSecured)}
                        </TableCell>
                        <TableCell>{c.propertyCharged || "—"}</TableCell>
                        <TableCell className="tabular-nums">
                          {c.regRef || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={STATUS_TONE(c.status)}
                          >
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="min-w-40">{docCell(c)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => edit(c)}
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {c.status === "Active" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => setSatisfying(c)}
                                title="Mark satisfied"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Charge Events Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {events.length === 0 ? (
                <EmptyState title="No events yet" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Charge type</TableHead>
                      <TableHead>Holder</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((e) => (
                      <TableRow key={e.key}>
                        <TableCell className="tabular-nums">
                          {fmtDate(e.date)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              e.event === "Charge Created"
                                ? "bg-blue-500/10 text-blue-700 border-blue-500/30"
                                : "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
                            }
                          >
                            {e.event}
                          </Badge>
                        </TableCell>
                        <TableCell>{e.charge.chargeType}</TableCell>
                        <TableCell>{e.charge.chargeHolder}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {money(e.charge.amountSecured)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={STATUS_TONE(
                              e.event === "Charge Created"
                                ? "Active"
                                : "Satisfied",
                            )}
                          >
                            {e.event === "Charge Created"
                              ? "Created"
                              : "Satisfied"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ChargeDialog
        charge={editing}
        open={formOpen}
        onOpenChange={setFormOpen}
        baseCurrency={data.baseCurrency}
      />
      <SatisfyDialog charge={satisfying} onClose={() => setSatisfying(null)} />
      <ConfirmDialog
        open={!!toDelete}
        title={`Delete the ${toDelete?.chargeType} held by ${toDelete?.chargeHolder}?`}
        description="The entry is removed from the register. If the charge was repaid, mark it satisfied instead so the history is kept."
        pending={del.isPending}
        onConfirm={() => toDelete && del.mutate(toDelete._id)}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
