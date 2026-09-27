import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Clock, Loader2, UserRound } from "lucide-react";
import {
  fetchBoardMember,
  toggleOnboardingItem,
} from "@/lib/grc/governance-api";

// Board Onboarding's per-director detail view — the equivalent of
// pages/kyc/OnboardingDetail.tsx for board members. Deliberately not
// a port of that file: KYC onboarding review is built around identity
// verification and PEP-screening checks that have no board-member
// equivalent. What director onboarding actually tracks is the same
// 5-stage checklist Board Management's own Onboarding/Offboarding tab
// already manages (BoardMgt.tsx), so this page is a simpler, focused
// read (plus the same toggle capability, minus the "accept" stage,
// which only ever completes automatically on countersignature).

const STAGE_LABELS: Record<string, string> = {
  accept: "Accept",
  "fit-proper": "Fit & Proper",
  "sign-docs": "Sign docs",
  training: "Training",
  induction: "Induction",
};

export default function BoardOnboardingDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const {
    data: member,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["board-member-detail", id],
    queryFn: () => fetchBoardMember(id!),
    enabled: !!id,
  });

  const toggleMutation = useMutation({
    mutationFn: (index: number) => toggleOnboardingItem(id!, index),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-member-detail", id] });
      queryClient.invalidateQueries({
        queryKey: ["board-onboarding-in-progress"],
      });
      queryClient.invalidateQueries({
        queryKey: ["board-onboarding-awaiting-appointment"],
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !member) {
    return (
      <div className="space-y-4">
        <BackLink />
        <Card>
          <CardContent className="p-12 text-center text-sm text-muted-foreground">
            Couldn't load this director's onboarding record.
          </CardContent>
        </Card>
      </div>
    );
  }

  const checklist = member.onboardingChecklist ?? [];
  const doneCount = checklist.filter((i) => i.done).length;

  return (
    <div className="space-y-6">
      <BackLink />

      <div className="flex items-start gap-4 flex-wrap">
        <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary to-secondary p-[1.5px] shadow-sm shrink-0">
          <div className="h-full w-full rounded-[10px] bg-background flex items-center justify-center text-primary">
            <UserRound className="h-6 w-6" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold">{member.name}</h1>
          <div className="flex flex-wrap gap-2 mt-1.5">
            <Badge variant="outline">{member.role}</Badge>
            <Badge
              variant="outline"
              className="bg-blue-500/15 text-blue-700 border-blue-500/30"
            >
              {member.termStatus}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Appointed {new Date(member.appointedAt).toLocaleDateString()}
            </Badge>
            <Badge variant="outline">
              Term ends {new Date(member.termEnds).toLocaleDateString()}
            </Badge>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Director details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <KV k="Email" v={member.email} />
          <KV k="Nationality" v={member.nationality || "—"} />
          <KV k="National ID / Passport" v={member.idNumber || "—"} />
          <KV k="Tax residency" v={member.taxResidency || "—"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Onboarding checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress
            value={checklist.length ? (doneCount / checklist.length) * 100 : 0}
            className="h-2"
          />
          <div className="text-xs text-muted-foreground">
            {doneCount}/{checklist.length} complete
          </div>

          <div className="space-y-1">
            {checklist.map((item, i) => {
              // The "accept" stage (appointment letter) only ever
              // completes automatically on countersignature — see
              // board-member.service.ts#onAppointmentContractCountersigned.
              const isAutoOnly = item.stageId === "accept";
              return (
                <label
                  key={i}
                  className={`flex items-start gap-2 text-sm border-b last:border-0 py-2 ${
                    isAutoOnly ? "" : "cursor-pointer"
                  }`}
                >
                  <Checkbox
                    checked={item.done}
                    disabled={toggleMutation.isPending || isAutoOnly}
                    onCheckedChange={() =>
                      !isAutoOnly && toggleMutation.mutate(i)
                    }
                    className="mt-0.5"
                  />
                  <span className="flex-1">
                    <span
                      className={
                        item.done ? "line-through text-muted-foreground" : ""
                      }
                    >
                      {item.label}
                    </span>
                    {item.stageId && STAGE_LABELS[item.stageId] && (
                      <Badge
                        variant="outline"
                        className="ml-2 text-[10px] font-medium text-muted-foreground align-middle"
                      >
                        {STAGE_LABELS[item.stageId]}
                      </Badge>
                    )}
                    {isAutoOnly && !item.done && (
                      <span className="block text-[11px] text-muted-foreground mt-0.5">
                        Completes automatically once the appointment letter is
                        countersigned.
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
            {checklist.length === 0 && (
              <div className="text-xs text-muted-foreground py-2">
                No onboarding checklist recorded.
              </div>
            )}
          </div>

          {toggleMutation.isPending && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving…
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BackLink() {
  return (
    <Button variant="ghost" size="sm" asChild className="-ml-2">
      <Link to="/grc/governance/board-onboarding">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Board Onboarding
      </Link>
    </Button>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b sm:border-0 last:border-0 pb-1.5 sm:pb-0">
      <span className="text-muted-foreground shrink-0">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}
