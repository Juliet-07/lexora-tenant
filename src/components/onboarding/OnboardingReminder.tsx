import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Sparkles } from "lucide-react";
import { fetchMyOnboardingStatus } from "@/lib/hr-api";
import { useAuth } from "@/contexts/AuthContext";

const SESSION_DISMISS_KEY = "onboarding-reminder-dismissed";
const PROGRESS_STORE_KEY = "onboarding-progress-pct";

/** Read locally-persisted onboarding progress written by the wizard. */
export function readOnboardingProgress(): number {
  try {
    const raw = localStorage.getItem(PROGRESS_STORE_KEY);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
  } catch {
    return 0;
  }
}

export function writeOnboardingProgress(pct: number) {
  try {
    localStorage.setItem(PROGRESS_STORE_KEY, String(pct));
    window.dispatchEvent(new Event("onboarding-progress-change"));
  } catch {
    /* noop */
  }
}

/** Hook returning the current employee onboarding state. */
export function useOnboardingState() {
  const { user, isAdmin } = useAuth();
  const { data } = useQuery({
    queryKey: ["onboarding-status"],
    queryFn: fetchMyOnboardingStatus,
    enabled: !!user && !isAdmin,
    staleTime: 60_000,
  });

  const [localPct, setLocalPct] = useState(readOnboardingProgress());
  useEffect(() => {
    const handler = () => setLocalPct(readOnboardingProgress());
    window.addEventListener("onboarding-progress-change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("onboarding-progress-change", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const completed = !!(data as any)?.completed;
  const pct = completed ? 100 : localPct;
  const enabled = !!user && !isAdmin && data !== undefined;

  return { enabled, completed, pct };
}

/**
 * Renders:
 *  - a welcome popup nudging incomplete employees to /onboarding (dismissable per session)
 *  - nothing else; the header progress pill is a sibling component
 */
export function OnboardingReminder() {
  const { enabled, completed } = useOnboardingState();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled || completed) return;
    if (location.pathname.startsWith("/onboarding")) return;
    const dismissed = sessionStorage.getItem(SESSION_DISMISS_KEY) === "1";
    if (dismissed) return;
    // small delay so the dashboard renders first
    const t = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(t);
  }, [enabled, completed, location.pathname]);

  const dismiss = () => {
    sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
    setOpen(false);
  };

  const go = () => {
    sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
    setOpen(false);
    navigate("/onboarding");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : dismiss())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle>Complete your profile</DialogTitle>
          <DialogDescription>
            Finish onboarding to unlock full access — upload certificates,
            medical info, next of kin, references, then acknowledge policies.
            You can come back to it anytime.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={dismiss}>
            Later
          </Button>
          <Button onClick={go}>Start onboarding</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Compact pill rendered in the app header showing onboarding progress. */
export function OnboardingProgressPill() {
  const { enabled, completed, pct } = useOnboardingState();
  const navigate = useNavigate();

  if (!enabled) return null;
  if (completed) return null;

  return (
    <button
      onClick={() => navigate("/onboarding")}
      className="hidden md:flex items-center gap-2 px-3 h-9 rounded-md border bg-muted/40 hover:bg-muted transition"
      title="Continue onboarding"
    >
      <div className="flex items-center gap-1.5">
        {pct === 100 ? (
          <CheckCircle2 className="h-4 w-4 text-success" />
        ) : (
          <Sparkles className="h-4 w-4 text-primary" />
        )}
        <span className="text-xs font-medium">Onboarding</span>
      </div>
      <div className="w-20">
        <Progress value={pct} className="h-1.5" />
      </div>
      <span className="text-xs font-semibold tabular-nums">{pct}%</span>
    </button>
  );
}
