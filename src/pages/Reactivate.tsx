import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  AlertTriangle,
  Send,
  Mail,
  CheckCircle2,
  Crown,
  Check,
} from "lucide-react";
import {
  fetchReactivationInfo,
  requestReactivationUpgrade,
  markReactivationPaid,
  resendReactivationLink,
  type ReactivationPlan,
} from "@/lib/reactivation-api";

const fmtAmount = (amount: number, currency: string) =>
  currency === "RWF"
    ? `RWF ${amount.toLocaleString()}`
    : `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

function Logo() {
  return (
    <div className="text-center space-y-2 mb-2">
      <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
        <span className="text-white font-bold text-2xl">L</span>
      </div>
      <p className="text-sm font-semibold text-muted-foreground">Lexora</p>
    </div>
  );
}

export default function Reactivate() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const queryClient = useQueryClient();

  const [currency, setCurrency] = useState<"USD" | "RWF">("RWF");
  const [resendEmail, setResendEmail] = useState("");
  const [resendSent, setResendSent] = useState(false);

  const {
    data: info,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["reactivation-info", token],
    queryFn: () => fetchReactivationInfo(token),
    enabled: !!token,
    retry: false,
  });

  const requestMutation = useMutation({
    mutationFn: (plan: string) =>
      requestReactivationUpgrade(token, plan, currency),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reactivation-info", token] });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: (transactionId: string) =>
      markReactivationPaid(token, transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reactivation-info", token] });
    },
  });

  const resendMutation = useMutation({
    mutationFn: () => resendReactivationLink(resendEmail),
    onSuccess: () => setResendSent(true),
  });

  // ── No token, or token invalid/expired — offer to resend ──
  if (!token || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4 font-inter">
        <div className="w-full max-w-md space-y-6">
          <Logo />
          <Card className="shadow-xl border-0">
            <CardHeader>
              <CardTitle className="text-xl text-center">
                {resendSent ? "Check your email" : "Reactivation link expired"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {resendSent ? (
                <div className="text-center space-y-3">
                  <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    If that email is registered and locked out, a fresh
                    reactivation link has been sent.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    This link is invalid or has expired. Enter your account
                    email and we'll send you a fresh one.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full bg-gradient-to-r from-violet-600 to-purple-600"
                    onClick={() => resendMutation.mutate()}
                    disabled={!resendEmail || resendMutation.isPending}
                  >
                    {resendMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Send Reactivation Link"
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading || !info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 font-inter">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { openInvoice } = info;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-10 px-4 font-inter">
      <div className="max-w-3xl mx-auto space-y-6">
        <Logo />

        <Card className="border-warning/30 bg-warning/5 shadow-lg">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                {info.businessName}'s subscription has expired
              </p>
              <p className="text-sm text-muted-foreground">
                Your account is locked until your subscription is renewed.
                Select a plan below to reactivate.
              </p>
            </div>
          </CardContent>
        </Card>

        {openInvoice ? (
          <Card className="border-primary/30 bg-primary/5 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
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
                    className="w-full bg-gradient-to-r from-violet-600 to-purple-600"
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
                    will be reactivated once our finance team confirms receipt
                    of your Proof of Payment.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-end gap-2">
              <Label className="text-sm text-muted-foreground">Currency</Label>
              <select
                className="h-9 rounded-md border px-3 text-sm bg-background"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as "USD" | "RWF")}
              >
                <option value="RWF">RWF</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {info.availablePlans
                .filter((p) => p.plan.toLowerCase() !== "free")
                .map((plan: ReactivationPlan) => {
                  const price =
                    currency === "RWF" && plan.priceMonthly
                      ? Math.round(plan.priceMonthly * 1350)
                      : plan.priceMonthly;
                  const isRequestingThis =
                    requestMutation.isPending &&
                    requestMutation.variables === plan.plan;
                  return (
                    <Card key={plan.plan} className="shadow-lg">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Crown className="h-4 w-4 text-secondary" />
                          {plan.displayName || plan.plan}
                        </CardTitle>
                        <div className="pt-1">
                          {price !== undefined ? (
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
                        {plan.features && plan.features.length > 0 && (
                          <ul className="space-y-2 text-sm">
                            {plan.features.slice(0, 4).map((f) => (
                              <li key={f} className="flex items-start gap-2">
                                <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                                {f}
                              </li>
                            ))}
                          </ul>
                        )}
                        <Button
                          className="w-full bg-gradient-to-r from-violet-600 to-purple-600"
                          disabled={requestMutation.isPending}
                          onClick={() => requestMutation.mutate(plan.plan)}
                        >
                          {isRequestingThis ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Sending…
                            </>
                          ) : (
                            <>
                              <Send className="h-3.5 w-3.5 mr-2" /> Reactivate
                              with this plan
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Need help? Contact support or email finance@lexoraafrica.com.
        </p>
      </div>
    </div>
  );
}
