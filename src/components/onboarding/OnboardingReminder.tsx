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
import { fetchMyOnboardingStatus } from "@/lib/hr/hr-api";
import { useAuth } from "@/contexts/AuthContext";

const SESSION_DISMISS_KEY = "onboarding-reminder-dismissed";

// Total steps in the wizard — kept in one place so the pill's
// percentage math matches EmployeeOnboarding.tsx's STEPS.length.
const TOTAL_STEPS = 4;

/**
 * Hook returning the current employee onboarding state, sourced
 * entirely from the backend (employee.onboardingStep / completed).
 * No localStorage — the query cache (shared across every component
 * using this hook) is the single source of truth, so the pill, the
 * reminder popup, and the wizard itself can never disagree.
 */
export function useOnboardingState() {
  const { user, isAdmin } = useAuth();
  const { data } = useQuery({
    queryKey: ["onboarding-status"],
    queryFn: fetchMyOnboardingStatus,
    enabled: !!user && !isAdmin,
    staleTime: 30_000,
  });

  const completed = !!data?.completed;
  const step = data?.step ?? 0; // 0-4, furthest completed step
  const pct = completed ? 100 : Math.round((step / TOTAL_STEPS) * 100);
  const enabled = !!user && !isAdmin && data !== undefined;

  return { enabled, completed, step, pct };
}

/**
 * Renders a welcome popup nudging incomplete employees to
 * /onboarding (dismissable per session). The header progress pill
 * is a sibling component (OnboardingProgressPill, below).
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
