import { useState } from "react";
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
  Send,
  Mail,
  Clock,
} from "lucide-react";
import { api } from "@/lib/api";
import { useModule } from "@/contexts/ModuleContext";
import { useToast } from "@/hooks/use-toast";
import {
  fetchMyTransactions,
  requestUpgrade,
  markPaymentClaimed,
} from "@/lib/tenant-payments-api";

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

const fmtAmount = (amount: number, currency: string) =>
  currency === "RWF"
    ? `RWF ${amount.toLocaleString()}`
    : `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────

export default function PlanTab() {
  const { subscription } = useModule();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("RWF");

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

  // ── Fetch this tenant's own transactions — the real, no-gateway
  // invoice flow reads its state entirely from here rather than a
  // gateway redirect. ──
  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ["tenant-my-transactions"],
    queryFn: fetchMyTransactions,
    staleTime: 15_000,
  });

  // The real, single open invoice, if any — the backend itself
  // never allows more than one at a time.
  const openInvoice = transactions.find(
    (t) => t.status === "awaiting_payment" || t.status === "payment_claimed",
  );

  const requestMutation = useMutation({
    mutationFn: (planKey: string) => requestUpgrade(planKey, selectedCurrency),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-my-transactions"] });
      toast({
        title: "Invoice sent",
        description:
          "Check your email for the invoice and payment instructions.",
      });
    },
    onError: (err: any) =>
      toast({
        title: "Could not request upgrade",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      }),
  });

  const markPaidMutation = useMutation({
    mutationFn: (transactionId: string) => markPaymentClaimed(transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-my-transactions"] });
      toast({
        title: "Thanks — we've noted your payment",
        description:
          "Your account will be activated once our finance team confirms receipt.",
      });
    },
    onError: (err: any) =>
      toast({
        title: "Could not update",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      }),
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

      {/* Open invoice — the real, no-gateway flow's live state */}
      {!txLoading && openInvoice && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Open Invoice — {openInvoice.invoiceNumber}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Plan</p>
                <p className="font-medium capitalize">{openInvoice.plan}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Amount</p>
                <p className="font-medium">
                  {fmtAmount(openInvoice.amount, openInvoice.currency)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <Badge
                  className={
                    openInvoice.status === "payment_claimed"
                      ? "bg-amber-100 text-amber-700 border-amber-200"
                      : "bg-blue-100 text-blue-700 border-blue-200"
                  }
                >
                  {openInvoice.status === "payment_claimed"
                    ? "Payment Claimed"
                    : "Awaiting Payment"}
                </Badge>
              </div>
            </div>

            {openInvoice.status === "awaiting_payment" ? (
              <>
                <div className="flex gap-2 rounded-lg bg-background border p-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-muted-foreground">
                    An invoice has been emailed to you. Once you've made
                    payment, email your Proof of Payment to{" "}
                    <strong className="text-foreground">
                      finance@lexoraafrica.com
                    </strong>
                    , quoting <strong>{openInvoice.invoiceNumber}</strong> as
                    your reference — then confirm below.
                  </p>
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-primary to-secondary"
                  onClick={() => markPaidMutation.mutate(openInvoice._id)}
                  disabled={markPaidMutation.isPending}
                >
                  {markPaidMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />{" "}
                      Updating…
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" /> I've Made Payment
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2 rounded-lg bg-background border p-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                <p className="text-muted-foreground">
                  Thanks — we've noted that you've made payment. Your account
                  will be activated once our finance team confirms receipt of
                  your Proof of Payment.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Currency selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-semibold">Available plans</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Choose the plan that fits your business. We'll send you an invoice
            by email with payment instructions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground">Currency</Label>
          <Select
            value={selectedCurrency}
            onValueChange={(v) => setSelectedCurrency(v as Currency)}
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
            const isRequestingThis =
              requestMutation.isPending &&
              requestMutation.variables === plan.plan;

            const price =
              selectedCurrency === "RWF" && plan.priceMonthly
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
                    : isFree
                      ? "opacity-60"
                      : "hover:border-primary/40"
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
                          {selectedCurrency === "RWF"
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
                    disabled={
                      isCurrent ||
                      isFree ||
                      !!openInvoice ||
                      requestMutation.isPending
                    }
                    onClick={() => {
                      if (isCurrent || isFree || openInvoice) return;
                      requestMutation.mutate(plan.plan);
                    }}
                  >
                    {isCurrent ? (
                      "Current plan"
                    ) : isFree ? (
                      "Contact your administrator"
                    ) : isRequestingThis ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending invoice…
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5 mr-2" /> Request Upgrade
                      </>
                    )}
                  </Button>

                  {!isCurrent && !isFree && !openInvoice && (
                    <p className="text-[10px] text-muted-foreground text-center">
                      We'll email you an invoice with payment instructions.
                    </p>
                  )}
                  {!isCurrent && !isFree && openInvoice && (
                    <p className="text-[10px] text-muted-foreground text-center">
                      Resolve your open invoice above before requesting another
                      upgrade.
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
