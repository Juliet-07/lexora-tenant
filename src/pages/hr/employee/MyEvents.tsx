import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PartyPopper } from "lucide-react";
import {
  PortalEventCard,
  PortalEventDialog,
} from "@/components/PortalEventCard";
import { useToast } from "@/hooks/use-toast";
import { fetchMyEvents, acknowledgeMyEvent } from "@/lib/crm/events-api";

// Self-service list of in-house events this employee is invited to.
// There is no separate "check in" step — acknowledging here, from
// the employee's own dashboard, is itself the attendance record.

export default function MyEvents() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["my-events"],
    queryFn: fetchMyEvents,
  });

  const ackMut = useMutation({
    mutationFn: (id: string) => acknowledgeMyEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-events"] });
      toast({ title: "Attendance acknowledged" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to acknowledge",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const upcoming = events.filter((e) => e.status === "Published");
  const past = events.filter((e) => e.status === "Completed");

  if (isLoading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Loading your events…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Events</h1>
        <p className="text-sm text-muted-foreground">
          In-house events you're invited to — click one for the full details,
          and acknowledge your attendance right here.
        </p>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <PartyPopper className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              You have no event invitations at the moment.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Upcoming
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {upcoming.map((e) => (
                  <PortalEventCard
                    key={e._id}
                    e={e}
                    onOpen={() => setOpenId(e._id)}
                    onAcknowledge={() => ackMut.mutate(e._id)}
                    acknowledging={ackMut.isPending}
                  />
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Past
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {past.map((e) => (
                  <PortalEventCard
                    key={e._id}
                    e={e}
                    onOpen={() => setOpenId(e._id)}
                    onAcknowledge={() => ackMut.mutate(e._id)}
                    acknowledging={ackMut.isPending}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <PortalEventDialog
        e={events.find((x) => x._id === openId) ?? null}
        onClose={() => setOpenId(null)}
        onAcknowledge={(id) => ackMut.mutate(id)}
        acknowledging={ackMut.isPending}
      />
    </div>
  );
}
