import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Plus,
  Search,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import {
  fetchVendors,
  DD_CHECKLIST_LABELS,
  activeContract,
  daysUntil,
  vendorSpendYtd,
  SPEND_MONTHS,
  VENDOR_CATEGORIES,
  type Vendor,
  type VendorCategory,
  type VendorRisk,
  type VendorStatus,
} from "@/lib/crm/vendor-api";
import { VendorSheet } from "@/components/crm/vendorManager/VendorSheet";
import { AddVendorDialog } from "@/components/crm/vendorManager/AddVendorDialog";

const money = (n: number, c = "USD") =>
  `${c === "USD" ? "$" : `${c} `}${n.toLocaleString()}`;

export const RISK_TONE: Record<VendorRisk, string> = {
  Low: "bg-success/10 text-success border-success/20",
  Medium: "bg-warning/10 text-warning border-warning/20",
  High: "bg-destructive/10 text-destructive border-destructive/20",
};

export const STATUS_TONE: Record<VendorStatus, string> = {
  Active: "bg-success/10 text-success border-success/20",
  "Pending DD": "bg-warning/10 text-warning border-warning/20",
  "Pending approval": "bg-info/10 text-info border-info/20",
  Suspended: "bg-destructive/10 text-destructive border-destructive/20",
  Offboarded: "bg-muted text-muted-foreground border-border",
};

export const CONTRACT_TONE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  sent: "bg-info/10 text-info border-info/20",
  signed: "bg-primary/10 text-primary border-primary/20",
  active: "bg-success/10 text-success border-success/20",
  expired: "bg-destructive/10 text-destructive border-destructive/20",
  terminated: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function Vendors() {
  const { toast } = useToast();
  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: fetchVendors,
  });

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [risk, setRisk] = useState("all");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const selected = vendors.find((v) => v._id === selectedId) ?? null;

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
    return c?.endDate
      ? daysUntil(c.endDate) <= 90 && daysUntil(c.endDate) >= 0
      : false;
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

  if (isLoading) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        Loading vendors…
      </p>
    );
  }

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
                        key={v._id}
                        className="cursor-pointer"
                        onClick={() => setSelectedId(v._id)}
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
                          {c?.endDate ? (
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
                      key={v._id}
                      onClick={() => setSelectedId(v._id)}
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
                    {DD_CHECKLIST_LABELS.map((label) => (
                      <TableHead key={label} className="text-[10px]">
                        {label.split(" ")[0]}
                      </TableHead>
                    ))}
                    <TableHead>Next review</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.map((v) => (
                    <TableRow
                      key={v._id}
                      className="cursor-pointer"
                      onClick={() => setSelectedId(v._id)}
                    >
                      <TableCell className="text-sm font-medium">
                        {v.legalName}
                      </TableCell>
                      {v.ddItems.map((d) => (
                        <TableCell key={d._id}>
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
                        {v.nextReview
                          ? new Date(v.nextReview).toLocaleDateString()
                          : "Not scheduled"}
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
                        key={c._id}
                        className="cursor-pointer"
                        onClick={() => setSelectedId(v._id)}
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
                          {c.startDate?.slice(0, 10)} →{" "}
                          {c.endDate?.slice(0, 10)}
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
                      <TableRow key={v._id}>
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
                daysUntil(activeContract(a)!.endDate!) -
                daysUntil(activeContract(b)!.endDate!),
            )
            .map((v) => {
              const c = activeContract(v)!;
              const days = daysUntil(c.endDate!);
              const urgent = days <= 30;
              return (
                <Card
                  key={v._id}
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
                        {new Date(c.endDate!).toLocaleDateString()}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {days} days left
                      </p>
                    </div>
                    <Button size="sm" onClick={() => setSelectedId(v._id)}>
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
        vendorId={selected?._id ?? null}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
