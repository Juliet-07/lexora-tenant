import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { Loader2, Crown, Check, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { useModule } from "@/contexts/ModuleContext";
import { useToast } from "@/hooks/use-toast";

// ─────────────────────────────────────────────────────────────
// TYPE
// ─────────────────────────────────────────────────────────────

interface ApiPlan {
  _id: string;
  plan: string;
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

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────

export default function PlanTab() {
  const { subscription, refetchDashboard } = useModule();
  const { toast } = useToast();
  const [selected, setSelected] = useState<string | null>(null);

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

  const upgradeMutation = useMutation({
    mutationFn: async (planId: string) => {
      const res = await api.post("/tenant/upgrade-plan", { plan: planId });
      return res.data;
    },
    onSuccess: (data) => {
      toast({
        title: "Plan upgraded",
        description: data?.message ?? "Your plan has been updated.",
      });
      setSelected(null);
      refetchDashboard();
    },
    onError: (err: any) =>
      toast({
        title: "Upgrade failed",
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
                      ? "bg-warning/10 text-warning border-warning/20"
                      : "bg-success/10 text-success border-success/20"
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
            <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/5 border border-warning/30 text-sm">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
              <span className="text-warning font-medium">
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

          {/* Active modules */}
          {/* {subscription?.activeModules?.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Active modules
              </p>
              <div className="flex flex-wrap gap-1.5">
                {subscription.activeModules.map((m: string) => (
                  <Badge
                    key={m}
                    variant="outline"
                    className="text-xs capitalize"
                  >
                    {m.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            </div>
          )} */}
        </CardContent>
      </Card>

      <Separator />

      {/* Available plans */}
      <div>
        <h3 className="text-base font-semibold mb-1">Available plans</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Choose the plan that fits your business.
        </p>

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
              const isSelected = selected === plan.plan;
              const isPending = upgradeMutation.isPending && isSelected;

              return (
                <Card
                  key={plan._id}
                  className={`relative transition-all ${
                    isCurrent
                      ? "border-primary ring-1 ring-primary shadow-md"
                      : isSelected
                        ? "ring-2 ring-primary/50"
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
                      {plan.displayName || plan.plan}
                    </CardTitle>
                    {plan.description && (
                      <CardDescription>{plan.description}</CardDescription>
                    )}
                    <div className="pt-2">
                      {plan.priceMonthly !== undefined ? (
                        <>
                          <span className="text-2xl font-bold">
                            ${plan.priceMonthly}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            /month
                          </span>
                          {plan.priceAnnual && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              ${plan.priceAnnual}/year (save{" "}
                              {Math.round(
                                ((plan.priceMonthly * 12 - plan.priceAnnual) /
                                  (plan.priceMonthly * 12)) *
                                  100,
                              )}
                              %)
                            </p>
                          )}
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
                          {plan.maxUsers === 999999
                            ? "unlimited"
                            : plan.maxUsers}{" "}
                          team members
                        </p>
                      )}
                      {plan.includedModules &&
                        plan.includedModules.length > 0 && (
                          <p>
                            {plan.includedModules.length} module
                            {plan.includedModules.length > 1 ? "s" : ""}{" "}
                            included
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
                      className={`w-full ${!isCurrent ? "bg-gradient-to-r from-primary to-secondary" : ""}`}
                      variant={isCurrent ? "outline" : "default"}
                      disabled={isCurrent || upgradeMutation.isPending}
                      onClick={() => {
                        setSelected(plan.plan);
                        upgradeMutation.mutate(plan.plan);
                      }}
                    >
                      {isCurrent ? (
                        "Current plan"
                      ) : isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />{" "}
                          Upgrading…
                        </>
                      ) : (
                        "Upgrade to this plan"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Need a custom arrangement? Contact your account manager.
      </p>
    </div>
  );
}
