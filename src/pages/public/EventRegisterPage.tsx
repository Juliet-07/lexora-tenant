import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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
  findEventByInviteToken,
  registerForEvent,
  useEventsStore,
  activeRegistrations,
} from "@/lib/crm/eventsStore";

// ─────────────────────────────────────────────────────────────
// Public, unauthenticated registration page — reached via the
// invite link sent from CRM → Tools → Events, or via the event's
// open registration link. Prototype: reads/writes the same
// localStorage store as the admin page, so it only works in the
// same browser until the API supports events.
// ─────────────────────────────────────────────────────────────

export default function EventRegisterPage() {
  const { token } = useParams<{ token: string }>();
  // Subscribing to the store keeps the page fresh after registering.
  useEventsStore();

  const found = token ? findEventByInviteToken(token) : null;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const invite = found?.invite;
  useEffect(() => {
    setName(invite?.name ?? "");
    setEmail(invite?.email ?? "");
    setOrganisation(invite?.organisation ?? "");
    setPhone("");
    setNotes("");
    setError(null);
    setDone(false);
  }, [token, invite?.id]);

  if (!found) {
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

  const { event } = found;

  const deadlinePassed =
    !!event.registrationDeadline &&
    event.registrationDeadline < new Date().toISOString().slice(0, 10);
  const full =
    event.capacity > 0 && activeRegistrations(event).length >= event.capacity;
  const closed = event.status !== "Published" || deadlinePassed || full;

  const submit = () => {
    setError(null);
    if (!name.trim() || !email.trim()) {
      setError("Please provide your name and email address.");
      return;
    }
    const res = registerForEvent(event.id, { name, email, organisation, phone, notes });
    if (!res.ok) {
      setError(res.reason ?? "Registration failed.");
      return;
    }
    setDone(true);
  };

  return (
    <div className="min-h-screen bg-muted/30 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <p className="text-xs text-muted-foreground text-center">
          Event preview: registrations are saved only in this browser, not sent to the organiser. No confirmation email is sent.
        </p>
        <div className="text-center space-y-2">
          <CalendarDays className="h-8 w-8 text-primary mx-auto" />
          <Badge variant="secondary">{event.type}</Badge>
          <h1 className="text-2xl font-bold">{event.title}</h1>
          <p className="text-sm text-muted-foreground">Hosted by {event.host}</p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-3">
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                {event.date}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {event.startTime} – {event.endTime}
              </span>
              <span className="inline-flex items-center gap-1.5">
                {event.virtual ? (
                  <Video className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                )}
                {event.location}
              </span>
              {event.capacity > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {activeRegistrations(event).length}/{event.capacity} registered
                </span>
              )}
            </div>
            {event.description && (
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {event.description}
              </p>
            )}
            {event.agenda && (
              <div className="rounded-md border bg-muted/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Agenda
                </p>
                <p className="text-sm whitespace-pre-line">{event.agenda}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {done ? (
          <Card>
            <CardContent className="p-8 text-center space-y-3">
              <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
              <h2 className="text-lg font-semibold">You're registered</h2>
              <p className="text-sm text-muted-foreground">
                Thank you, {name}. Your place at <strong>{event.title}</strong> is
                saved in this browser for this event preview.
              </p>
            </CardContent>
          </Card>
        ) : closed ? (
          <Card>
            <CardContent className="p-8 text-center space-y-3">
              <AlertTriangle className="h-8 w-8 text-warning mx-auto" />
              <h2 className="font-semibold">Registration is closed</h2>
              <p className="text-sm text-muted-foreground">
                {event.status !== "Published"
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
                  <Input id="er-name" value={name} onChange={(e) => setName(e.target.value)} />
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
                  <Input id="er-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="er-notes">Dietary or accessibility requirements</Label>
                <Textarea
                  id="er-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button className="w-full" onClick={submit}>
                Register
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                This preview does not reserve a place with the organiser.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
