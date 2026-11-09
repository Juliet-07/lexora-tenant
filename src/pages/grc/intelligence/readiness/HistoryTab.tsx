import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DEAL_TYPE_LABEL,
  READINESS_DIMENSIONS,
  scoreColor,
  type ReadinessAssessment,
} from "@/lib/grc/readiness-api";
import { NeedsAssessment, bandPill, fmtDate, type TabProps } from "./shared";

function context(a: ReadinessAssessment): string {
  return (
    a.title || DEAL_TYPE_LABEL[a.dealContext.dealType] || "General readiness"
  );
}

export function HistoryTab({ current, versions, onSwitch, onNew }: TabProps) {
  const [a, setA] = useState<string>("");
  const [b, setB] = useState<string>("");

  useEffect(() => {
    if (!versions.length) return;
    const last = versions[versions.length - 1]._id;
    const prev = (
      versions[versions.length - 2] ?? versions[versions.length - 1]
    )._id;
    setA((x) => (versions.some((v) => v._id === x) ? x : prev));
    setB((x) => (versions.some((v) => v._id === x) ? x : last));
  }, [versions]);

  if (!current) return <NeedsAssessment onNew={onNew} />;

  const from = versions.find((v) => v._id === a);
  const to = versions.find((v) => v._id === b);
  const sorted = [...versions].reverse();

  return (
    <div className="space-y-8">
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Version</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Context</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Band</TableHead>
              <TableHead>Open / closed gaps</TableHead>
              <TableHead>Advisor</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((v) => (
              <TableRow
                key={v._id}
                className={v._id === current._id ? "bg-primary/5" : ""}
              >
                <TableCell className="font-semibold">v{v.version}</TableCell>
                <TableCell>{fmtDate(v.createdAt)}</TableCell>
                <TableCell className="max-w-[220px] truncate">
                  {context(v)}
                </TableCell>
                <TableCell
                  className={`font-bold ${scoreColor(v.overallScore)}`}
                >
                  {v.overallScore}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={bandPill(v.band.label)}>
                    {v.band.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  {v.gapsOpen} / {v.gapsClosed}
                </TableCell>
                <TableCell>{v.advisor || "—"}</TableCell>
                <TableCell>
                  {v._id === current._id ? (
                    <span className="text-xs text-muted-foreground">
                      Viewing
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onSwitch(v._id)}
                    >
                      View
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold">Compare versions</h3>
        {versions.length < 2 ? (
          <p className="text-sm text-muted-foreground">
            Create a second version to compare dimension scores before and
            after.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={a} onValueChange={setA}>
                <SelectTrigger className="w-[150px]" aria-label="Compare from">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((v) => (
                    <SelectItem key={v._id} value={v._id}>
                      v{v.version} · {fmtDate(v.createdAt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">to</span>
              <Select value={b} onValueChange={setB}>
                <SelectTrigger className="w-[150px]" aria-label="Compare to">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((v) => (
                    <SelectItem key={v._id} value={v._id}>
                      v{v.version} · {fmtDate(v.createdAt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {from && to ? (
              <div className="overflow-x-auto rounded-lg border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dimension</TableHead>
                      <TableHead>v{from.version}</TableHead>
                      <TableHead>v{to.version}</TableHead>
                      <TableHead>Change</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {READINESS_DIMENSIONS.map((d) => {
                      const x =
                        from.scores.find((s) => s.dimension === d)?.effective ??
                        0;
                      const y =
                        to.scores.find((s) => s.dimension === d)?.effective ??
                        0;
                      const delta = y - x;
                      return (
                        <TableRow key={d}>
                          <TableCell>{d}</TableCell>
                          <TableCell>{x}</TableCell>
                          <TableCell>{y}</TableCell>
                          <TableCell
                            className={
                              delta > 0
                                ? "font-semibold text-emerald-600"
                                : delta < 0
                                  ? "font-semibold text-rose-600"
                                  : "text-muted-foreground"
                            }
                          >
                            {delta > 0 ? `+${delta}` : delta}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-muted/40 font-semibold">
                      <TableCell>Overall</TableCell>
                      <TableCell>{from.overallScore}</TableCell>
                      <TableCell>{to.overallScore}</TableCell>
                      <TableCell
                        className={
                          to.overallScore - from.overallScore > 0
                            ? "text-emerald-600"
                            : to.overallScore - from.overallScore < 0
                              ? "text-rose-600"
                              : "text-muted-foreground"
                        }
                      >
                        {to.overallScore - from.overallScore > 0 ? "+" : ""}
                        {to.overallScore - from.overallScore}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
