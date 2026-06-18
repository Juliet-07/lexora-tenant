import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, FileUp, CheckCircle2, LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  fetchMyOnboardingStatus,
  completeMyOnboarding,
  type OnboardingDocument,
} from "@/lib/hr-api";
import { useAuth } from "@/contexts/AuthContext";

const ICON = { text: FileText, pdf: FileUp } as const;

export default function EmployeeOnboarding() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [signature, setSignature] = useState("");
  const [active, setActive] = useState<OnboardingDocument | null>(null);

  const { data: status, isLoading } = useQuery({
    queryKey: ["onboarding-status"],
    queryFn: fetchMyOnboardingStatus,
    staleTime: 0,
  });

  useMemo(() => {
    if (!active && status && (status as any).documents?.length > 0) {
      setActive((status as any).documents[0]);
    }
  }, [status, active]);

  const docs = (status as any)?.documents ?? [];

  const completeMutation = useMutation({
    mutationFn: completeMyOnboarding,
    onSuccess: () => {
      toast.success("Onboarding completed.");
      queryClient.invalidateQueries({ queryKey: ["onboarding-status"] });
      // Force a reload so the route guard re-evaluates against the real flag.
      window.location.href = "/";
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message ?? "Failed to submit onboarding",
      ),
  });

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading onboarding…</span>
        </div>
      </div>
    );
  }

  const fullName = `${user.firstName} ${user.lastName}`.trim();
  const allChecked = docs.length > 0 && docs.every((d) => checks[d._id]);
  const signatureValid =
    signature.trim().toLowerCase() === fullName.toLowerCase();

  const submit = () => {
    if (!allChecked) return toast.error("Agree to every document first.");
    if (!signatureValid)
      return toast.error("Type your full name exactly as it appears above.");

    completeMutation.mutate({
      signatureName: signature.trim(),
      acknowledgedDocumentIds: docs.map((d) => d._id),
    });
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
              <p className="font-medium">
                No onboarding documents have been configured yet.
              </p>
              <p className="text-sm text-muted-foreground">
                Contact your administrator, or try again shortly.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
            {/* Sidebar: list of documents */}
            <Card className="h-fit">
              <CardContent className="p-3 space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground px-2 py-1.5">
                  Documents ({docs.filter((d) => checks[d._id]).length}/
                  {docs.length})
                </p>
                {docs.map((d) => {
                  const Icon = ICON[d.type];
                  const isActive = active?._id === d._id;
                  const done = !!checks[d._id];
                  return (
                    <button
                      key={d._id}
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
                          {active.type}
                        </Badge>
                      </div>
                    </div>

                    <div className="border rounded-lg bg-background">
                      {active.type === "text" && (
                        <ScrollArea className="h-[400px] p-4">
                          <p className="whitespace-pre-wrap text-sm">
                            {active.content}
                          </p>
                        </ScrollArea>
                      )}
                      {active.type === "pdf" && active.fileUrl && (
                        <iframe
                          src={active.fileUrl}
                          className="w-full h-[500px] rounded-lg"
                          title={active.title}
                        />
                      )}
                    </div>

                    <label className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer">
                      <Checkbox
                        checked={!!checks[active._id]}
                        onCheckedChange={(v) =>
                          setChecks((c) => ({ ...c, [active._id]: !!v }))
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
                      {docs.filter((d) => checks[d._id]).length}/{docs.length}{" "}
                      documents agreed
                    </p>
                    <Button
                      onClick={submit}
                      disabled={
                        !allChecked ||
                        !signatureValid ||
                        completeMutation.isPending
                      }
                      className="bg-gradient-to-r from-primary to-secondary"
                    >
                      {completeMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />{" "}
                          Submitting…
                        </>
                      ) : (
                        "Submit & Continue"
                      )}
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
