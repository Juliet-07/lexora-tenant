import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Link2, FileUp, CheckCircle2, LogOut } from "lucide-react";
import { toast } from "sonner";
import {
  getOnboardingDocs,
  saveSubmission,
  type OnboardingDoc,
} from "@/lib/onboardingStore";
import { useAuth } from "@/contexts/AuthContext";

const ICON = { text: FileText, link: Link2, pdf: FileUp } as const;

export default function EmployeeOnboarding() {
  const { user, logout } = useAuth();
  const docs = useMemo(
    () => getOnboardingDocs().filter((d) => d.active),
    [],
  );
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [signature, setSignature] = useState("");
  const [active, setActive] = useState<OnboardingDoc | null>(docs[0] ?? null);

  if (!user) return null;

  const fullName = `${user.firstName} ${user.lastName}`.trim();
  const allChecked = docs.length > 0 && docs.every((d) => checks[d.id]);
  const signatureValid =
    signature.trim().toLowerCase() === fullName.toLowerCase();

  const submit = () => {
    if (!allChecked) return toast.error("Agree to every document first.");
    if (!signatureValid)
      return toast.error("Type your full name exactly as it appears above.");
    saveSubmission(user.email, {
      signature: signature.trim(),
      submittedAt: new Date().toISOString(),
      docs: docs.map((d) => ({
        id: d.id,
        title: d.title,
        kind: d.kind,
        checked: true,
      })),
    });
    toast.success("Onboarding completed.");
    // Force a reload so route guard re-evaluates.
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-gradient-to-r from-primary to-secondary text-white px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Welcome, {user.firstName}</h1>
            <p className="text-sm text-white/80">
              Complete onboarding to access your workspace.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="bg-white/15 hover:bg-white/25 text-white border-white/20"
            onClick={logout}
          >
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {docs.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center space-y-3">
              <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
              <p className="font-medium">Nothing to onboard with right now.</p>
              <Button onClick={() => (window.location.href = "/")}>
                Continue
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
            {/* Sidebar: list of documents */}
            <Card className="h-fit">
              <CardContent className="p-3 space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground px-2 py-1.5">
                  Documents ({docs.filter((d) => checks[d.id]).length}/
                  {docs.length})
                </p>
                {docs.map((d) => {
                  const Icon = ICON[d.kind];
                  const isActive = active?.id === d.id;
                  const done = !!checks[d.id];
                  return (
                    <button
                      key={d.id}
                      onClick={() => setActive(d)}
                      className={`w-full text-left p-2 rounded-md flex items-center gap-2 text-sm transition ${
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate">{d.title}</span>
                      {done && (
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                      )}
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            {/* Main: viewer + signature */}
            <div className="space-y-4">
              {active && (
                <Card>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold">
                          {active.title}
                        </h2>
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase mt-1"
                        >
                          {active.kind}
                        </Badge>
                      </div>
                    </div>

                    <div className="border rounded-lg bg-background">
                      {active.kind === "text" && (
                        <ScrollArea className="h-[400px] p-4">
                          <p className="whitespace-pre-wrap text-sm">
                            {active.content}
                          </p>
                        </ScrollArea>
                      )}
                      {active.kind === "link" && (
                        <div className="p-4 space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Open the document in a new tab to review it:
                          </p>
                          <a
                            href={active.content}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline break-all text-sm"
                          >
                            {active.content}
                          </a>
                        </div>
                      )}
                      {active.kind === "pdf" && (
                        <iframe
                          src={active.content}
                          className="w-full h-[500px] rounded-lg"
                          title={active.title}
                        />
                      )}
                    </div>

                    <label className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer">
                      <Checkbox
                        checked={!!checks[active.id]}
                        onCheckedChange={(v) =>
                          setChecks((c) => ({ ...c, [active.id]: !!v }))
                        }
                        className="mt-0.5"
                      />
                      <span className="text-sm">
                        I have read and agree to{" "}
                        <span className="font-medium">{active.title}</span>.
                      </span>
                    </label>
                  </CardContent>
                </Card>
              )}

              {/* Signature block */}
              <Card>
                <CardContent className="p-5 space-y-3">
                  <div>
                    <h3 className="font-semibold">Electronic Signature</h3>
                    <p className="text-xs text-muted-foreground">
                      Type your full legal name to confirm all documents above.
                      It must match{" "}
                      <span className="font-medium">{fullName}</span>.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label>Full name</Label>
                    <Input
                      value={signature}
                      onChange={(e) => setSignature(e.target.value)}
                      placeholder={fullName}
                      className="font-serif italic text-lg"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-xs text-muted-foreground">
                      {docs.filter((d) => checks[d.id]).length}/{docs.length}{" "}
                      documents agreed
                    </p>
                    <Button
                      onClick={submit}
                      disabled={!allChecked || !signatureValid}
                      className="bg-gradient-to-r from-primary to-secondary"
                    >
                      Submit & Continue
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
