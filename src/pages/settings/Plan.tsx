import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Crown,
  Check,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { api } from "@/lib/api";
import { useModule } from "@/contexts/ModuleContext";
import { useToast } from "@/hooks/use-toast";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

interface ApiPlan {
  _id: string;
  plan: string;
  name?: string;
  displayName?: string;
  description?: string;
  priceMonthly?: number;
  priceAnnual?: number;
  features?: string[];
  maxClients?: number;
  maxUsers?: number;
  includedModules?: string[];
  isActive: boolean;
}

type Currency = "USD" | "RWF";

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────

export default function PlanTab() {
  const { subscription, refetchDashboard } = useModule();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selected, setSelected] = useState<string | null>(null);
  const [currency, setCurrency] = useState<Currency>("RWF");
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // ── Check for payment return from DPO ──────────────────────
  // DPO redirects back to ?payment=success&txn=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      setPaymentSuccess(true);
      // Clean up URL without reloading
      window.history.replaceState({}, document.title, window.location.pathname);
      // Refresh subscription data after a short delay
      // (DPO callback may still be processing)
      setTimeout(() => {
        refetchDashboard();
        queryClient.invalidateQueries({ queryKey: ["tenant-available-plans"] });
      }, 2000);
    }
  }, []);

  // ── Fetch plans ───────────────────────────────────────────
  const {
    data: plans = [],
    isLoading: plansLoading,
    error: plansError,
  } = useQuery({
    queryKey: ["tenant-available-plans"],
    queryFn: async (): Promise<ApiPlan[]> => {
      const res = await api.get("/tenant/plans");
      const d = res.data?.data ?? res.data;
      return Array.isArray(d) ? d : [];
    },
    staleTime: 5 * 60_000,
  });

  // ── Upgrade mutation — initiates DPO payment ──────────────
  // Returns { checkoutUrl, transactionId }
  // We redirect the tenant to checkoutUrl (DPO hosted page)
  const upgradeMutation = useMutation({
    mutationFn: async (planKey: string) => {
      const res = await api.post("/tenant/payments/initiate-upgrade", {
        plan: planKey,
        currency,
      });
      return res.data?.data ?? res.data;
    },
    onSuccess: (data) => {
      if (data?.checkoutUrl) {
        // Redirect to DPO hosted payment page
        // DPO will redirect back to TENANT_APP_URL/settings/billing?payment=success
        window.location.href = data.checkoutUrl;
      } else {
        toast({
          title: "Payment initiation failed",
          description: "No checkout URL returned. Please try again.",
          variant: "destructive",
        });
        setSelected(null);
      }
    },
    onError: (err: any) => {
      toast({
        title: "Could not initiate payment",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      });
      setSelected(null);
    },
  });

  const currentPlan = subscription?.plan?.toLowerCase();
  const isExpired =
    subscription?.status === "cancelled" || subscription?.status === "expired";
  const isTrial = subscription?.status === "trial";
  const trialEnds = subscription?.trialEndsAt
    ? new Date(subscription.trialEndsAt)
    : null;
  const daysLeft = trialEnds
    ? Math.ceil((trialEnds.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Payment success banner — shown after DPO redirect */}
      {paymentSuccess && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-success/5 border border-success/30">
          <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-success">
              Payment received — your plan is being activated
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              This usually takes a few seconds. Your subscription will update
              automatically. If it doesn't refresh within a minute, reload the
              page.
            </p>
          </div>
        </div>
      )}

      {/* Current subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current subscription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Plan</p>
              <p className="text-lg font-semibold capitalize">
                {subscription?.plan ?? "Free"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge
                className={
                  isExpired
                    ? "bg-destructive/10 text-destructive border-destructive/20"
                    : isTrial
                      ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                      : "bg-green-100 text-green-700 border-green-200"
                }
              >
                {subscription?.status ?? "—"}
              </Badge>
            </div>
            {subscription?.currentPeriodEnd && (
              <div>
                <p className="text-sm text-muted-foreground">
                  {isTrial ? "Trial ends" : "Renews"}
                </p>
                <p className="text-sm font-medium">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {/* Trial warning */}
          {isTrial && daysLeft !== null && daysLeft <= 7 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm">
              <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />
              <span className="text-yellow-700 font-medium">
                {daysLeft <= 0
                  ? "Your trial has expired. Upgrade to continue using the platform."
                  : `Your trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Upgrade to avoid interruption.`}
              </span>
            </div>
          )}

          {/* Expired banner */}
          {isExpired && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-sm">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              <span className="text-destructive font-medium">
                Your subscription has expired. Select a plan below to reactivate
                your account.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Currency selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-semibold">Available plans</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Choose the plan that fits your business. You will be redirected to
            complete payment securely.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground">Currency</Label>
          <Select
            value={currency}
            onValueChange={(v) => setCurrency(v as Currency)}
          >
            <SelectTrigger className="w-24 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RWF">RWF</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Plans grid */}
      {plansLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-lg" />
          ))}
        </div>
      ) : plansError ? (
        <Card>
          <CardContent className="py-10 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Could not load plans. Please try again later.
            </p>
          </CardContent>
        </Card>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No plans available at the moment. Contact your administrator.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.plan.toLowerCase();
            const isFree = plan.plan.toLowerCase() === "free";
            const isSelected = selected === plan.plan;
            const isPending = upgradeMutation.isPending && isSelected;

            // Show price in selected currency
            const price =
              currency === "RWF" && plan.priceMonthly
                ? Math.round(
                    plan.priceMonthly *
                      (Number(import.meta.env.VITE_USD_TO_RWF_RATE) || 1350),
                  )
                : plan.priceMonthly;

            return (
              <Card
                key={plan._id}
                className={`relative transition-all ${
                  isCurrent
                    ? "border-primary ring-1 ring-primary shadow-md"
                    : isSelected
                      ? "ring-2 ring-primary/50"
                      : isFree
                        ? "opacity-60"
                        : "hover:border-primary/40 cursor-pointer"
                }`}
              >
                {isCurrent && (
                  <Badge className="absolute -top-2.5 left-4 bg-gradient-to-r from-primary to-secondary text-xs">
                    Current plan
                  </Badge>
                )}

                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Crown className="h-4 w-4 text-secondary" />
                    {plan.displayName || plan.name || plan.plan}
                  </CardTitle>
                  {plan.description && (
                    <CardDescription>{plan.description}</CardDescription>
                  )}
                  <div className="pt-2">
                    {isFree ? (
                      <span className="text-2xl font-bold">Free trial</span>
                    ) : price !== undefined ? (
                      <>
                        <span className="text-2xl font-bold">
                          {currency === "RWF"
                            ? `RWF ${price?.toLocaleString()}`
                            : `$${price}`}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          /month
                        </span>
                      </>
                    ) : (
                      <span className="text-2xl font-bold">Custom</span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Limits */}
                  <div className="text-xs text-muted-foreground space-y-1">
                    {plan.maxClients !== undefined && (
                      <p>
                        Up to{" "}
                        {plan.maxClients === 999999
                          ? "unlimited"
                          : plan.maxClients}{" "}
                        clients
                      </p>
                    )}
                    {plan.maxUsers !== undefined && (
                      <p>
                        Up to{" "}
                        {plan.maxUsers === 999999 ? "unlimited" : plan.maxUsers}{" "}
                        team members
                      </p>
                    )}
                    {plan.includedModules &&
                      plan.includedModules.length > 0 && (
                        <p>
                          {plan.includedModules.length} module
                          {plan.includedModules.length > 1 ? "s" : ""} included
                        </p>
                      )}
                  </div>

                  {/* Features */}
                  {plan.features && plan.features.length > 0 && (
                    <ul className="space-y-2 text-sm">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}

                  <Button
                    className={`w-full ${
                      !isCurrent && !isFree
                        ? "bg-gradient-to-r from-primary to-secondary"
                        : ""
                    }`}
                    variant={isCurrent || isFree ? "outline" : "default"}
                    disabled={isCurrent || isFree || upgradeMutation.isPending}
                    onClick={() => {
                      if (isCurrent || isFree) return;
                      setSelected(plan.plan);
                      upgradeMutation.mutate(plan.plan);
                    }}
                  >
                    {isCurrent ? (
                      "Current plan"
                    ) : isFree ? (
                      "Contact your administrator"
                    ) : isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Redirecting to payment…
                      </>
                    ) : (
                      <>
                        <ExternalLink className="h-3.5 w-3.5 mr-2" />
                        Upgrade — Pay securely
                      </>
                    )}
                  </Button>

                  {/* Payment note — only for non-free non-current plans */}
                  {!isCurrent && !isFree && (
                    <p className="text-[10px] text-muted-foreground text-center">
                      You will be redirected to a secure payment page.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Need a custom arrangement? Contact your account manager.
      </p>
    </div>
  );
}
