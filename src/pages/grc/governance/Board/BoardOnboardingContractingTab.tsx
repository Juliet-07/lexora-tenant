import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Send,
  CheckCircle2,
  Clock,
  XCircle,
  FileSignature,
} from "lucide-react";
import { fetchBoardMemberOnboardingContracts } from "@/lib/grc/governance-api";
import type { SignableContract } from "@/lib/crm/tools-api";
import OnboardingContractEditor from "@/components/kyc/OnboardingContractEditor";

// Board Management's own Contracting tab — mirrors
// pages/kyc/OnboardingContractingTab.tsx exactly, reusing the same
// generic, contract-type-agnostic editor (it operates on a
// SignableContract by id via the shared /contracts API, with no
// client-specific logic), the same way board appointment letters
// already reuse the whole client contract engine end to end.

const statusMeta: Record<
  string,
  { label: string; className: string; icon: JSX.Element }
> = {
  not_sent: {
    label: "Not Sent",
    className: "bg-muted text-muted-foreground",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  sent: {
    label: "Awaiting Signature",
    className: "bg-warning/10 text-warning border-warning/20",
    icon: <Send className="h-3.5 w-3.5" />,
  },
  signed: {
    label: "Signed by Director",
    className: "bg-info/10 text-info border-info/20",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  countersigned: {
    label: "Fully Executed",
    className: "bg-success/10 text-success border-success/20",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  declined: {
    label: "Declined",
    className: "bg-destructive/10 text-destructive border-destructive/20",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
};

export default function BoardOnboardingContractingTab() {
  const [openContractId, setOpenContractId] = useState<string | null>(null);

  const {
    data: contracts = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["board-onboarding-contracts"],
    queryFn: fetchBoardMemberOnboardingContracts,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <FileSignature className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No contracts yet</h3>
          <p className="text-sm text-muted-foreground">
            Appointment letters issued when appointing a new director will
            appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contract</TableHead>
                <TableHead>Director</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issued</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((c: SignableContract) => {
                const meta =
                  statusMeta[c.signatureStatus] ?? statusMeta.not_sent;
                return (
                  <TableRow
                    key={c._id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => setOpenContractId(c._id)}
                  >
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        {c.title}
                      </span>
                    </TableCell>
                    <TableCell>{c.counterparty}</TableCell>
                    <TableCell>
                      <Badge className={`border ${meta.className}`}>
                        <span className="flex items-center gap-1">
                          {meta.icon} {meta.label}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <OnboardingContractEditor
        contractId={openContractId}
        onClose={() => setOpenContractId(null)}
        onChanged={refetch}
      />
    </>
  );
}
