import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  Eye,
  FileText,
  Plus,
  Loader2,
  Clock,
  UserRound,
  RefreshCw,
} from "lucide-react";
import {
  fetchBoardMembersAwaitingAppointment,
  fetchBoardMembersOnboardingInProgress,
  fetchBoardMemberOnboardingContracts,
  type BoardMember,
} from "@/lib/grc/governance-api";
import NewDirectorWizard from "@/components/grc/NewWizardDirector";
import BoardOnboardingContractingTab from "./BoardOnboardingContractingTab";

// ─────────────────────────────────────────────────────────────
// Board Onboarding — the Governance module's equivalent of KYC's
// Client Onboarding page (see pages/kyc/ClientOnboarding.tsx), per
// the PO's explicit ask to replicate that monitoring flow here.
// Board Management (BoardMgt.tsx) keeps its original purpose — the
// full board registry, composition, skills matrix and succession
// planning — while appointing a new director now happens here, the
// same way "Add Client" moved off the Clients list onto this page's
// KYC counterpart.
// ─────────────────────────────────────────────────────────────

export default function BoardOnboarding() {
  const [wizardOpen, setWizardOpen] = useState(false);

  const {
    data: awaiting = [],
    isLoading: awaitingLoading,
    isFetching: awaitingFetching,
    refetch: refetchAwaiting,
  } = useQuery({
    queryKey: ["board-onboarding-awaiting-appointment"],
    queryFn: fetchBoardMembersAwaitingAppointment,
    staleTime: 30_000,
  });

  const {
    data: inProgress = [],
    isLoading: inProgressLoading,
    isFetching: inProgressFetching,
    refetch: refetchInProgress,
  } = useQuery({
    queryKey: ["board-onboarding-in-progress"],
    queryFn: fetchBoardMembersOnboardingInProgress,
    staleTime: 30_000,
  });

  // Shares the same cache key as BoardOnboardingContractingTab's own
  // query — no extra network request — just used here to compute the
  // "awaiting signature" count for the tab badge, mirroring
  // ClientOnboarding.tsx's awaitingSignatureCount.
  const { data: contracts = [] } = useQuery({
    queryKey: ["board-onboarding-contracts"],
    queryFn: fetchBoardMemberOnboardingContracts,
    staleTime: 30_000,
  });
  const awaitingSignatureCount = contracts.filter(
    (c) => c.signatureStatus === "sent",
  ).length;

  const loading = awaitingLoading || inProgressLoading;
  const refreshing =
    (awaitingFetching && !awaitingLoading) ||
    (inProgressFetching && !inProgressLoading);

  const handleRefresh = () => {
    refetchAwaiting();
    refetchInProgress();
  };

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-primary/10 via-secondary/5 to-background p-6 sm:p-8">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-primary/15 to-secondary/15 blur-2xl" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Board Onboarding
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {loading
                ? "Loading…"
                : `${awaiting.length + inProgress.length} director${awaiting.length + inProgress.length === 1 ? "" : "s"} across the appointment pipeline`}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="bg-background/60 backdrop-blur"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </Button>

            <Button
              className="bg-gradient-to-r from-primary to-secondary text-white shadow-md shadow-primary/25"
              onClick={() => setWizardOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Director
            </Button>

            <NewDirectorWizard
              open={wizardOpen}
              onClose={() => setWizardOpen(false)}
              onDone={handleRefresh}
            />
          </div>
        </div>

        {/* Pipeline stats */}
        <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
          {[
            {
              label: "Awaiting Appointment",
              value: awaiting.length,
              hint: "Appointment letter not yet countersigned",
              icon: Clock,
              accent: "text-primary bg-primary/10",
            },
            {
              label: "Onboarding",
              value: inProgress.length,
              hint: "Fit & proper, docs, training, induction",
              icon: Loader2,
              accent: "text-warning bg-warning/10",
            },
            {
              label: "Contracting",
              value: awaitingSignatureCount,
              hint: "See the Contracting tab",
              icon: FileText,
              accent: "text-secondary bg-secondary/10",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-3 rounded-xl border bg-background/70 backdrop-blur px-4 py-3"
            >
              <div className={`p-2.5 rounded-lg ${s.accent}`}>
                <s.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold leading-none">{s.value}</p>
                <p className="text-xs font-medium mt-1">{s.label}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {s.hint}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="awaiting">
        <TabsList className="bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="awaiting" className="rounded-lg">
            Awaiting Appointment
            {awaiting.length > 0 && (
              <span className="ml-2 rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5">
                {awaiting.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="inProgress" className="rounded-lg">
            Onboarding
            {inProgress.length > 0 && (
              <span className="ml-2 rounded-full bg-warning/10 text-warning text-xs px-2 py-0.5">
                {inProgress.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="contracting" className="rounded-lg">
            Contracting
            {awaitingSignatureCount > 0 && (
              <span className="ml-2 rounded-full bg-blue-100 text-blue-700 text-xs px-2 py-0.5">
                {awaitingSignatureCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1 — Awaiting appointment */}
        <TabsContent value="awaiting" className="mt-4">
          {awaitingLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
          ) : awaiting.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
                <h3 className="text-lg font-semibold">All caught up!</h3>
                <p className="text-sm text-muted-foreground">
                  No directors waiting on a countersigned appointment letter.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {awaiting.map((member) => (
                <DirectorCard key={member._id} member={member} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 2 — Onboarding in progress */}
        <TabsContent value="inProgress" className="mt-4">
          {inProgressLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
          ) : inProgress.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold">Nothing in progress</h3>
                <p className="text-sm text-muted-foreground">
                  Directors appear here once their board-portal account is
                  active and they start completing onboarding.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {inProgress.map((member) => (
                <DirectorCard key={member._id} member={member} showProgress />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 3 — Contracting */}
        <TabsContent value="contracting" className="mt-4">
          <BoardOnboardingContractingTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DIRECTOR CARD
// ─────────────────────────────────────────────────────────────

function DirectorCard({
  member,
  showProgress = false,
}: {
  member: BoardMember;
  showProgress?: boolean;
}) {
  const doneCount = (member.onboardingChecklist ?? []).filter(
    (i) => i.done,
  ).length;
  const totalCount = (member.onboardingChecklist ?? []).length;

  return (
    <Card className="group hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 transition-all duration-200 overflow-hidden">
      <div className="h-1 w-full bg-gradient-to-r from-primary/60 via-secondary/60 to-transparent" />
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 space-y-3 min-w-[260px]">
            {/* Name + badges */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-secondary p-[1.5px] shadow-sm">
                <div className="h-full w-full rounded-[10px] bg-background flex items-center justify-center text-primary">
                  <UserRound className="h-5 w-5" />
                </div>
              </div>
              <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                {member.name}
              </h3>
              <Badge variant="outline">{member.role}</Badge>
              <Badge
                variant="outline"
                className="bg-blue-500/15 text-blue-700 border-blue-500/30"
              >
                {member.termStatus}
              </Badge>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm rounded-xl bg-muted/40 border border-muted p-4">
              <div>
                <span className="text-muted-foreground block text-xs">
                  Email
                </span>
                {member.email}
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">
                  Nationality
                </span>
                {member.nationality || "—"}
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">
                  Appointed
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(member.appointedAt).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">
                  Term ends
                </span>
                {new Date(member.termEnds).toLocaleDateString()}
              </div>
            </div>

            {/* Progress — inProgress tab only */}
            {showProgress && totalCount > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Onboarding checklist</span>
                  <span className="font-medium text-foreground">
                    {doneCount}/{totalCount}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${(doneCount / totalCount) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          {/* Actions */}
          <div className="flex flex-col gap-2 shrink-0">
            {showProgress && (
              <Button
                size="sm"
                asChild
                className="bg-gradient-to-r from-primary to-secondary"
              >
                <Link to={`/grc/governance/board-onboarding/${member._id}`}>
                  <Eye className="h-4 w-4 mr-2" /> View
                </Link>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
