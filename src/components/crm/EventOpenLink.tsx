import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Copy, Globe, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getEventOpenLink,
  setEventOpenRegistration,
  type CrmEvent,
} from "@/lib/crm/events-api";

// ─────────────────────────────────────────────────────────────
// The shareable registration link of an External event — for people
// who aren't CRM contacts yet. Anyone who opens it can register, and
// they land on the invitee list (and in the CRM contacts) as soon as
// they do. The tenant can switch it off, or replace it if it leaks.
// ─────────────────────────────────────────────────────────────

export function EventOpenLink({ event }: { event: CrmEvent }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [confirmRotate, setConfirmRotate] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["crm-events"] });
  const onErr = (title: string) => (err: any) =>
    toast({
      title,
      description: err?.response?.data?.message,
      variant: "destructive",
    });

  const createMut = useMutation({
    mutationFn: () => getEventOpenLink(event._id),
    onSuccess: refresh,
    onError: onErr("Couldn't create the link"),
  });
  const toggleMut = useMutation({
    mutationFn: (enabled: boolean) =>
      setEventOpenRegistration(event._id, { enabled }),
    onSuccess: refresh,
    onError: onErr("Couldn't update the link"),
  });
  const rotateMut = useMutation({
    mutationFn: () => setEventOpenRegistration(event._id, { regenerate: true }),
    onSuccess: () => {
      refresh();
      setConfirmRotate(false);
      toast({
        title: "New link created",
        description: "The previous link no longer works.",
      });
    },
    onError: onErr("Couldn't replace the link"),
  });

  if (event.mode !== "External") return null;
  if (event.status === "Completed" || event.status === "Cancelled") return null;

  const token = event.openRegistration?.token ?? null;
  const enabled = !!event.openRegistration?.enabled;
  const url = token ? `${window.location.origin}/event-join/${token}` : "";

  const copy = () =>
    navigator.clipboard
      .writeText(url)
      .then(() => toast({ title: "Registration link copied" }))
      .catch(() =>
        toast({ title: "Couldn't copy the link", variant: "destructive" }),
      );

  const registrants = event.invites.filter(
    (i) => i.source === "OpenLink",
  ).length;

  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Globe className="h-4 w-4 text-primary" />
          Public registration link
        </div>
        {token && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            {enabled ? "On" : "Off"}
            <Switch
              checked={enabled}
              disabled={toggleMut.isPending}
              onCheckedChange={(v) => toggleMut.mutate(v)}
            />
          </label>
        )}
      </div>

      {!token ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Create one link you can send to anyone — they register themselves
            and appear on this list.
          </p>
          <Button
            size="sm"
            onClick={() => createMut.mutate()}
            disabled={createMut.isPending}
          >
            {createMut.isPending && (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            )}
            Create link
          </Button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <Input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className={enabled ? "" : "opacity-60"}
            />
            <Button size="sm" onClick={copy} disabled={!enabled}>
              <Copy className="mr-1 h-3.5 w-3.5" /> Copy
            </Button>
            <Button
              size="icon"
              variant="outline"
              title="Replace with a new link"
              onClick={() => setConfirmRotate(true)}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {!enabled
              ? "The link is switched off — anyone opening it is told it isn't valid."
              : event.status === "Draft"
                ? "People can register once you publish the event."
                : "Anyone with this link can register. They're added to the list below and to your CRM contacts, and get a confirmation email."}
            {registrants > 0 &&
              ` ${registrants} ${registrants === 1 ? "person has" : "people have"} registered this way.`}
          </p>
        </>
      )}

      <AlertDialog open={confirmRotate} onOpenChange={setConfirmRotate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace the registration link?</AlertDialogTitle>
            <AlertDialogDescription>
              The current link will stop working immediately — anyone you've
              already sent it to will need the new one. People who have already
              registered stay registered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep current link</AlertDialogCancel>
            <AlertDialogAction onClick={() => rotateMut.mutate()}>
              Replace link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
