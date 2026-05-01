import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  Eye,
  FileText,
  Plus,
  Send,
  Loader2,
  RefreshCw,
  Clock,
  Building2,
  User as UserIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ApiClient,
  displayName,
  prettyLabel,
  toneFor,
} from "@/lib/clients-api";
import { api } from "@/lib/api";

// Onboarding endpoint (separate from /tenant/my-clients).
// TODO: replace path when backend confirms — falls back gracefully.
const ONBOARDING_ENDPOINT = "/tenant/onboarding";

const fetchOnboardingClients = async (): Promise<ApiClient[]> => {
  try {
    const res = await api.get(ONBOARDING_ENDPOINT);
    const data = res.data?.data;
    if (Array.isArray(data)) return data;
    return data?.clients ?? data?.items ?? [];
  } catch {
    // fallback to my-clients filtered to onboarding-relevant statuses
    const res = await api.get("/tenant/my-clients");
    const data = res.data?.data;
    const list: ApiClient[] = Array.isArray(data) ? data : (data?.clients ?? data?.items ?? []);
    return list;
  }
};

const PENDING_STATUSES = new Set([
  "submitted",
  "in_progress",
  "pending",
]);

export default function ClientOnboarding() {
  const { toast } = useToast();
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newClient, setNewClient] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    classification: "individual" as "individual" | "corporate",
    businessName: "",
  });

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const list = await fetchOnboardingClients();
      setClients(list);
    } catch (err: any) {
      toast({
        title: "Failed to load clients",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const pending = clients.filter((c) => {
    const s = (c.status ?? "").toLowerCase();
    const k = (c.kycStatus ?? "").toLowerCase();
    return PENDING_STATUSES.has(s) || k === "submitted" || k === "in_progress";
  });

  const handleCreate = async () => {
    if (!newClient.email) return;
    if (newClient.classification === "individual" && !newClient.firstName) return;
    if (newClient.classification === "corporate" && !newClient.businessName) return;

    setCreating(true);
    try {
      const payload =
        newClient.classification === "individual"
          ? {
              firstName: newClient.firstName,
              lastName: newClient.lastName,
              email: newClient.email,
              phone: newClient.phone,
              classification: "individual",
            }
          : {
              businessName: newClient.businessName,
              email: newClient.email,
              phone: newClient.phone,
              classification: "corporate",
            };

      await api.post("/tenant/my-clients", payload);
      toast({
        title: "Client invited",
        description: `Onboarding link sent to ${newClient.email}`,
      });
      setDialogOpen(false);
      setNewClient({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        classification: "individual",
        businessName: "",
      });
      load(true);
    } catch (err: any) {
      toast({
        title: "Could not create client",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pending Approvals</h1>
          <p className="text-sm text-muted-foreground">
            {loading
              ? "Loading…"
              : `${pending.length} client${pending.length === 1 ? "" : "s"} awaiting review`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => load(true)}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-secondary">
                <Plus className="h-4 w-4 mr-2" /> Add Client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite New Client</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Client Type</Label>
                  <Select
                    value={newClient.classification}
                    onValueChange={(v: "individual" | "corporate") =>
                      setNewClient({ ...newClient, classification: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="corporate">Business / Corporate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newClient.classification === "individual" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input
                        value={newClient.firstName}
                        onChange={(e) =>
                          setNewClient({ ...newClient, firstName: e.target.value })
                        }
                        placeholder="Jane"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input
                        value={newClient.lastName}
                        onChange={(e) =>
                          setNewClient({ ...newClient, lastName: e.target.value })
                        }
                        placeholder="Smith"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Business Name</Label>
                    <Input
                      value={newClient.businessName}
                      onChange={(e) =>
                        setNewClient({ ...newClient, businessName: e.target.value })
                      }
                      placeholder="Acme Holdings Ltd"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newClient.email}
                    onChange={(e) =>
                      setNewClient({ ...newClient, email: e.target.value })
                    }
                    placeholder="client@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    value={newClient.phone}
                    onChange={(e) =>
                      setNewClient({ ...newClient, phone: e.target.value })
                    }
                    placeholder="+1 234 567 8900"
                  />
                </div>

                <Button
                  className="w-full bg-gradient-to-r from-primary to-secondary"
                  onClick={handleCreate}
                  disabled={creating}
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Create & Send Onboarding Link
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : pending.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
            <h3 className="text-lg font-semibold">All caught up!</h3>
            <p className="text-sm text-muted-foreground">
              No pending onboarding reviews at the moment.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pending.map((client) => {
            const Icon = client.classification === "corporate" ? Building2 : UserIcon;
            return (
              <Card key={client._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 space-y-3 min-w-[260px]">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/15 to-secondary/15 flex items-center justify-center text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="text-lg font-semibold">{displayName(client)}</h3>
                        <Badge className={`border ${toneFor(client.status)}`}>
                          {prettyLabel(client.status)}
                        </Badge>
                        {client.kycStatus && (
                          <Badge className={`border ${toneFor(client.kycStatus)}`}>
                            KYC: {prettyLabel(client.kycStatus)}
                          </Badge>
                        )}
                        <Badge variant="outline" className="capitalize">
                          {prettyLabel(client.classification)}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground block text-xs">Email</span>
                          {client.email}
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-xs">Phone</span>
                          {client.phone || "—"}
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-xs">Country</span>
                          {client.country || "—"}
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-xs">
                            Submitted
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(client.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {client.documents && client.documents.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Submitted Documents</p>
                          <div className="flex flex-wrap gap-2">
                            {client.documents.map((doc, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 text-sm"
                              >
                                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{doc.name}</span>
                                {doc.status && (
                                  <Badge variant="outline" className="text-[10px]">
                                    {doc.status}
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      <Button
                        size="sm"
                        asChild
                        className="bg-gradient-to-r from-primary to-secondary"
                      >
                        <Link to={`/clients/${client._id}`}>
                          <Eye className="h-4 w-4 mr-2" /> Review & Verify
                        </Link>
                      </Button>
                      <p className="text-[11px] text-muted-foreground text-center max-w-[180px]">
                        Run AML / KYC checks before approving
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
