import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MyContactsPanel } from "@/components/crm/MyContactsPanel";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Search,
  Mail,
  Phone,
  Building2,
  ShieldAlert,
  ShieldCheck,
  FileCheck2,
  ExternalLink,
} from "lucide-react";
import {
  fetchClients,
  displayName,
  prettyLabel,
  toneFor,
  type ApiClient,
} from "@/lib/client/clients-api";
import { fetchMyProfile } from "@/lib/hr/hr-api";
import {
  fetchMyVendorApprovals,
  fetchMyVendorApproval,
  decideMyVendorApproval,
  DD_CHECKLIST_LABELS,
  vendorSpendYtd,
  type Vendor,
} from "@/lib/crm/vendor-api";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCheck } from "lucide-react";
import {
  fetchMyLeads,
  convertMyLead,
  markMyLeadLost,
  type Lead,
} from "@/lib/crm/crm-pipeline-api";
import { LeadDetailPanel } from "@/components/crm/LeadDetailPanel";
import {
  ConvertLeadDialog,
  type ConvertLeadPayload,
} from "@/components/crm/ConvertLeadDialog";

const riskStyle: Record<string, string> = {
  low: "bg-success/10 text-success",
  medium: "bg-warning/10 text-warning",
  high: "bg-destructive/10 text-destructive",
};

export default function AssignedClients() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [selected, setSelected] = useState<ApiClient | null>(null);

  // No assignedTo param needed — the backend already scopes this to
  // clients assigned to the logged-in employee, enforced server-side
  // from their own identity, not a value the frontend could tamper
  // with. Same call an admin's Clients.tsx makes; the response
  // differs because the caller differs.
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["my-assigned-clients"],
    queryFn: fetchClients,
  });

  // Gates the Vendors tab — only shown to a genuine Head of
  // Department or Manager, matching what the backend actually
  // enforces (a regular employee's approvals list is just empty).
  const { data: profile } = useQuery({
    queryKey: ["my-employee-profile"],
    queryFn: fetchMyProfile,
  });
  const isApprover =
    profile?.hierarchyRole === "manager" ||
    profile?.hierarchyRole === "head_of_department";

  const { data: vendorApprovals = { pending: [], approved: [] } } = useQuery({
    queryKey: ["my-vendor-approvals"],
    queryFn: fetchMyVendorApprovals,
    enabled: isApprover,
  });
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);

  const { data: myLeads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ["my-leads"],
    queryFn: fetchMyLeads,
  });
  const myOpenLeadsCount = myLeads.filter((l) => l.status === "open").length;
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [convertTarget, setConvertTarget] = useState<Lead | null>(null);
  const [lostTarget, setLostTarget] = useState<Lead | null>(null);
  const [lostReason, setLostReason] = useState("");

  const convertMut = useMutation({
    mutationFn: (payload: ConvertLeadPayload) =>
      convertMyLead(convertTarget!._id, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["my-leads"] });
      setConvertTarget(null);
      toast({ title: "Converted", description: res.message });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to convert lead",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const markLostMut = useMutation({
    mutationFn: () => markMyLeadLost(lostTarget!._id, lostReason.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-leads"] });
      setLostTarget(null);
      setLostReason("");
      toast({ title: "Lead marked lost" });
    },
    onError: (err: any) =>
      toast({
        title: "Could not mark lost",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (
        statusFilter !== "all" &&
        (c.status ?? "").toLowerCase() !== statusFilter
      )
        return false;
      if (
        riskFilter !== "all" &&
        (c.riskLevel ?? "").toLowerCase() !== riskFilter
      )
        return false;
      if (query) {
        const haystack = `${displayName(c)} ${c.email}`.toLowerCase();
        if (!haystack.includes(query.toLowerCase())) return false;
      }
      return true;
    });
  }, [clients, query, statusFilter, riskFilter]);

  const stats = [
    {
      label: "Assigned",
      value: clients.length,
      icon: Users,
      tone: "text-primary",
    },
    {
      label: "High risk",
      value: clients.filter((c) => (c.riskLevel ?? "").toLowerCase() === "high")
        .length,
      icon: ShieldAlert,
      tone: "text-destructive",
    },
    {
      label: "Pending KYC",
      value: clients.filter((c) =>
        ["not_started", "in_progress", "submitted"].includes(
          (c.kycStatus ?? "").toLowerCase(),
        ),
      ).length,
      icon: FileCheck2,
      tone: "text-warning",
    },
    {
      label: "Active",
      value: clients.filter((c) => (c.status ?? "").toLowerCase() === "active")
        .length,
      icon: ShieldCheck,
      tone: "text-success",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Clients</h1>
        <p className="text-sm text-muted-foreground">
          Clients assigned to you.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold mt-1">{s.value}</p>
              </div>
              <div className={`p-3 rounded-xl bg-accent ${s.tone}`}>
                <s.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="clients">
        <TabsList>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="leads">
            Leads
            {myOpenLeadsCount > 0 && (
              <span className="ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {myOpenLeadsCount}
              </span>
            )}
          </TabsTrigger>
          {isApprover && (
            <TabsTrigger value="vendors">
              Vendors
              {vendorApprovals.pending.length > 0 && (
                <span className="ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                  {vendorApprovals.pending.length}
                </span>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="clients" className="pt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Client list
                </CardTitle>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search name or email"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="pl-9 w-full sm:w-64 h-9"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-36 h-9">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="invited">Invited</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={riskFilter} onValueChange={setRiskFilter}>
                    <SelectTrigger className="w-full sm:w-32 h-9">
                      <SelectValue placeholder="Risk" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All risk</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Risk</TableHead>
                      <TableHead>KYC</TableHead>
                      <TableHead className="text-right">Country</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((c) => (
                      <TableRow
                        key={c._id}
                        className="cursor-pointer hover:bg-accent/40"
                        onClick={() => setSelected(c)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {c.classifications === "corporate" ? (
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Users className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div>
                              <p className="font-medium text-sm">
                                {displayName(c)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {c.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize text-sm">
                          {prettyLabel(c.classifications)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${toneFor(c.status)}`}
                          >
                            {prettyLabel(c.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-[10px] capitalize ${riskStyle[(c.riskLevel ?? "").toLowerCase()] ?? "bg-muted text-muted-foreground"}`}
                          >
                            {c.riskLevel ?? "Unrated"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${toneFor(c.kycStatus)}`}
                          >
                            {prettyLabel(c.kycStatus)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {c.country ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-sm text-muted-foreground py-8"
                        >
                          {clients.length === 0
                            ? "No clients assigned to you yet."
                            : "No clients match your filters."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="pt-4">
          <MyContactsPanel />
        </TabsContent>

        <TabsContent value="leads" className="pt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Leads assigned to me</CardTitle>
            </CardHeader>
            <CardContent>
              {leadsLoading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Loading…
                </p>
              ) : myLeads.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No leads assigned to you yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {myLeads.map((l) => (
                    <button
                      key={l._id}
                      onClick={() => setSelectedLead(l)}
                      className="w-full flex items-center justify-between rounded-lg border border-border/60 p-3 text-left hover:border-primary/40"
                    >
                      <div>
                        <p className="text-sm font-semibold">
                          {l.contactName || l.companyName || "Untitled lead"}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {l.stage} · {l.companyName || "No company"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] capitalize ${
                            l.temperature === "hot"
                              ? "bg-destructive/10 text-destructive border-destructive/20"
                              : l.temperature === "cold"
                                ? "bg-info/10 text-info border-info/20"
                                : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {l.temperature ?? "warm"}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-[10px] capitalize"
                        >
                          {l.status}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isApprover && (
          <TabsContent value="vendors" className="pt-4 space-y-6">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                <ClipboardCheck className="h-4 w-4" /> Needs your approval
              </h3>
              {vendorApprovals.pending.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  Nothing pending right now.
                </p>
              ) : (
                <div className="space-y-2">
                  {vendorApprovals.pending.map((v) => (
                    <button
                      key={v._id}
                      onClick={() => setSelectedVendorId(v._id)}
                      className="w-full flex items-center justify-between rounded-lg border border-border/60 p-3 text-left hover:border-primary/40"
                    >
                      <div>
                        <p className="text-sm font-semibold">{v.legalName}</p>
                        <p className="text-xs text-muted-foreground">
                          {v.category} · Requested{" "}
                          {v.approvalRequestedAt &&
                            new Date(
                              v.approvalRequestedAt,
                            ).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className="bg-warning/10 text-warning">
                        Pending
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                <ShieldCheck className="h-4 w-4" /> Approved by you
              </h3>
              {vendorApprovals.approved.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  You haven't approved any vendors yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {vendorApprovals.approved.map((v) => (
                    <button
                      key={v._id}
                      onClick={() => setSelectedVendorId(v._id)}
                      className="w-full flex items-center justify-between rounded-lg border border-border/60 p-3 text-left hover:border-primary/40"
                    >
                      <div>
                        <p className="text-sm font-semibold">{v.legalName}</p>
                        <p className="text-xs text-muted-foreground">
                          {v.category} · Approved{" "}
                          {v.approvalDecidedAt &&
                            new Date(v.approvalDecidedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className="bg-success/10 text-success">
                        Active
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>

      <VendorApprovalDialog
        vendorId={selectedVendorId}
        onClose={() => setSelectedVendorId(null)}
      />

      <LeadDetailPanel
        lead={selectedLead}
        mode="employee"
        onClose={() => setSelectedLead(null)}
        onConvert={(l) => {
          setSelectedLead(null);
          setConvertTarget(l);
        }}
        onMarkLost={(l) => {
          setSelectedLead(null);
          setLostTarget(l);
        }}
        onUpdate={(l) => setSelectedLead(l)}
      />

      <ConvertLeadDialog
        lead={convertTarget}
        onClose={() => setConvertTarget(null)}
        onConfirm={(payload) => convertMut.mutate(payload)}
        isSubmitting={convertMut.isPending}
      />

      <Dialog
        open={!!lostTarget}
        onOpenChange={(o) => !o && setLostTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Mark{" "}
              {lostTarget?.contactName ||
                lostTarget?.companyName ||
                "this lead"}{" "}
              as lost?
            </DialogTitle>
          </DialogHeader>
          <Textarea
            rows={3}
            placeholder="Reason (optional)…"
            value={lostReason}
            onChange={(e) => setLostReason(e.target.value)}
          />
          <DialogFooter>
            <Button
              disabled={markLostMut.isPending}
              onClick={() => markLostMut.mutate()}
            >
              Mark as lost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {selected.classifications === "corporate" ? (
                    <Building2 className="h-4 w-4" />
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                  {displayName(selected)}
                </SheetTitle>
                <SheetDescription className="capitalize">
                  {prettyLabel(selected.classifications)} · Client since{" "}
                  {new Date(selected.createdAt).toLocaleDateString()}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={toneFor(selected.status)}>
                    {prettyLabel(selected.status)}
                  </Badge>
                  <Badge
                    className={`capitalize ${riskStyle[(selected.riskLevel ?? "").toLowerCase()] ?? "bg-muted text-muted-foreground"}`}
                  >
                    {selected.riskLevel ?? "Unrated"} risk
                  </Badge>
                  <Badge
                    variant="outline"
                    className={toneFor(selected.kycStatus)}
                  >
                    KYC: {prettyLabel(selected.kycStatus)}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{selected.email}</span>
                  </div>
                  {selected.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{selected.phone}</span>
                    </div>
                  )}
                  {selected.country && (
                    <p className="text-xs text-muted-foreground">
                      {selected.country}
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button asChild variant="outline" className="flex-1">
                    <Link to="/projects">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View related projects
                    </Link>
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Real detail view for a vendor an employee is (or was) the
// approver on — same underlying data an admin sees, scoped by the
// backend to only what this employee is authorized to view.
function VendorApprovalDialog({
  vendorId,
  onClose,
}: {
  vendorId: string | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: vendor } = useQuery({
    queryKey: ["my-vendor-approval", vendorId],
    queryFn: () => fetchMyVendorApproval(vendorId!),
    enabled: !!vendorId,
  });

  const [decisionOpen, setDecisionOpen] = useState<
    "approved" | "rejected" | null
  >(null);
  const [decisionNote, setDecisionNote] = useState("");

  const decideMut = useMutation({
    mutationFn: () =>
      decideMyVendorApproval(vendorId!, decisionOpen!, decisionNote.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-vendor-approvals"] });
      queryClient.invalidateQueries({
        queryKey: ["my-vendor-approval", vendorId],
      });
      setDecisionOpen(null);
      setDecisionNote("");
      toast({
        title:
          decisionOpen === "approved" ? "Vendor approved" : "Vendor rejected",
      });
      onClose();
    },
    onError: (err: any) =>
      toast({
        title: "Could not record decision",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  if (!vendor) return null;
  const doneCount = vendor.ddItems.filter((d) => d.done).length;

  return (
    <>
      <Dialog open={!!vendor} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{vendor.legalName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border border-border/60 divide-y">
              {[
                ["Category", vendor.category],
                ["Jurisdiction", vendor.jurisdiction],
                ["Contact", `${vendor.contactName} (${vendor.contactEmail})`],
                [
                  "Annual value",
                  `${vendor.currency} ${vendor.annualValue.toLocaleString()}`,
                ],
                ["Risk rating", vendor.risk],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between px-3 py-1.5">
                  <span className="text-xs text-muted-foreground">{k}</span>
                  <span className="text-xs font-medium text-right">{v}</span>
                </div>
              ))}
            </div>

            {vendor.justification && (
              <div>
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                  Business justification
                </p>
                <p className="text-sm mt-1">{vendor.justification}</p>
              </div>
            )}

            <div>
              <p className="text-[11px] font-semibold uppercase text-muted-foreground mb-1">
                Due diligence — {doneCount}/{vendor.ddItems.length} complete
              </p>
              {vendor.ddItems.map((d) => (
                <div key={d._id} className="flex items-center gap-2 py-1">
                  <ShieldCheck
                    className={`h-3.5 w-3.5 shrink-0 ${d.done ? "text-success" : "text-muted-foreground"}`}
                  />
                  <span className="text-xs">{d.label}</span>
                </div>
              ))}
            </div>

            {vendor.approvalStatus === "pending" ? (
              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1"
                  onClick={() => setDecisionOpen("approved")}
                >
                  Approve
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setDecisionOpen("rejected")}
                >
                  Reject
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground pt-2">
                {vendor.approvalStatus === "approved"
                  ? "You've already approved this vendor."
                  : "This vendor was rejected."}
                {vendor.approvalDecisionNote &&
                  ` — ${vendor.approvalDecisionNote}`}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!decisionOpen}
        onOpenChange={(o) => !o && setDecisionOpen(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decisionOpen === "approved" ? "Approve vendor" : "Reject vendor"}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Decision note (optional)…"
            value={decisionNote}
            onChange={(e) => setDecisionNote(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant={decisionOpen === "rejected" ? "destructive" : "default"}
              disabled={decideMut.isPending}
              onClick={() => decideMut.mutate()}
            >
              Confirm {decisionOpen}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
