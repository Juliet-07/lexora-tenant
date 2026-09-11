import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  FileSignature,
  FileText,
  Paperclip,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Wallet,
} from "lucide-react";
import { VendorContractDialog } from "@/components/crm/VendorContractDialog";
import {
  DD_CHECKLIST,
  ENGAGEMENT_TYPES,
  JURISDICTIONS,
  MODULE_OPTIONS,
  PAYMENT_TERMS,
  SPEND_MONTHS,
  VENDOR_CATEGORIES,
  activeContract,
  addVendor,
  addVendorNote,
  advanceContract,
  attachDdEvidence,
  daysUntil,
  deleteContract,
  setVendorStatus,
  toggleDdItem,
  useVendors,
  vendorSpendYtd,
  type Vendor,
  type VendorCategory,
  type VendorContract,
  type VendorRisk,
  type VendorStatus,
} from "@/lib/crm/vendorStore";

const money = (n: number, c = "USD") =>
  `${c === "USD" ? "$" : `${c} `}${n.toLocaleString()}`;

const RISK_TONE: Record<VendorRisk, string> = {
  Low: "bg-success/10 text-success border-success/20",
  Medium: "bg-warning/10 text-warning border-warning/20",
  High: "bg-destructive/10 text-destructive border-destructive/20",
};

const STATUS_TONE: Record<VendorStatus, string> = {
  Active: "bg-success/10 text-success border-success/20",
  "Pending DD": "bg-warning/10 text-warning border-warning/20",
  "Pending approval": "bg-info/10 text-info border-info/20",
  Suspended: "bg-destructive/10 text-destructive border-destructive/20",
  Offboarded: "bg-muted text-muted-foreground border-border",
};

const CONTRACT_TONE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  sent: "bg-info/10 text-info border-info/20",
  signed: "bg-primary/10 text-primary border-primary/20",
  active: "bg-success/10 text-success border-success/20",
  expired: "bg-destructive/10 text-destructive border-destructive/20",
  terminated: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function Vendors() {
  const vendors = useVendors();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [risk, setRisk] = useState("all");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const selected = vendors.find((v) => v.id === selectedId) ?? null;

  const filtered = useMemo(
    () =>
      vendors.filter((v) => {
        const q = search.trim().toLowerCase();
        if (
          q &&
          !`${v.legalName} ${v.tradingName} ${v.serviceSummary}`
            .toLowerCase()
            .includes(q)
        )
          return false;
        if (category !== "all" && v.category !== category) return false;
        if (risk !== "all" && v.risk !== risk) return false;
        if (status !== "all" && v.status !== status) return false;
        return true;
      }),
    [vendors, search, category, risk, status],
  );

  const totalSpend = vendors.reduce((s, v) => s + vendorSpendYtd(v), 0);
  const activeCount = vendors.filter((v) => v.status === "Active").length;
  const pendingDd = vendors.filter((v) => v.status === "Pending DD").length;
  const expiring = vendors.filter((v) => {
    const c = activeContract(v);
    return c ? daysUntil(c.endDate) <= 90 && daysUntil(c.endDate) >= 0 : false;
  });
  const ddCoverage = Math.round(
    (vendors.reduce(
      (s, v) => s + v.ddItems.filter((d) => d.done).length / v.ddItems.length,
      0,
    ) /
      Math.max(vendors.length, 1)) *
      100,
  );

  const byCategory = useMemo(() => {
    const map = new Map<VendorCategory, Vendor[]>();
    vendors.forEach((v) => {
      map.set(v.category, [...(map.get(v.category) ?? []), v]);
    });
    return [...map.entries()];
  }, [vendors]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Vendor Management</h1>
          <p className="text-sm text-muted-foreground">
            Vendor registry, due diligence, contracts and spend tracking
          </p>
        </div>
        <Button
          className="bg-gradient-to-r from-primary to-secondary"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" /> Add Vendor
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          {
            label: "Total vendors",
            value: vendors.length,
            icon: Building2,
            tone: "bg-primary/10 text-primary",
          },
          {
            label: "Active",
            value: activeCount,
            icon: CheckCircle2,
            tone: "bg-success/10 text-success",
          },
          {
            label: "Pending due diligence",
            value: pendingDd,
            icon: ShieldCheck,
            tone: "bg-warning/10 text-warning",
          },
          {
            label: "Contracts expiring (90d)",
            value: expiring.length,
            icon: AlertTriangle,
            tone: "bg-destructive/10 text-destructive",
          },
          {
            label: "Spend YTD",
            value: money(totalSpend),
            icon: Wallet,
            tone: "bg-info/10 text-info",
          },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${s.tone}`}>
                  <s.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-bold leading-none mt-1">
                    {s.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Vendors</TabsTrigger>
          <TabsTrigger value="category">By Category</TabsTrigger>
          <TabsTrigger value="dd">Due Diligence</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="spend">Spend Analysis</TabsTrigger>
          <TabsTrigger value="expiring">Expiring Contracts</TabsTrigger>
        </TabsList>

        {/* ── All vendors ─────────────────────────────────── */}
        <TabsContent value="all" className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search vendors…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {VENDOR_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={risk} onValueChange={setRisk}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All risk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All risk</SelectItem>
                {["Low", "Medium", "High"].map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                {[
                  "Active",
                  "Pending DD",
                  "Pending approval",
                  "Suspended",
                  "Offboarded",
                ].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Contract</TableHead>
                    <TableHead>Due diligence</TableHead>
                    <TableHead className="text-right">Spend YTD</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((v) => {
                    const c = activeContract(v);
                    const done = v.ddItems.filter((d) => d.done).length;
                    return (
                      <TableRow
                        key={v.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedId(v.id)}
                      >
                        <TableCell>
                          <p className="font-medium text-sm">{v.legalName}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {v.serviceSummary}
                          </p>
                        </TableCell>
                        <TableCell className="text-xs">{v.category}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs ${RISK_TONE[v.risk]}`}
                          >
                            {v.risk}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs ${STATUS_TONE[v.status]}`}
                          >
                            {v.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {c ? (
                            `Expires ${new Date(c.endDate).toLocaleDateString()}`
                          ) : (
                            <span className="text-muted-foreground">
                              Not yet contracted
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="w-36">
                          <div className="flex items-center gap-2">
                            <Progress
                              value={(done / v.ddItems.length) * 100}
                              className="h-1.5 w-20"
                            />
                            <span className="text-[11px] text-muted-foreground">
                              {done}/{v.ddItems.length}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {vendorSpendYtd(v)
                            ? money(vendorSpendYtd(v), v.currency)
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-sm text-muted-foreground py-8"
                      >
                        No vendors match these filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── By category ─────────────────────────────────── */}
        <TabsContent value="category" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {byCategory.map(([cat, list]) => (
              <Card key={cat}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{cat}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {list.length} vendor{list.length === 1 ? "" : "s"} ·{" "}
                    {money(list.reduce((s, v) => s + vendorSpendYtd(v), 0))} YTD
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {list.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedId(v.id)}
                      className="w-full flex items-center justify-between rounded-md border border-border/50 px-3 py-2 text-left hover:border-primary/40"
                    >
                      <span className="text-xs font-medium">{v.legalName}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${STATUS_TONE[v.status]}`}
                      >
                        {v.status}
                      </Badge>
                    </button>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Due diligence ───────────────────────────────── */}
        <TabsContent value="dd" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-semibold">
                  Due diligence coverage across the register
                </p>
                <Progress value={ddCoverage} className="h-2 mt-2" />
              </div>
              <span className="text-xl font-bold">{ddCoverage}%</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    {DD_CHECKLIST.map((c) => (
                      <TableHead key={c.label} className="text-[10px]">
                        {c.label.split(" ")[0]}
                      </TableHead>
                    ))}
                    <TableHead>Next review</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.map((v) => (
                    <TableRow
                      key={v.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedId(v.id)}
                    >
                      <TableCell className="text-sm font-medium">
                        {v.legalName}
                      </TableCell>
                      {v.ddItems.map((d) => (
                        <TableCell key={d.id}>
                          {d.done ? (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              —
                            </span>
                          )}
                        </TableCell>
                      ))}
                      <TableCell className="text-xs text-muted-foreground">
                        {v.nextReview || "Not scheduled"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Contracts ───────────────────────────────────── */}
        <TabsContent value="contracts" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contract</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.flatMap((v) =>
                    v.contracts.map((c) => (
                      <TableRow
                        key={c.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedId(v.id)}
                      >
                        <TableCell className="text-sm font-medium">
                          {c.title}
                        </TableCell>
                        <TableCell className="text-xs">{v.legalName}</TableCell>
                        <TableCell className="text-xs">
                          {c.templateName}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs capitalize ${CONTRACT_TONE[c.status]}`}
                          >
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {c.startDate} → {c.endDate}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {money(c.value, c.currency)}
                        </TableCell>
                      </TableRow>
                    )),
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Spend analysis ──────────────────────────────── */}
        <TabsContent value="spend" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground">Total YTD</p>
                <p className="text-2xl font-bold mt-1">{money(totalSpend)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground">Monthly average</p>
                <p className="text-2xl font-bold mt-1">
                  {money(Math.round(totalSpend / 8))}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground">
                  Committed annual contract value
                </p>
                <p className="text-2xl font-bold mt-1">
                  {money(
                    vendors.reduce(
                      (s, v) => s + (activeContract(v)?.value ?? 0),
                      0,
                    ),
                  )}
                </p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Spend by vendor</CardTitle>
            </CardHeader>
            <CardContent className="p-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    {SPEND_MONTHS.slice(0, 8).map((m) => (
                      <TableHead key={m} className="text-xs">
                        {m}
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors
                    .filter((v) => v.spend.length)
                    .map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="text-sm font-medium">
                          {v.legalName}
                        </TableCell>
                        {SPEND_MONTHS.slice(0, 8).map((m, i) => {
                          const e = v.spend[i];
                          return (
                            <TableCell key={m} className="text-xs">
                              {e && e.amount
                                ? money(e.amount, v.currency)
                                : "—"}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right text-sm font-semibold">
                          {money(vendorSpendYtd(v), v.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Expiring contracts ──────────────────────────── */}
        <TabsContent value="expiring" className="mt-4 space-y-3">
          {expiring.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                No vendor contracts expire in the next 90 days.
              </CardContent>
            </Card>
          )}
          {expiring
            .sort(
              (a, b) =>
                daysUntil(activeContract(a)!.endDate) -
                daysUntil(activeContract(b)!.endDate),
            )
            .map((v) => {
              const c = activeContract(v)!;
              const days = daysUntil(c.endDate);
              const urgent = days <= 30;
              return (
                <Card
                  key={v.id}
                  className={urgent ? "border-destructive/40" : ""}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <AlertTriangle
                      className={`h-5 w-5 ${urgent ? "text-destructive" : "text-warning"}`}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{v.legalName}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.title} · {v.category}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-semibold ${urgent ? "text-destructive" : "text-warning"}`}
                      >
                        {new Date(c.endDate).toLocaleDateString()}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {days} days left
                      </p>
                    </div>
                    <Button size="sm" onClick={() => setSelectedId(v.id)}>
                      Renew
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
        </TabsContent>
      </Tabs>

      <AddVendorDialog open={addOpen} onOpenChange={setAddOpen} />

      <VendorSheet
        vendor={selected}
        onClose={() => setSelectedId(null)}
        toast={toast}
      />
    </div>
  );
}

// ─── Vendor detail sheet ────────────────────────────────────────

function VendorSheet({
  vendor,
  onClose,
  toast,
}: {
  vendor: Vendor | null;
  onClose: () => void;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const [contractOpen, setContractOpen] = useState(false);
  const [editing, setEditing] = useState<VendorContract | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [preview, setPreview] = useState<VendorContract | null>(null);

  if (!vendor) return null;
  const done = vendor.ddItems.filter((d) => d.done).length;

  return (
    <>
      <Sheet open={!!vendor} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{vendor.legalName}</SheetTitle>
            <SheetDescription>
              {vendor.category} · {vendor.serviceSummary}
            </SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="overview" className="mt-4">
            <TabsList className="w-full grid grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="dd">Diligence</TabsTrigger>
              <TabsTrigger value="contracts">Contracts</TabsTrigger>
              <TabsTrigger value="spend">Spend</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              <DetailBlock
                title="Vendor details"
                rows={[
                  ["Legal name", vendor.legalName],
                  ["Trading name", vendor.tradingName || "—"],
                  ["Category", vendor.category],
                  ["Jurisdiction", vendor.jurisdiction],
                  ["Registration no.", vendor.registrationNumber || "—"],
                  ["Tax ID", vendor.taxId || "—"],
                  ["Website", vendor.website || "—"],
                ]}
              />
              <DetailBlock
                title="Primary contact"
                rows={[
                  ["Name", vendor.contactName],
                  ["Title", vendor.contactTitle || "—"],
                  ["Email", vendor.contactEmail],
                  ["Phone", vendor.contactPhone || "—"],
                ]}
              />
              <DetailBlock
                title="Commercial"
                rows={[
                  ["Engagement", vendor.engagementType],
                  ["Annual value", money(vendor.annualValue, vendor.currency)],
                  ["Payment terms", vendor.paymentTerms],
                  ["Budget code", vendor.budgetCode || "—"],
                  ["Used by", vendor.usedByModules.join(", ") || "—"],
                ]}
              />
              <DetailBlock
                title="Risk & governance"
                rows={[
                  ["Risk rating", vendor.risk],
                  ["Review frequency", vendor.reviewFrequency],
                  ["Next review", vendor.nextReview || "Not scheduled"],
                  ["Approved by", vendor.approver || "Pending"],
                  ["Onboarded", vendor.onboardedAt || "—"],
                ]}
              />
              {vendor.justification && (
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                    Business justification
                  </p>
                  <p className="text-sm mt-1">{vendor.justification}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    "Active",
                    "Pending approval",
                    "Suspended",
                    "Offboarded",
                  ] as VendorStatus[]
                ).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={vendor.status === s ? "default" : "outline"}
                    onClick={() => setVendorStatus(vendor.id, s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="dd" className="mt-4 space-y-3">
              <div className="flex items-center gap-3">
                <Progress
                  value={(done / vendor.ddItems.length) * 100}
                  className="h-2 flex-1"
                />
                <span className="text-xs text-muted-foreground">
                  {done}/{vendor.ddItems.length} complete
                </span>
              </div>
              {vendor.ddItems.map((d) => (
                <div
                  key={d.id}
                  className="flex items-start gap-3 rounded-lg border border-border/60 p-3"
                >
                  <Checkbox
                    checked={d.done}
                    onCheckedChange={() => toggleDdItem(vendor.id, d.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{d.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {d.hint}
                    </p>
                    {d.evidence && (
                      <p className="text-[11px] text-primary mt-1">
                        <Paperclip className="h-3 w-3 inline mr-1" />
                        {d.evidence}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      attachDdEvidence(
                        vendor.id,
                        d.id,
                        `${d.label.toLowerCase().replace(/[^a-z]+/g, "-")}.pdf`,
                      );
                      toast({ title: "Evidence attached" });
                    }}
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="contracts" className="mt-4 space-y-3">
              <Button
                className="w-full"
                onClick={() => {
                  setEditing(null);
                  setContractOpen(true);
                }}
              >
                <FileSignature className="h-4 w-4 mr-2" /> New contract from
                template
              </Button>
              {vendor.contracts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No contracts yet. Draft one from a template above.
                </p>
              )}
              {vendor.contracts.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg border border-border/60 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{c.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {c.templateName} · {money(c.value, c.currency)} ·{" "}
                        {c.startDate} → {c.endDate}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] capitalize ${CONTRACT_TONE[c.status]}`}
                    >
                      {c.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Signer: {c.signerName} ({c.signerEmail})
                  </p>
                  {c.history.length > 0 && (
                    <div className="space-y-0.5">
                      {c.history.slice(-3).map((h, i) => (
                        <p
                          key={i}
                          className="text-[10px] text-muted-foreground"
                        >
                          {new Date(h.at).toLocaleString()} — {h.label}
                        </p>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPreview(c)}
                    >
                      <FileText className="h-3.5 w-3.5 mr-1" /> View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditing(c);
                        setContractOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    {c.status === "draft" && (
                      <Button
                        size="sm"
                        onClick={() =>
                          advanceContract(
                            vendor.id,
                            c.id,
                            "sent",
                            `Sent to ${c.signerEmail}`,
                          )
                        }
                      >
                        <Send className="h-3.5 w-3.5 mr-1" /> Send
                      </Button>
                    )}
                    {c.status === "sent" && (
                      <Button
                        size="sm"
                        onClick={() =>
                          advanceContract(
                            vendor.id,
                            c.id,
                            "signed",
                            `Signed by ${c.signerName}`,
                          )
                        }
                      >
                        Mark signed
                      </Button>
                    )}
                    {c.status === "signed" && (
                      <Button
                        size="sm"
                        onClick={() =>
                          advanceContract(
                            vendor.id,
                            c.id,
                            "active",
                            "Contract activated",
                          )
                        }
                      >
                        Activate
                      </Button>
                    )}
                    {c.status === "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          advanceContract(
                            vendor.id,
                            c.id,
                            "terminated",
                            "Contract terminated",
                          )
                        }
                      >
                        Terminate
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteContract(vendor.id, c.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="spend" className="mt-4 space-y-3">
              <div className="rounded-lg border border-border/60 p-4">
                <p className="text-xs text-muted-foreground">Spend YTD</p>
                <p className="text-2xl font-bold">
                  {money(vendorSpendYtd(vendor), vendor.currency)}
                </p>
              </div>
              {vendor.spend.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No spend recorded yet.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {vendor.spend.map((e, i) => (
                    <div key={e.month} className="flex items-center gap-2">
                      <span className="text-xs w-10 text-muted-foreground">
                        {SPEND_MONTHS[i]}
                      </span>
                      <Progress
                        value={
                          (e.amount /
                            Math.max(...vendor.spend.map((s) => s.amount), 1)) *
                          100
                        }
                        className="h-2 flex-1"
                      />
                      <span className="text-xs w-16 text-right">
                        {money(e.amount, vendor.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="notes" className="mt-4 space-y-3">
              <div className="space-y-2 rounded-lg border border-border/60 p-3">
                <Input
                  placeholder="Note title"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                />
                <Textarea
                  rows={3}
                  placeholder="What happened?"
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (!noteTitle.trim()) return;
                    addVendorNote(vendor.id, noteTitle.trim(), noteBody.trim());
                    setNoteTitle("");
                    setNoteBody("");
                  }}
                >
                  Add note
                </Button>
              </div>
              {vendor.notes.map((n) => (
                <div
                  key={n.id}
                  className="rounded-lg border border-border/60 p-3"
                >
                  <div className="flex justify-between">
                    <p className="text-sm font-semibold">{n.title}</p>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(n.at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{n.body}</p>
                  <p className="text-[10px] text-primary mt-1">{n.author}</p>
                </div>
              ))}
              <div>
                <p className="text-[11px] font-semibold uppercase text-muted-foreground mb-2">
                  Activity
                </p>
                {vendor.activity.map((a) => (
                  <div
                    key={a.id}
                    className="flex gap-2 py-1.5 border-b last:border-0"
                  >
                    <span className="text-xs flex-1">{a.text}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(a.at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <VendorContractDialog
        vendor={vendor}
        contract={editing}
        open={contractOpen}
        onOpenChange={setContractOpen}
      />

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{preview?.title}</DialogTitle>
            <DialogDescription>
              {preview?.templateName} · {preview?.status}
            </DialogDescription>
          </DialogHeader>
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: preview?.body ?? "" }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function DetailBlock({
  title,
  rows,
}: {
  title: string;
  rows: [string, string][];
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase text-muted-foreground mb-1.5">
        {title}
      </p>
      <div className="rounded-lg border border-border/60 divide-y">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-3 py-1.5">
            <span className="text-xs text-muted-foreground">{k}</span>
            <span className="text-xs font-medium text-right">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Add vendor wizard ──────────────────────────────────────────

function AddVendorDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [f, setF] = useState({
    legalName: "",
    tradingName: "",
    category: "" as VendorCategory | "",
    jurisdiction: "",
    registrationNumber: "",
    taxId: "",
    contactName: "",
    contactTitle: "",
    contactEmail: "",
    contactPhone: "",
    website: "",
    serviceSummary: "",
    engagementType: ENGAGEMENT_TYPES[0],
    annualValue: "",
    currency: "USD",
    paymentTerms: PAYMENT_TERMS[0],
    budgetCode: "",
    risk: "Low" as VendorRisk,
    reviewFrequency: "Annual",
    justification: "",
    approver: "",
  });
  const [ddDone, setDdDone] = useState<boolean[]>(
    DD_CHECKLIST.map(() => false),
  );

  const set = (k: keyof typeof f, v: any) => setF((p) => ({ ...p, [k]: v }));

  const STEP_LABELS = [
    "1. Details",
    "2. Services",
    "3. Due diligence",
    "4. Justification",
  ];

  const reset = () => {
    setStep(0);
    setDdDone(DD_CHECKLIST.map(() => false));
  };

  const submit = () => {
    if (!f.legalName.trim() || !f.category || !f.contactEmail.trim()) {
      toast({
        title: "Missing details",
        description: "Legal name, category and contact email are required.",
        variant: "destructive",
      });
      setStep(0);
      return;
    }
    addVendor({
      legalName: f.legalName.trim(),
      tradingName: f.tradingName.trim(),
      category: f.category as VendorCategory,
      serviceSummary: f.serviceSummary.trim(),
      jurisdiction: f.jurisdiction || "Other",
      registrationNumber: f.registrationNumber,
      taxId: f.taxId,
      contactName: f.contactName.trim(),
      contactTitle: f.contactTitle,
      contactEmail: f.contactEmail.trim(),
      contactPhone: f.contactPhone,
      website: f.website,
      engagementType: f.engagementType,
      annualValue: Number(f.annualValue) || 0,
      currency: f.currency,
      paymentTerms: f.paymentTerms,
      budgetCode: f.budgetCode,
      risk: f.risk,
      reviewFrequency: f.reviewFrequency,
      status: ddDone.every(Boolean) ? "Pending approval" : "Pending DD",
      justification: f.justification,
      approver: f.approver,
      ddDone,
    });
    toast({
      title: "Vendor registered",
      description: `${f.legalName} added to the vendor register.`,
    });
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Vendor</DialogTitle>
          <DialogDescription>
            Register a new vendor for due diligence and approval.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          {STEP_LABELS.map((l, i) => (
            <div
              key={l}
              className={`flex-1 rounded-md px-3 py-1.5 text-[11px] font-semibold text-center border ${
                i === step
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "text-muted-foreground border-border/60"
              }`}
            >
              {l}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Legal name *" className="sm:col-span-2">
              <Input
                value={f.legalName}
                onChange={(e) => set("legalName", e.target.value)}
                placeholder="e.g. Smile Identity Ltd"
              />
            </Field>
            <Field label="Trading name">
              <Input
                value={f.tradingName}
                onChange={(e) => set("tradingName", e.target.value)}
              />
            </Field>
            <Field label="Category *">
              <Select
                value={f.category}
                onValueChange={(v) => set("category", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category…" />
                </SelectTrigger>
                <SelectContent>
                  {VENDOR_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Jurisdiction">
              <Select
                value={f.jurisdiction}
                onValueChange={(v) => set("jurisdiction", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select jurisdiction…" />
                </SelectTrigger>
                <SelectContent>
                  {JURISDICTIONS.map((j) => (
                    <SelectItem key={j} value={j}>
                      {j}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Registration number">
              <Input
                value={f.registrationNumber}
                onChange={(e) => set("registrationNumber", e.target.value)}
              />
            </Field>
            <Field label="Tax ID / TIN">
              <Input
                value={f.taxId}
                onChange={(e) => set("taxId", e.target.value)}
              />
            </Field>
            <Field label="Contact name">
              <Input
                value={f.contactName}
                onChange={(e) => set("contactName", e.target.value)}
              />
            </Field>
            <Field label="Job title">
              <Input
                value={f.contactTitle}
                onChange={(e) => set("contactTitle", e.target.value)}
              />
            </Field>
            <Field label="Email *">
              <Input
                value={f.contactEmail}
                onChange={(e) => set("contactEmail", e.target.value)}
              />
            </Field>
            <Field label="Phone">
              <Input
                value={f.contactPhone}
                onChange={(e) => set("contactPhone", e.target.value)}
              />
            </Field>
            <Field label="Website" className="sm:col-span-2">
              <Input
                value={f.website}
                onChange={(e) => set("website", e.target.value)}
                placeholder="https://"
              />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Services to be provided" className="sm:col-span-2">
              <Textarea
                rows={3}
                value={f.serviceSummary}
                onChange={(e) => set("serviceSummary", e.target.value)}
              />
            </Field>
            <Field label="Engagement type">
              <Select
                value={f.engagementType}
                onValueChange={(v) => set("engagementType", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENGAGEMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Estimated annual value">
              <Input
                type="number"
                value={f.annualValue}
                onChange={(e) => set("annualValue", e.target.value)}
              />
            </Field>
            <Field label="Payment terms">
              <Select
                value={f.paymentTerms}
                onValueChange={(v) => set("paymentTerms", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TERMS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Budget code / cost centre">
              <Input
                value={f.budgetCode}
                onChange={(e) => set("budgetCode", e.target.value)}
              />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Complete the due diligence checklist. Items left unchecked keep
              the vendor in “Pending DD”.
            </p>
            {DD_CHECKLIST.map((c, i) => (
              <label
                key={c.label}
                className="flex items-start gap-3 rounded-lg border border-border/60 p-3 cursor-pointer"
              >
                <Checkbox
                  checked={ddDone[i]}
                  onCheckedChange={(v) =>
                    setDdDone((p) => p.map((x, j) => (j === i ? !!v : x)))
                  }
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium">{c.label}</p>
                  <p className="text-[11px] text-muted-foreground">{c.hint}</p>
                </div>
              </label>
            ))}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Initial risk rating">
                <Select value={f.risk} onValueChange={(v) => set("risk", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">
                      Low — no client data access
                    </SelectItem>
                    <SelectItem value="Medium">
                      Medium — sensitive data or operations
                    </SelectItem>
                    <SelectItem value="High">
                      High — critical or regulated dependency
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Review frequency">
                <Select
                  value={f.reviewFrequency}
                  onValueChange={(v) => set("reviewFrequency", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Annual", "Semi-annual", "Quarterly"].map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <Field label="Business justification">
              <Textarea
                rows={4}
                value={f.justification}
                onChange={(e) => set("justification", e.target.value)}
                placeholder="Why is this vendor needed and why were they selected over alternatives?"
              />
            </Field>
            <Field label="Approver">
              <Input
                value={f.approver}
                onChange={(e) => set("approver", e.target.value)}
                placeholder="Who signs off this vendor?"
              />
            </Field>
            <div className="rounded-lg border border-border/60 p-3 text-xs space-y-1">
              <p className="font-semibold text-sm">Summary</p>
              <p>
                {f.legalName || "—"} · {f.category || "—"} ·{" "}
                {f.jurisdiction || "—"}
              </p>
              <p>
                {ddDone.filter(Boolean).length}/{DD_CHECKLIST.length} due
                diligence items complete
              </p>
              <p>
                Will be registered as{" "}
                <strong>
                  {ddDone.every(Boolean) ? "Pending approval" : "Pending DD"}
                </strong>
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="sm:justify-between gap-2">
          <Button
            variant="outline"
            disabled={step === 0}
            onClick={() => setStep((s) => s - 1)}
          >
            Back
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep((s) => s + 1)}>Next</Button>
          ) : (
            <Button onClick={submit}>Register vendor</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
