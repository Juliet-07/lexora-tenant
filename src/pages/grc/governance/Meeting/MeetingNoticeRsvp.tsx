import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, CheckCircle2, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  fetchNoticeRsvpSnapshot,
  submitPublicNoticeRsvp,
} from "@/lib/grc/governance-api";

export default function MeetingNoticeRsvpPage() {
  const { token } = useParams<{ token: string }>();

  const {
    data: snap,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["meeting-notice-rsvp", token],
    queryFn: () => fetchNoticeRsvpSnapshot(token!),
    enabled: !!token,
    retry: false,
  });

  const [name, setName] = useState("");
  const [submittedAs, setSubmittedAs] = useState<
    "Confirmed" | "Apologies" | null
  >(null);

  useEffect(() => {
    if (snap) setName(snap.prefillName);
  }, [snap]);

  const submitMut = useMutation({
    mutationFn: (rsvp: "Confirmed" | "Apologies") =>
      submitPublicNoticeRsvp(token!, { name: name.trim(), rsvp }),
    onSuccess: (_data, rsvp) => {
      setSubmittedAs(rsvp);
      toast({ title: "RSVP recorded" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to submit RSVP",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (isError || !snap) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center space-y-2">
            <div className="text-lg font-semibold">RSVP link invalid</div>
            <p className="text-sm text-muted-foreground">
              This link is no longer valid. Please contact the meeting organiser
              for a new one.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const effectiveRsvp = submittedAs ?? snap.currentRsvp;

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 via-background to-muted/30 py-8 px-4">
      <div className="max-w-xl mx-auto space-y-5">
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="bg-gradient-to-br from-primary via-primary to-secondary text-primary-foreground p-6 sm:p-8">
            <div className="text-xs uppercase tracking-widest opacity-90">
              Notice of meeting
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold leading-tight">
              {snap.title}
            </h1>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge className="bg-white/20 hover:bg-white/25 border-0 text-white gap-1">
                <CalendarClock className="h-3 w-3" />
                {new Date(snap.date).toLocaleString()}
              </Badge>
              <Badge className="bg-white/20 hover:bg-white/25 border-0 text-white gap-1">
                <MapPin className="h-3 w-3" />
                {snap.location}
              </Badge>
            </div>
            <div className="mt-3 text-sm opacity-90">
              <span className="opacity-75">Chair:</span> {snap.chair}
            </div>
          </div>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="font-semibold text-sm">Notice</div>
            <p className="text-sm whitespace-pre-wrap">{snap.noticeBody}</p>
            {snap.rsvpDeadline && (
              <p className="text-xs text-amber-700">
                Please RSVP by{" "}
                {new Date(snap.rsvpDeadline).toLocaleDateString()}.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="font-semibold text-sm">Your RSVP</div>
            <div>
              <Label>Full name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            {effectiveRsvp !== "Pending" ? (
              <div className="flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                You have RSVP'd:{" "}
                <span className="font-medium">{effectiveRsvp}</span>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  disabled={!name.trim() || submitMut.isPending}
                  onClick={() => submitMut.mutate("Confirmed")}
                >
                  I will attend
                </Button>
                <Button
                  className="flex-1"
                  variant="outline"
                  disabled={!name.trim() || submitMut.isPending}
                  onClick={() => submitMut.mutate("Apologies")}
                >
                  Apologies — can't attend
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
