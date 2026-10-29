import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  CalendarDays,
  Check,
  Download,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
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
  addIpDeadline,
  createIpAsset,
  deleteIpAsset,
  fetchIpOverview,
  removeIpDeadline,
  removeIpDocument,
  renewIpAsset,
  updateIpAsset,
  updateIpDeadline,
  uploadIpDocument,
  type IpAsset,
  type IpAssetInput,
  type IpAssetStatus,
  type IpAssetType,
  type IpDueItem,
} from "@/lib/grc/ownership-api";
import { exportReportExcel, exportReportPdf } from "@/lib/grc/reportExport";
import {
  ConfirmDialog,
  CurrencySwitcher,
  DocChips,
  EmptyState,
  Field,
  SLICE_COLORS,
  StatCards,
  UploadButton,
  errMsg,
  fmtDate,
  fmtPct,
  toDateInput,
  useMoney,
} from "./shared";

const IP_TYPES: IpAssetType[] = [
  "Trademark",
  "Patent",
  "Copyright",
  "Trade Secret",
  "Domain Name",
  "Design",
];
const IP_STATUSES: IpAssetStatus[] = [
  "Registered",
  "Active",
  "Pending",
  "Expired",
  "Lapsed",
  "Abandoned",
];
const TYPE_TONE: Record<IpAssetType, string> = {
  Trademark: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  Patent: "bg-violet-500/10 text-violet-700 border-violet-500/30",
  Copyright: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  "Trade Secret": "bg-red-500/10 text-red-700 border-red-500/30",
  "Domain Name": "bg-cyan-500/10 text-cyan-700 border-cyan-500/30",
  Design: "bg-amber-500/10 text-amber-700 border-amber-500/30",
};
const STATUS_TONE = (s: IpAssetStatus) =>
  s === "Registered" || s === "Active"
    ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
    : s === "Pending"
      ? "bg-amber-500/10 text-amber-700 border-amber-500/30"
      : "bg-red-500/10 text-red-700 border-red-500/30";
const URGENCY_TONE: Record<IpDueItem["urgency"], string> = {
  overdue: "bg-red-500/10 text-red-700 border-red-500/30",
  critical: "bg-red-500/10 text-red-700 border-red-500/30",
  soon: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  ok: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
};
const daysLabel = (d: IpDueItem) =>
  d.urgency === "overdue"
    ? `Overdue by ${Math.abs(d.daysLeft)} day${Math.abs(d.daysLeft) === 1 ? "" : "s"}`
    : d.daysLeft === 0
      ? "Due today"
      : `${d.daysLeft} day${d.daysLeft === 1 ? "" : "s"}`;

// ── Add / edit asset ────────────────────────────────────────────
function AssetDialog({
  asset,
  open,
  onOpenChange,
  baseCurrency,
}: {
  asset: IpAsset | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  baseCurrency: string;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    type: "Trademark" as IpAssetType,
    owner: "",
    regNo: "",
    filingDate: "",
    expiryDate: "",
    jurisdiction: "",
    status: "Registered" as IpAssetStatus,
    value: "",
    description: "",
    licensees: "",
  });
  const [seeded, setSeeded] = useState<string | null>(null);
  const key = open ? (asset?._id ?? "new") : null;
  if (key !== seeded) {
    setSeeded(key);
    if (key) {
      setForm({
        name: asset?.name ?? "",
        type: asset?.type ?? "Trademark",
        owner: asset?.owner ?? "",
        regNo: asset?.regNo ?? "",
        filingDate: toDateInput(asset?.filingDate),
        expiryDate: toDateInput(asset?.expiryDate),
        jurisdiction: asset?.jurisdiction ?? "",
        status: asset?.status ?? "Registered",
        value: asset ? String(asset.value) : "",
        description: asset?.description ?? "",
        licensees: (asset?.licensees ?? []).join(", "),
      });
    }
  }
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: () => {
      const payload: IpAssetInput = {
        name: form.name.trim(),
        type: form.type,
        owner: form.owner.trim(),
        regNo: form.regNo.trim(),
        filingDate: form.filingDate || null,
        expiryDate: form.expiryDate || null,
        jurisdiction: form.jurisdiction.trim(),
        status: form.status,
        value: form.value === "" ? 0 : Number(form.value),
        description: form.description.trim(),
        licensees: form.licensees
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      return asset ? updateIpAsset(asset._id, payload) : createIpAsset(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ip-overview"] });
      qc.invalidateQueries({ queryKey: ["calendar"] });
      toast({ title: asset ? "IP asset updated" : "IP asset registered" });
      onOpenChange(false);
    },
    onError: (e) =>
      toast({
        title: "Couldn't save the IP asset",
        description: errMsg(e),
        variant: "destructive",
      }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {asset ? "Edit IP asset" : "Register IP asset"}
          </DialogTitle>
          <DialogDescription>
            The expiry date is added to the Compliance Calendar automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Asset name">
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </Field>
            <Field label="Type">
              <Select
                value={form.type}
                onValueChange={(v) => set("type", v as IpAssetType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IP_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Registration number">
              <Input
                value={form.regNo}
                onChange={(e) => set("regNo", e.target.value)}
              />
            </Field>
            <Field label="Owner">
              <Input
                value={form.owner}
                onChange={(e) => set("owner", e.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Filing date">
              <Input
                type="date"
                value={form.filingDate}
                onChange={(e) => set("filingDate", e.target.value)}
              />
            </Field>
            <Field
              label="Expiry / renewal date"
              hint="Leave empty for assets that don't expire (e.g. a trade secret)."
            >
              <Input
                type="date"
                value={form.expiryDate}
                onChange={(e) => set("expiryDate", e.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Jurisdiction">
              <Input
                value={form.jurisdiction}
                onChange={(e) => set("jurisdiction", e.target.value)}
              />
            </Field>
            <Field label="Status">
              <Select
                value={form.status}
                onValueChange={(v) => set("status", v as IpAssetStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IP_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label={`Estimated value (${baseCurrency})`}>
            <Input
              type="number"
              min={0}
              value={form.value}
              onChange={(e) => set("value", e.target.value)}
            />
          </Field>
          <Field label="Licensees" hint="Separate names with commas.">
            <Input
              value={form.licensees}
              onChange={(e) => set("licensees", e.target.value)}
            />
          </Field>
          <Field label="Description">
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={mut.isPending || !form.name.trim()}
            onClick={() => mut.mutate()}
          >
            {mut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {asset ? "Save changes" : "Register asset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Renew ───────────────────────────────────────────────────────
function RenewDialog({
  asset,
  onClose,
}: {
  asset: IpAsset | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [date, setDate] = useState("");
  const [seeded, setSeeded] = useState<string | null>(null);
  if ((asset?._id ?? null) !== seeded) {
    setSeeded(asset?._id ?? null);
    setDate("");
  }
  const mut = useMutation({
    mutationFn: () => renewIpAsset(asset!._id, date),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ip-overview"] });
      qc.invalidateQueries({ queryKey: ["calendar"] });
      toast({ title: "Renewal recorded" });
      onClose();
    },
    onError: (e) =>
      toast({
        title: "Couldn't record the renewal",
        description: errMsg(e),
        variant: "destructive",
      }),
  });
  return (
    <Dialog open={!!asset} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Record renewal — {asset?.name}</DialogTitle>
          <DialogDescription>
            Current expiry: {fmtDate(asset?.expiryDate)}. Enter the new expiry
            date; the calendar entry moves with it.
          </DialogDescription>
        </DialogHeader>
        <Field label="New expiry date">
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
            Record renewal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Deadlines + documents for one asset ─────────────────────────
function ManageDialog({
  assetId,
  assets,
  onClose,
}: {
  assetId: string | null;
  assets: IpAsset[];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const asset = assets.find((a) => a._id === assetId) ?? null;
  const [label, setLabel] = useState("");
  const [due, setDue] = useState("");
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["ip-overview"] });
    qc.invalidateQueries({ queryKey: ["calendar"] });
  };
  const fail = (title: string) => (e: unknown) =>
    toast({ title, description: errMsg(e), variant: "destructive" });

  const add = useMutation({
    mutationFn: () =>
      addIpDeadline(assetId!, { label: label.trim(), dueDate: due }),
    onSuccess: () => {
      refresh();
      setLabel("");
      setDue("");
    },
    onError: fail("Couldn't add the deadline"),
  });
  const toggle = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      updateIpDeadline(assetId!, id, { done }),
    onSuccess: refresh,
    onError: fail("Couldn't update the deadline"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => removeIpDeadline(assetId!, id),
    onSuccess: refresh,
    onError: fail("Couldn't remove the deadline"),
  });
  const upload = useMutation({
    mutationFn: (file: File) => uploadIpDocument(assetId!, file),
    onSuccess: refresh,
    onError: fail("Couldn't upload that file"),
  });
  const removeDoc = useMutation({
    mutationFn: (i: number) => removeIpDocument(assetId!, i),
    onSuccess: refresh,
    onError: fail("Couldn't remove that file"),
  });

  return (
    <Dialog open={!!asset} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{asset?.name}</DialogTitle>
          <DialogDescription>
            Deadlines you add here appear in the Compliance Calendar until
            they're marked done.
          </DialogDescription>
        </DialogHeader>
        {asset && (
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium">Custom deadlines</p>
              {asset.deadlines.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  None yet — e.g. "File declaration of use", "Respond to office
                  action".
                </p>
              )}
              {asset.deadlines.map((d) => (
                <div
                  key={d._id}
                  className="flex items-center justify-between gap-2 rounded-md border p-2"
                >
                  <div
                    className={
                      d.done ? "line-through text-muted-foreground" : ""
                    }
                  >
                    <p className="text-sm">{d.label}</p>
                    <p className="text-[11px] tabular-nums">
                      {fmtDate(d.dueDate)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() =>
                        toggle.mutate({ id: d._id, done: !d.done })
                      }
                    >
                      <Check className="h-3 w-3 mr-1" />
                      {d.done ? "Reopen" : "Mark done"}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => remove.mutate(d._id)}
                      title="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="grid grid-cols-[1fr_9rem_auto] gap-2 items-end">
                <Field label="Deadline">
                  <Input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                  />
                </Field>
                <Field label="Due date">
                  <Input
                    type="date"
                    value={due}
                    onChange={(e) => setDue(e.target.value)}
                  />
                </Field>
                <Button
                  disabled={!label.trim() || !due || add.isPending}
                  onClick={() => add.mutate()}
                >
                  Add
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Documents</p>
              <DocChips
                docs={asset.documents}
                onRemove={(i) => removeDoc.mutate(i)}
              />
              <UploadButton
                pending={upload.isPending}
                onFile={(f) => upload.mutate(f)}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── The tab ─────────────────────────────────────────────────────
export function IpTab({
  displayCurrency,
  onDisplayCurrencyChange,
}: {
  displayCurrency: string;
  onDisplayCurrencyChange: (c: string) => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [sub, setSub] = useState("portfolio");
  const [typeFilter, setTypeFilter] = useState("all");
  const [editing, setEditing] = useState<IpAsset | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [renewing, setRenewing] = useState<IpAsset | null>(null);
  const [managing, setManaging] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<IpAsset | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["ip-overview"],
    queryFn: fetchIpOverview,
  });
  const fx = useMoney(data?.baseCurrency, displayCurrency);
  const { money } = fx;

  const del = useMutation({
    mutationFn: (id: string) => deleteIpAsset(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ip-overview"] });
      qc.invalidateQueries({ queryKey: ["calendar"] });
      toast({ title: "IP asset deleted" });
      setToDelete(null);
    },
    onError: (e) => {
      toast({
        title: "Couldn't delete the asset",
        description: errMsg(e),
        variant: "destructive",
      });
      setToDelete(null);
    },
  });
  const markDone = useMutation({
    mutationFn: (d: IpDueItem) =>
      updateIpDeadline(d.assetId, d.deadlineId!, { done: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ip-overview"] });
      qc.invalidateQueries({ queryKey: ["calendar"] });
    },
    onError: (e) =>
      toast({
        title: "Couldn't update the deadline",
        description: errMsg(e),
        variant: "destructive",
      }),
  });

  const assets = data?.assets ?? [];
  const filtered = useMemo(
    () =>
      typeFilter === "all"
        ? assets
        : assets.filter((a) => a.type === typeFilter),
    [assets, typeFilter],
  );
  const byType = useMemo(() => {
    const m = new Map<string, { count: number; value: number }>();
    for (const a of assets) {
      const cur = m.get(a.type) ?? { count: 0, value: 0 };
      cur.count += 1;
      cur.value += a.value;
      m.set(a.type, cur);
    }
    return [...m.entries()];
  }, [assets]);

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
        title="Couldn't load the IP register"
        hint="Refresh the page and try again."
      />
    );
  }
  const { stats, renewals } = data;
  const edit = (a: IpAsset) => {
    setEditing(a);
    setFormOpen(true);
  };

  const reportDef = () => ({
    id: "ip-report",
    title: "Intellectual Property Report",
    subtitle: `Organisation Structure — values in ${fx.currency}`,
    summary: [
      { label: "Total assets", value: stats.total },
      { label: "Registered / active", value: stats.registered },
      { label: "Pending", value: stats.pending },
      { label: "Portfolio value", value: money(stats.totalValue) },
      { label: "Due within a year", value: stats.dueWithin365 },
    ],
    sections: [
      {
        heading: "IP register",
        columns: [
          "Asset",
          "Type",
          "Reg. no.",
          "Owner",
          "Filed",
          "Expires",
          "Jurisdiction",
          "Status",
          "Value",
        ],
        rows: filtered.map((a) => [
          a.name,
          a.type,
          a.regNo || "—",
          a.owner || "—",
          fmtDate(a.filingDate),
          fmtDate(a.expiryDate),
          a.jurisdiction || "—",
          a.status,
          money(a.value),
        ]),
      },
      {
        heading: "Renewals & deadlines",
        columns: ["Asset", "Type", "Due", "Days remaining", "Action required"],
        rows: renewals.map((r) => [
          r.assetName,
          r.assetType,
          fmtDate(r.dueDate),
          r.daysLeft < 0 ? `Overdue ${Math.abs(r.daysLeft)}` : r.daysLeft,
          r.action,
        ]),
      },
    ],
  });

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
            <Plus className="h-4 w-4 mr-1.5" /> Register IP Asset
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportReportPdf(reportDef())}
          >
            <Download className="h-4 w-4 mr-1.5" /> Download IP Report
          </Button>
        </div>
      </div>

      <StatCards
        items={[
          { label: "Total IP assets", value: stats.total },
          { label: "Active / registered", value: stats.registered },
          { label: "Pending", value: stats.pending },
          { label: "Portfolio value", value: money(stats.totalValue) },
          {
            label: "Due within 1 year",
            value: stats.dueWithin365 + stats.overdue,
            sub: stats.overdue ? `${stats.overdue} overdue` : undefined,
            tone:
              stats.overdue > 0
                ? "text-red-600"
                : stats.dueWithin365 > 0
                  ? "text-amber-600"
                  : "text-emerald-600",
          },
        ]}
      />

      <Tabs value={sub} onValueChange={setSub}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="portfolio">IP Portfolio</TabsTrigger>
          <TabsTrigger value="register">IP Register</TabsTrigger>
          <TabsTrigger value="valuation">Valuation</TabsTrigger>
          <TabsTrigger value="renewals">
            Renewals &amp; Deadlines
            {renewals.some(
              (r) => r.urgency === "overdue" || r.urgency === "critical",
            ) && <span className="ml-1.5 h-2 w-2 rounded-full bg-red-500" />}
          </TabsTrigger>
        </TabsList>

        {/* Portfolio cards */}
        <TabsContent value="portfolio" className="mt-4">
          {assets.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  title="No IP assets registered"
                  hint="Register trademarks, patents, domains and other intellectual property to track their renewals."
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {assets.map((a) => (
                <Card key={a._id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{a.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.regNo || "No registration number"}
                        </p>
                      </div>
                      <Badge variant="outline" className={TYPE_TONE[a.type]}>
                        {a.type}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <Badge
                          variant="outline"
                          className={STATUS_TONE(a.status)}
                        >
                          {a.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Value</p>
                        <p className="font-medium tabular-nums">
                          {money(a.value)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Expires</p>
                        <p className="font-medium tabular-nums">
                          {fmtDate(a.expiryDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Jurisdiction</p>
                        <p className="font-medium">{a.jurisdiction || "—"}</p>
                      </div>
                    </div>
                    {a.description && (
                      <p className="text-xs text-muted-foreground">
                        {a.description}
                      </p>
                    )}
                    {a.licensees.length > 0 && (
                      <p className="text-xs">
                        <span className="text-muted-foreground">
                          Licensed to:{" "}
                        </span>
                        {a.licensees.join(", ")}
                      </p>
                    )}
                    <DocChips docs={a.documents} max={3} />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => edit(a)}
                      >
                        <Pencil className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => setManaging(a._id)}
                      >
                        <CalendarClock className="h-3 w-3 mr-1" /> Deadlines
                        &amp; files
                        {a.deadlines.filter((d) => !d.done).length > 0 &&
                          ` (${a.deadlines.filter((d) => !d.done).length})`}
                      </Button>
                      {a.expiryDate && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setRenewing(a)}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" /> Renew
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setToDelete(a)}
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

        {/* Register table */}
        <TabsContent value="register" className="mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">
                Intellectual Property Register
              </CardTitle>
              <div className="flex gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-8 w-36 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {IP_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
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
                <EmptyState title="No IP assets match" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Reg. no.</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Filed</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Jurisdiction</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead>Documents</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((a) => (
                      <TableRow key={a._id}>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={TYPE_TONE[a.type]}
                          >
                            {a.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {a.regNo || "—"}
                        </TableCell>
                        <TableCell>{a.owner || "—"}</TableCell>
                        <TableCell className="tabular-nums">
                          {fmtDate(a.filingDate)}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {fmtDate(a.expiryDate)}
                        </TableCell>
                        <TableCell>{a.jurisdiction || "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={STATUS_TONE(a.status)}
                          >
                            {a.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {money(a.value)}
                        </TableCell>
                        <TableCell>
                          <DocChips docs={a.documents} max={2} />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => edit(a)}
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Valuation */}
        <TabsContent value="valuation" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                IP Portfolio Valuation Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {assets.length === 0 ? (
                <EmptyState title="Nothing to value yet" />
              ) : (
                <>
                  <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">
                          Total portfolio value
                        </p>
                        <p className="text-xl font-bold text-violet-700">
                          {money(stats.totalValue)}
                        </p>
                      </CardContent>
                    </Card>
                    {byType.map(([t, v]) => (
                      <Card key={t}>
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground">
                            {t} ({v.count})
                          </p>
                          <p className="text-xl font-bold">{money(v.value)}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {fmtPct(
                              stats.totalValue
                                ? (v.value / stats.totalValue) * 100
                                : 0,
                            )}{" "}
                            of portfolio
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {[...assets]
                      .sort((a, b) => b.value - a.value)
                      .map((a, i) => {
                        const pct = stats.totalValue
                          ? (a.value / stats.totalValue) * 100
                          : 0;
                        return (
                          <div
                            key={a._id}
                            className="flex items-center gap-3 text-xs"
                          >
                            <div
                              className="w-40 truncate font-medium"
                              title={a.name}
                            >
                              {a.name}
                            </div>
                            <div className="flex-1 h-5 rounded bg-muted overflow-hidden">
                              <div
                                className="h-full flex items-center px-2 text-white text-[10px] whitespace-nowrap"
                                style={{
                                  width: `${Math.max(pct, 0.5)}%`,
                                  background:
                                    SLICE_COLORS[i % SLICE_COLORS.length],
                                }}
                              >
                                {pct >= 12 ? money(a.value) : ""}
                              </div>
                            </div>
                            <div className="w-24 text-right tabular-nums">
                              {pct < 12 ? `${money(a.value)} · ` : ""}
                              {fmtPct(pct)}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Renewals & deadlines */}
        <TabsContent value="renewals" className="mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">
                  Upcoming Renewals &amp; Deadlines
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Everything below is shown live in the Compliance Calendar.
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {renewals.length === 0 ? (
                <EmptyState
                  title="No renewals or deadlines coming up"
                  hint="Give an IP asset an expiry date, or add a custom deadline, and it will appear here and in the Compliance Calendar."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Days remaining</TableHead>
                      <TableHead>Action required</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {renewals.map((r) => {
                      const asset =
                        assets.find((a) => a._id === r.assetId) ?? null;
                      return (
                        <TableRow key={r.key}>
                          <TableCell className="font-medium">
                            {r.assetName}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={TYPE_TONE[r.assetType]}
                            >
                              {r.assetType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {r.kind === "expiry" ? "Expiry / renewal" : r.label}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {fmtDate(r.dueDate)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`tabular-nums ${URGENCY_TONE[r.urgency]}`}
                            >
                              {daysLabel(r)}
                            </Badge>
                          </TableCell>
                          <TableCell>{r.action}</TableCell>
                          <TableCell>
                            {r.kind === "expiry" && asset ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => setRenewing(asset)}
                              >
                                <RefreshCw className="h-3 w-3 mr-1" /> Record
                                renewal
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                disabled={markDone.isPending}
                                onClick={() => markDone.mutate(r)}
                              >
                                <Check className="h-3 w-3 mr-1" /> Mark done
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AssetDialog
        asset={editing}
        open={formOpen}
        onOpenChange={setFormOpen}
        baseCurrency={data.baseCurrency}
      />
      <RenewDialog asset={renewing} onClose={() => setRenewing(null)} />
      <ManageDialog
        assetId={managing}
        assets={assets}
        onClose={() => setManaging(null)}
      />
      <ConfirmDialog
        open={!!toDelete}
        title={`Delete ${toDelete?.name}?`}
        description="The asset, its deadlines and its calendar entries are removed. This can't be undone."
        pending={del.isPending}
        onConfirm={() => toDelete && del.mutate(toDelete._id)}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
