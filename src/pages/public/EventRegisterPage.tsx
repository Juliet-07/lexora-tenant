import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  MapPin,
  Video,
  Clock,
  Users,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  fetchPublicEventByToken,
  fetchPublicEventByOpenToken,
  registerForEvent,
  registerViaOpenLink,
} from "@/lib/crm/events-api";

// ─────────────────────────────────────────────────────────────
// Public, unauthenticated registration page — reached via the
// personal invite link emailed to each external invitee when the
// tenant publishes an External event. Backed by the real API;
// submitting this form is itself the invitee's attendance record.
// ─────────────────────────────────────────────────────────────

// `open` = the event's shareable public link (/event-join/:token) —
// anyone can register, nothing is pre-filled. Otherwise it's an
// invitee's personal link (/event-register/:token).
export default function EventRegisterPage({
  open = false,
}: {
  open?: boolean;
}) {
  const { token } = useParams<{ token: string }>();

  const {
    data: view,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["public-event", open ? "open" : "personal", token],
    queryFn: () =>
      open
        ? fetchPublicEventByOpenToken(token as string)
        : fetchPublicEventByToken(token as string),
    enabled: !!token,
    retry: false,
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!view) return;
    setName(view.invite?.name ?? "");
    setEmail(view.invite?.email ?? "");
    setOrganisation(view.invite?.organisation ?? "");
    setPhone("");
    setNotes("");
    setError(null);
    setDone(view.invite?.status === "Registered");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, view?.invite?.status]);

  const registerMut = useMutation({
    mutationFn: () =>
      (open ? registerViaOpenLink : registerForEvent)(token as string, {
        name,
        email,
        organisation,
        phone,
        notes,
      }),
    onSuccess: () => setDone(true),
    onError: (err: any) =>
      setError(
        err?.response?.data?.message ??
          "Registration failed. Please try again.",
      ),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (isError || !view) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-3">
            <AlertTriangle className="h-8 w-8 text-warning mx-auto" />
            <h2 className="font-semibold">This link isn't valid</h2>
            <p className="text-sm text-muted-foreground">
              This event registration link may have expired or been withdrawn.
              Please contact the organiser for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const deadlinePassed =
    !!view.registrationDeadline &&
    view.registrationDeadline.slice(0, 10) <
      new Date().toISOString().slice(0, 10);
  const full = view.capacity > 0 && view.registeredCount >= view.capacity;
  const alreadyRegistered = view.invite.status === "Registered";
  const closed = view.status !== "Published" || deadlinePassed || full;

  const submit = () => {
    setError(null);
    if (!name.trim() || !email.trim()) {
      setError("Please provide your name and email address.");
      return;
    }
    registerMut.mutate();
  };

  return (
    <div className="min-h-screen bg-muted/30 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="text-center space-y-2">
          <CalendarDays className="h-8 w-8 text-primary mx-auto" />
          <Badge variant="secondary">{view.type}</Badge>
          <h1 className="text-2xl font-bold">{view.title}</h1>
          {view.host && (
            <p className="text-sm text-muted-foreground">
              Hosted by {view.host}
            </p>
          )}
        </div>

        <Card>
          <CardContent className="p-6 space-y-3">
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                {view.date.slice(0, 10)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {view.startTime} – {view.endTime}
              </span>
              <span className="inline-flex items-center gap-1.5">
                {view.virtual ? (
                  <Video className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                )}
                {view.virtual ? "Virtual" : view.location}
              </span>
              {view.capacity > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {view.registeredCount}/{view.capacity} registered
                </span>
              )}
            </div>
            {view.description && (
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {view.description}
              </p>
            )}
            {(view.agendaItems?.length || view.agenda) && (
              <div className="rounded-md border bg-muted/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Agenda
                </p>
                {view.agendaItems?.length ? (
                  <ul className="divide-y">
                    {view.agendaItems.map((r, i) => (
                      <li key={i} className="flex gap-4 py-1.5 text-sm">
                        {r.time && (
                          <span className="w-14 shrink-0 font-semibold text-primary">
                            {r.time}
                          </span>
                        )}
                        <span>{r.label}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm whitespace-pre-line">{view.agenda}</p>
                )}
              </div>
            )}
            {view.virtual && view.meetingLink && done && (
              <p className="text-sm break-all">
                <span className="text-muted-foreground">Meeting link: </span>
                <a
                  href={view.meetingLink}
                  className="underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {view.meetingLink}
                </a>
              </p>
            )}
          </CardContent>
        </Card>

        {done || alreadyRegistered ? (
          <Card>
            <CardContent className="p-8 text-center space-y-3">
              <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
              <h2 className="text-lg font-semibold">You're registered</h2>
              <p className="text-sm text-muted-foreground">
                Thank you{name ? `, ${name}` : ""}. Your place at{" "}
                <strong>{view.title}</strong> is confirmed.
              </p>
            </CardContent>
          </Card>
        ) : closed ? (
          <Card>
            <CardContent className="p-8 text-center space-y-3">
              <AlertTriangle className="h-8 w-8 text-warning mx-auto" />
              <h2 className="font-semibold">Registration is closed</h2>
              <p className="text-sm text-muted-foreground">
                {view.status !== "Published"
                  ? "This event is no longer accepting registrations."
                  : deadlinePassed
                    ? "The registration deadline for this event has passed."
                    : "This event has reached full capacity."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold">Register for this event</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="er-name">Full name *</Label>
                  <Input
                    id="er-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="er-email">Email *</Label>
                  <Input
                    id="er-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="er-org">Organisation</Label>
                  <Input
                    id="er-org"
                    value={organisation}
                    onChange={(e) => setOrganisation(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="er-phone">Phone</Label>
                  <Input
                    id="er-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="er-notes">
                  Dietary or accessibility requirements
                </Label>
                <Textarea
                  id="er-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                className="w-full"
                onClick={submit}
                disabled={registerMut.isPending}
              >
                Register
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
