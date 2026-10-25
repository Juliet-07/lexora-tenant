import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CheckCircle2, MailX } from "lucide-react";
import {
  fetchUnsubscribeInfo,
  submitResubscribe,
  submitUnsubscribe,
} from "@/lib/crm/tools-api";

// ─────────────────────────────────────────────────────────────
// Public, unauthenticated page behind the "Unsubscribe" link at the
// bottom of every newsletter, alert and event invitation a tenant
// sends. The signed token identifies the recipient, so there is
// nothing to log in to or type: one click unsubscribes, and one click
// undoes it. Once unsubscribed, the tenant can no longer add the
// person to a newsletter segment.
// ─────────────────────────────────────────────────────────────

export default function UnsubscribePage() {
  const { token } = useParams<{ token: string }>();
  const isPreview = token === "preview";

  const {
    data: info,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["public-unsubscribe", token],
    queryFn: () => fetchUnsubscribeInfo(token as string),
    enabled: !!token && !isPreview,
    retry: false,
  });

  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  // null = follow the server; true/false = what the visitor just did.
  const [local, setLocal] = useState<boolean | null>(null);
  useEffect(() => setLocal(null), [token]);

  const failed = (err: any) =>
    setError(
      err?.response?.data?.message ?? "Something went wrong. Please try again.",
    );

  const unsubMut = useMutation({
    mutationFn: () =>
      submitUnsubscribe(token as string, reason.trim() || undefined),
    onSuccess: () => {
      setError(null);
      setLocal(true);
      refetch();
    },
    onError: failed,
  });
  const resubMut = useMutation({
    mutationFn: () => submitResubscribe(token as string),
    onSuccess: () => {
      setError(null);
      setLocal(false);
      refetch();
    },
    onError: failed,
  });

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-muted/30 py-10 px-4">
      <div className="max-w-md mx-auto space-y-4">{children}</div>
    </div>
  );

  if (isPreview) {
    return shell(
      <Card>
        <CardContent className="p-8 text-center space-y-3">
          <MailX className="h-8 w-8 text-primary mx-auto" />
          <h2 className="font-semibold">This is a preview</h2>
          <p className="text-sm text-muted-foreground">
            You're looking at the unsubscribe link from a preview or test email.
            In the emails your recipients get, this link is personal to them and
            lets them unsubscribe in one click.
          </p>
        </CardContent>
      </Card>,
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (isError || !info) {
    return shell(
      <Card>
        <CardContent className="p-8 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-warning mx-auto" />
          <h2 className="font-semibold">This link isn't valid</h2>
          <p className="text-sm text-muted-foreground">
            The unsubscribe link may be incomplete. Try opening it again from
            the original email.
          </p>
        </CardContent>
      </Card>,
    );
  }

  const unsubscribed = local ?? info.unsubscribed;

  if (unsubscribed) {
    return shell(
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
          <h2 className="text-lg font-semibold">You're unsubscribed</h2>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{info.email}</span>{" "}
            will no longer receive newsletters, alerts or event invitations from{" "}
            <span className="font-medium text-foreground">
              {info.businessName}
            </span>
            .
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <p className="text-xs text-muted-foreground">
            Unsubscribed by mistake?{" "}
            <button
              type="button"
              className="underline underline-offset-2 hover:text-foreground"
              disabled={resubMut.isPending}
              onClick={() => resubMut.mutate()}
            >
              Resubscribe
            </button>
          </p>
        </CardContent>
      </Card>,
    );
  }

  return shell(
    <Card>
      <CardContent className="p-6 space-y-5">
        <div className="text-center space-y-2">
          <MailX className="h-8 w-8 text-primary mx-auto" />
          <h1 className="text-xl font-semibold">Unsubscribe</h1>
          <p className="text-sm text-muted-foreground">
            Stop receiving newsletters, alerts and event invitations from{" "}
            <span className="font-medium text-foreground">
              {info.businessName}
            </span>{" "}
            at <span className="font-medium text-foreground">{info.email}</span>
            ?
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="unsub-reason">
            Mind telling us why?{" "}
            <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="unsub-reason"
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          className="w-full"
          disabled={unsubMut.isPending}
          onClick={() => {
            setError(null);
            unsubMut.mutate();
          }}
        >
          Unsubscribe me
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          You'll still receive messages that are part of an event you registered
          for.
        </p>
      </CardContent>
    </Card>,
  );
}
