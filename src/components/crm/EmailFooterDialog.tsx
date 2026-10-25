import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MailX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  SOCIAL_LINK_FIELDS,
  fetchEmailFooter,
  fetchUnsubscribed,
  saveEmailFooter,
  type EmailFooterSettings,
} from "@/lib/crm/tools-api";

// ─────────────────────────────────────────────────────────────
// What sits at the bottom of every email the tenant sends from CRM →
// Tools — newsletters, alerts and event invitations: their social
// links and address, plus the "Unsubscribe" line. The second tab lists
// everyone who has used it; they can't be added to any newsletter
// segment and are skipped on every send.
// ─────────────────────────────────────────────────────────────

const EMPTY: EmailFooterSettings = {
  website: "",
  linkedin: "",
  x: "",
  facebook: "",
  instagram: "",
  youtube: "",
  address: "",
};

export const EMAIL_FOOTER_QUERY_KEY = ["crm-email-footer"];
export const UNSUBSCRIBED_QUERY_KEY = ["crm-unsubscribed"];

export function EmailFooterDialog({
  open,
  onOpenChange,
  initialTab = "links",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialTab?: "links" | "unsubscribed";
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<string>(initialTab);
  const [form, setForm] = useState<EmailFooterSettings>(EMPTY);

  const { data: saved, isLoading } = useQuery({
    queryKey: EMAIL_FOOTER_QUERY_KEY,
    queryFn: fetchEmailFooter,
    enabled: open,
  });
  const { data: unsubscribed = [], isLoading: loadingUnsub } = useQuery({
    queryKey: UNSUBSCRIBED_QUERY_KEY,
    queryFn: fetchUnsubscribed,
    enabled: open,
  });

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);
  useEffect(() => {
    if (saved) setForm({ ...EMPTY, ...saved });
  }, [saved]);

  const dirty =
    !!saved &&
    (Object.keys(EMPTY) as (keyof EmailFooterSettings)[]).some(
      (k) => (form[k] ?? "") !== (saved[k] ?? ""),
    );

  const saveMut = useMutation({
    mutationFn: () => saveEmailFooter(form),
    onSuccess: (data) => {
      qc.setQueryData(EMAIL_FOOTER_QUERY_KEY, data);
      toast({ title: "Footer saved" });
    },
    onError: (err: any) =>
      toast({
        title: "Couldn't save the footer",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Email footer &amp; unsubscribes</DialogTitle>
          <DialogDescription>
            Shown at the bottom of your newsletters, alerts and event
            invitations.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="links">Social links</TabsTrigger>
            <TabsTrigger value="unsubscribed">
              Unsubscribed
              {unsubscribed.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {unsubscribed.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="links" className="space-y-4 pt-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Add the links you want recipients to see. Leave a field empty
                  to leave it out. Every email also carries an unsubscribe link
                  — you don't need to add one.
                </p>
                <div className="grid gap-3">
                  {SOCIAL_LINK_FIELDS.map((f) => (
                    <div key={f.key} className="space-y-1">
                      <Label htmlFor={`ef-${f.key}`}>{f.label}</Label>
                      <Input
                        id={`ef-${f.key}`}
                        value={form[f.key]}
                        placeholder={f.placeholder}
                        onChange={(e) =>
                          setForm({ ...form, [f.key]: e.target.value })
                        }
                      />
                    </div>
                  ))}
                  <div className="space-y-1">
                    <Label htmlFor="ef-address">Postal address</Label>
                    <Input
                      id="ef-address"
                      value={form.address}
                      placeholder="1 Main Street, Kigali, Rwanda"
                      onChange={(e) =>
                        setForm({ ...form, address: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Shown under the links. Many mail providers expect a sender
                      address on marketing email.
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  New emails pick this up straight away. A newsletter you
                  already saved keeps the links it was saved with in the client
                  and board portals until you open and save it again.
                </p>
                <div className="flex justify-end">
                  <Button
                    disabled={!dirty || saveMut.isPending}
                    onClick={() => saveMut.mutate()}
                  >
                    {saveMut.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Save footer
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="unsubscribed" className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              People who clicked "Unsubscribe". They can't be added to a
              newsletter segment, are skipped on every send, and any segment
              that already included them no longer reaches them. Only they can
              undo it, from the link in their email.
            </p>
            {loadingUnsub ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : unsubscribed.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                <MailX className="h-6 w-6 mx-auto mb-2 opacity-60" />
                Nobody has unsubscribed.
              </div>
            ) : (
              <ul className="divide-y rounded-md border">
                {unsubscribed.map((u) => (
                  <li key={u._id} className="p-3 text-sm space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{u.name || u.email}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(u.unsubscribedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {u.name ? `${u.email} · ` : ""}
                      {u.role || "Not in your CRM"}
                    </div>
                    {u.reason && (
                      <div className="text-xs italic text-muted-foreground">
                        “{u.reason}”
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
