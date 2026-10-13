import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Newspaper, CalendarClock, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchMyNewsletters, fetchMyNewsletter } from "@/lib/board-api";

const shortDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

// Deterministic, non-random cover color per newsletter so the grid
// doesn't repaint on every refetch — derived from the real _id.
const gradients = [
  "linear-gradient(135deg,#5b4bff,#3a2dcc)",
  "linear-gradient(135deg,#16a34a,#0f7130)",
  "linear-gradient(135deg,#dc2626,#a51e1e)",
  "linear-gradient(135deg,#7c3aed,#5b21b6)",
];
const gradientFor = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return gradients[h % gradients.length];
};

export default function Newsletters() {
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: newsletters = [], isLoading } = useQuery({
    queryKey: ["my-newsletters"],
    queryFn: fetchMyNewsletters,
  });

  // Fetching one real newsletter also marks it opened (server-side,
  // the first time this member actually views it) — see
  // CampaignService.getMyBoardPortalNewsletter on the backend.
  const { data: openNewsletter } = useQuery({
    queryKey: ["my-newsletter", openId],
    queryFn: () => fetchMyNewsletter(openId!),
    enabled: !!openId,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Newsletters &amp; Updates
        </h1>
        <p className="text-sm text-muted-foreground">
          Governance insights, regulatory updates, and company
          communications sent to you.
        </p>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}

      {!isLoading && !newsletters.length && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No newsletters have been sent to you yet.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {newsletters.map((nl) => (
          <Card
            key={nl._id}
            className="cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
            onClick={() => setOpenId(nl._id)}
          >
            <div
              className="flex h-24 items-center justify-center text-2xl text-white"
              style={{ background: gradientFor(nl._id) }}
            >
              <Newspaper className="h-7 w-7" />
            </div>
            <CardContent className="space-y-1 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold leading-snug">{nl.subject}</p>
                {!nl.opened && (
                  <Badge className="shrink-0 bg-primary/15 text-primary border-primary/30">
                    New
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {nl.type === "Event invite" ? "Event invite" : "Newsletter"}
              </p>
              <p className="text-[11px] text-muted-foreground/70">
                {shortDate(nl.sentAt)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="border-b pb-4 text-center">
              <p className="text-xl font-extrabold text-primary">
                {openNewsletter?.name || "Newsletter"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {shortDate(openNewsletter?.sentAt)}
              </p>
            </div>
            <DialogTitle className="sr-only">
              {openNewsletter?.subject}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[55vh] space-y-4 overflow-y-auto text-sm leading-relaxed">
            {openNewsletter?.event && (
              <div className="rounded-md border p-3 text-sm">
                <p className="font-medium">{openNewsletter.event.title}</p>
                <p className="mt-1 flex items-center gap-1 text-muted-foreground">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {openNewsletter.event.dateTime}
                </p>
                <p className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {openNewsletter.event.location}
                </p>
              </div>
            )}
            <div
              dangerouslySetInnerHTML={{
                __html:
                  openNewsletter?.body ||
                  "<p class='text-muted-foreground'>Loading…</p>",
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenId(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
