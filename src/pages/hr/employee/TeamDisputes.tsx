import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  useDisputes,
  appendInvestigationNote,
  appendHearingNote,
  STAGE_LABEL,
  STAGE_TONE,
  SEVERITY_TONE,
  type Dispute,
} from "@/lib/disputesStore";
import { ShieldAlert } from "lucide-react";

export default function TeamDisputes() {
  const { user } = useAuth();
  const all = useDisputes();
  const [active, setActive] = useState<Dispute | null>(null);

  const me = user
    ? `${user.firstName} ${user.lastName}`.trim() || user.email
    : "Manager";

  // Manager sees cases where they were looped in as co-investigator, OR
  // where they filed the case themselves (visible in "My Disputes" too).
  const cases = useMemo(
    () =>
      all.filter(
        (d) =>
          d.managerLooped &&
          (d.loopedManagerName === me ||
            d.reporterManagerName === me ||
            // Fallback in dummy mode — every manager sees "Joel Kagabo" cases.
            d.loopedManagerName === "Joel Kagabo"),
      ),
    [all, me],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team Disputes</h1>
        <p className="text-sm text-muted-foreground">
          Cases involving your direct reports where HR has looped you in to
          co-investigate and support the hearing. HR remains the case owner.
        </p>
      </div>

      {cases.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No open cases assigned to you.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {cases.map((d) => (
            <Card
              key={d.id}
              className="hover:border-primary/40 transition-colors cursor-pointer"
              onClick={() => setActive(d)}
            >
              <CardContent className="p-4 flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{d.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.reporterName} → {d.againstName} · filed {d.filedOn}
                  </p>
                  <p className="text-sm mt-1 line-clamp-2">{d.description}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="outline" className={STAGE_TONE[d.stage]}>
                    {STAGE_LABEL[d.stage]}
                  </Badge>
                  <Badge variant="outline" className={SEVERITY_TONE[d.severity]}>
                    {d.severity}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TeamCaseSheet
        dispute={active}
        me={me}
        onClose={() => setActive(null)}
        onChange={setActive}
      />
    </div>
  );
}

function TeamCaseSheet({
  dispute,
  me,
  onClose,
  onChange,
}: {
  dispute: Dispute | null;
  me: string;
  onClose: () => void;
  onChange: (d: Dispute) => void;
}) {
  const [invNote, setInvNote] = useState("");
  const [hearNote, setHearNote] = useState("");

  if (!dispute) return null;
  const d = dispute;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Sheet open={!!dispute} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{d.title}</SheetTitle>
          <p className="text-xs text-muted-foreground">
            {d.id} · {d.type} · Reporter {d.reporterName} · Against{" "}
            {d.againstName}
          </p>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-1 text-sm">
              <p>
                <Badge variant="outline" className={STAGE_TONE[d.stage]}>
                  {STAGE_LABEL[d.stage]}
                </Badge>{" "}
                <Badge variant="outline" className={SEVERITY_TONE[d.severity]}>
                  {d.severity}
                </Badge>
              </p>
              <p className="text-sm pt-2">{d.description}</p>
              {d.outcomeSought && (
                <p className="text-xs text-muted-foreground">
                  Outcome sought: {d.outcomeSought}
                </p>
              )}
              <p className="text-xs pt-1 text-muted-foreground">
                <ShieldAlert className="h-3 w-3 inline mr-1" />
                You are looped in as the reporter's manager. HR retains
                ownership.
              </p>
            </CardContent>
          </Card>

          {/* Investigation contributions */}
          {(d.stage === "acknowledged" || d.stage === "investigation") && (
            <div className="space-y-2 border rounded-lg p-3">
              <p className="text-sm font-semibold">Add investigation finding</p>
              <Textarea
                rows={3}
                value={invNote}
                onChange={(e) => setInvNote(e.target.value)}
                placeholder="Interview notes, evidence observed, context…"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (!invNote.trim()) return;
                  const note = { by: me, role: "Manager", note: invNote, at: today };
                  appendInvestigationNote(d.id, note);
                  onChange({
                    ...d,
                    investigationNotes: [...d.investigationNotes, note],
                  });
                  setInvNote("");
                  toast.success("Finding shared with HR.");
                }}
              >
                Submit finding
              </Button>
            </div>
          )}

          {d.investigationNotes.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Investigation trail</p>
              <ul className="space-y-2 text-sm">
                {d.investigationNotes.map((n, i) => (
                  <li key={i} className="border rounded-md p-2">
                    <p className="text-xs text-muted-foreground">
                      {n.by} ({n.role}) · {n.at}
                    </p>
                    <p>{n.note}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Hearing contributions */}
          {d.stage === "hearing" && (
            <div className="space-y-2 border rounded-lg p-3">
              <p className="text-sm font-semibold">Hearing observations</p>
              {d.hearing?.scheduledAt && (
                <p className="text-xs text-muted-foreground">
                  Scheduled {d.hearing.scheduledAt} · {d.hearing.venue}
                </p>
              )}
              <Textarea
                rows={3}
                value={hearNote}
                onChange={(e) => setHearNote(e.target.value)}
                placeholder="Observation during hearing…"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (!hearNote.trim()) return;
                  const note = { by: me, role: "Manager", note: hearNote, at: today };
                  appendHearingNote(d.id, note);
                  const hearing = d.hearing ?? { notes: [] };
                  onChange({
                    ...d,
                    hearing: { ...hearing, notes: [...hearing.notes, note] },
                  });
                  setHearNote("");
                  toast.success("Note added to hearing.");
                }}
              >
                Add hearing note
              </Button>
            </div>
          )}

          {d.outcome && (
            <div className="border rounded-lg p-3 space-y-1">
              <p className="text-sm font-semibold">Outcome</p>
              <p className="text-xs text-muted-foreground">
                {d.outcome.by} · {d.outcome.at}
              </p>
              <p>
                <Badge variant="outline">{d.outcome.decision}</Badge>
              </p>
              <p className="text-sm">{d.outcome.rationale}</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
