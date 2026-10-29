import { useState } from "react";
import { BarChart3, Plus, Repeat, Table2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CapTable, Shareholder } from "@/lib/grc/ownership-api";
import { EmptyState, SLICE_COLORS, fmtNum, fmtPct } from "../shared";

const ROLE_TONE: Record<string, string> = {
  Shareholder: "bg-violet-500/10 text-violet-600 border-violet-500/30",
  Board: "bg-primary/10 text-primary border-primary/30",
  Department: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  Role: "bg-amber-500/10 text-amber-600 border-amber-500/30",
};
export const RoleChips = ({ types }: { types: string[] }) => (
  <div className="flex flex-wrap gap-1">
    {types.map((t) => (
      <Badge
        key={t}
        variant="outline"
        className={`text-[10px] ${ROLE_TONE[t] ?? ""}`}
      >
        {t}
      </Badge>
    ))}
  </div>
);

function Donut({ cap }: { cap: CapTable }) {
  const holders = cap.holders.filter((h) => h.totalShares > 0);
  const total = cap.stats.issued;
  const size = 200;
  const c = size / 2;
  const r = 85;
  const ir = 52;
  let start = -90;
  const paths = holders.map((h, i) => {
    const angle = total ? (h.totalShares / total) * 360 : 0;
    // A single 100% slice can't be drawn as one arc — split it in two.
    const end = start + Math.min(angle, 359.99);
    const rad = (d: number) => (d * Math.PI) / 180;
    const large = end - start > 180 ? 1 : 0;
    const d = [
      `M${c + r * Math.cos(rad(start))},${c + r * Math.sin(rad(start))}`,
      `A${r},${r} 0 ${large},1 ${c + r * Math.cos(rad(end))},${c + r * Math.sin(rad(end))}`,
      `L${c + ir * Math.cos(rad(end))},${c + ir * Math.sin(rad(end))}`,
      `A${ir},${ir} 0 ${large},0 ${c + ir * Math.cos(rad(start))},${c + ir * Math.sin(rad(start))}`,
      "Z",
    ].join(" ");
    start += angle;
    return (
      <path key={h.nodeId} d={d} fill={SLICE_COLORS[i % SLICE_COLORS.length]}>
        <title>{`${h.name}: ${fmtPct(h.pct)}`}</title>
      </path>
    );
  });
  return (
    <div className="flex flex-wrap items-center justify-center gap-8 py-6">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {paths}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] text-muted-foreground">Total</span>
          <span className="text-lg font-bold">{fmtNum(total)}</span>
        </div>
      </div>
      <div className="space-y-2">
        {holders.map((h, i) => (
          <div key={h.nodeId} className="flex items-center gap-2.5 text-sm">
            <span
              className="h-3 w-3 rounded-sm"
              style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }}
            />
            <div className="min-w-40">
              <div className="font-medium leading-tight">{h.name}</div>
              <div className="text-[11px] text-muted-foreground">
                {fmtNum(h.totalShares)} shares
              </div>
            </div>
            <span className="font-semibold tabular-nums">{fmtPct(h.pct)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RegisterPanel({
  cap,
  money,
  onAddShareholder,
  onTransfer,
  onIssue,
}: {
  cap: CapTable;
  money: (n: number) => string;
  onAddShareholder: () => void;
  onTransfer: () => void;
  onIssue: (nodeId: string) => void;
}) {
  const [chart, setChart] = useState(false);
  const [detail, setDetail] = useState<Shareholder | null>(null);
  const withShares = cap.holders.filter((h) => h.totalShares > 0);
  const unissuedPct = cap.stats.authorised
    ? (cap.stats.unissued / cap.stats.authorised) * 100
    : 0;
  const color = (id: string) =>
    SLICE_COLORS[
      Math.max(
        0,
        withShares.findIndex((h) => h.nodeId === id),
      ) % SLICE_COLORS.length
    ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Share register</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onAddShareholder}>
              <Plus className="h-4 w-4 mr-1.5" /> Add shareholder
            </Button>
            <Button size="sm" variant="outline" onClick={onTransfer}>
              <Repeat className="h-4 w-4 mr-1.5" /> Transfer shares
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setChart((c) => !c)}
            >
              {chart ? (
                <Table2 className="h-4 w-4 mr-1.5" />
              ) : (
                <BarChart3 className="h-4 w-4 mr-1.5" />
              )}
              {chart ? "Table view" : "Chart view"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {cap.holders.length === 0 ? (
            <EmptyState
              title="No shareholders yet"
              hint={
                cap.classes.length === 0
                  ? "Start by creating a share class (Share Classes tab), then add your first shareholder."
                  : "Add your first shareholder and issue them shares."
              }
              action={
                <Button onClick={onAddShareholder}>
                  <Plus className="h-4 w-4 mr-2" /> Add shareholder
                </Button>
              }
            />
          ) : chart ? (
            <Donut cap={cap} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shareholder</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">Shares</TableHead>
                  <TableHead>% Ownership</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Voting</TableHead>
                  <TableHead>Vesting</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {cap.holders.map((h) => (
                  <TableRow
                    key={h.nodeId}
                    className="cursor-pointer"
                    onClick={() => setDetail(h)}
                  >
                    <TableCell>
                      <div className="font-medium">{h.name}</div>
                      <RoleChips types={h.types} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {h.holdings.length === 0 && (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                        {h.holdings.map((x) => (
                          <Badge
                            key={x.classId}
                            variant="secondary"
                            className="text-[10px]"
                          >
                            {x.className}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {fmtNum(h.totalShares)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-14 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, h.pct)}%`,
                              background: color(h.nodeId),
                            }}
                          />
                        </div>
                        <span className="font-semibold tabular-nums text-sm">
                          {fmtPct(h.pct)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(h.value)}
                    </TableCell>
                    <TableCell>
                      {h.totalShares === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : h.votingShares === h.totalShares ? (
                        <Badge
                          className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
                          variant="outline"
                        >
                          Yes
                        </Badge>
                      ) : h.votingShares === 0 ? (
                        <Badge
                          className="bg-amber-500/10 text-amber-700 border-amber-500/30"
                          variant="outline"
                        >
                          No
                        </Badge>
                      ) : (
                        <Badge variant="outline">Partly</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {h.vesting
                        ? `${fmtNum(h.vesting.vested)} / ${fmtNum(h.vesting.total)}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetail(h);
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-bold">Total</TableCell>
                  <TableCell />
                  <TableCell className="text-right font-bold tabular-nums">
                    {fmtNum(cap.stats.issued)}
                  </TableCell>
                  <TableCell className="font-bold">100.0%</TableCell>
                  <TableCell className="text-right font-bold tabular-nums">
                    {money(cap.stats.valuation)}
                  </TableCell>
                  <TableCell colSpan={3} />
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>

      {withShares.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ownership breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {withShares.map((h) => (
              <div key={h.nodeId} className="flex items-center gap-3">
                <div className="w-40 truncate text-sm">{h.name}</div>
                <div className="flex-1 h-6 rounded-md bg-muted overflow-hidden">
                  <div
                    className="h-full flex items-center px-2 text-[11px] font-semibold text-white"
                    style={{
                      width: `${Math.max(Math.min(100, h.pct), 4)}%`,
                      background: color(h.nodeId),
                    }}
                  >
                    {fmtPct(h.pct)}
                  </div>
                </div>
              </div>
            ))}
            {cap.stats.unissued > 0 && (
              <div className="flex items-center gap-3">
                <div className="w-40 truncate text-sm text-muted-foreground">
                  Unissued (authorised)
                </div>
                <div className="flex-1 h-6 rounded-md bg-muted overflow-hidden">
                  <div
                    className="h-full flex items-center px-2 text-[11px] font-medium text-muted-foreground bg-border"
                    style={{ width: `${Math.max(unissuedPct, 8)}%` }}
                  >
                    {fmtNum(cap.stats.unissued)} shares
                  </div>
                </div>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground pt-1">
              Ownership bars show each holder's share of shares in issue;
              unissued is shown against the total authorised.
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.name}</DialogTitle>
                <DialogDescription>
                  <RoleChips types={detail.types} />
                  {detail.email && (
                    <span className="mt-1 block text-xs">{detail.email}</span>
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  ["Shares", fmtNum(detail.totalShares)],
                  ["Ownership", fmtPct(detail.pct)],
                  ["Voting power", fmtPct(detail.votingPct)],
                ].map(([l, v]) => (
                  <div key={l} className="rounded-md border p-3">
                    <p className="text-[11px] text-muted-foreground">{l}</p>
                    <p className="text-lg font-bold">{v}</p>
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Holdings by class
                </p>
                {detail.holdings.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No shares held yet.
                  </p>
                ) : (
                  detail.holdings.map((x) => (
                    <div
                      key={x.classId}
                      className="flex justify-between border-b py-1.5 last:border-0"
                    >
                      <span>
                        {x.className}
                        {!x.voting && (
                          <span className="ml-2 text-[11px] text-muted-foreground">
                            non-voting
                          </span>
                        )}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {fmtNum(x.shares)}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Value at the current price per share:{" "}
                <span className="font-medium text-foreground">
                  {money(detail.value)}
                </span>
                . Change this person's roles from the org chart (Add / edit).
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDetail(null)}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    onIssue(detail.nodeId);
                    setDetail(null);
                  }}
                >
                  Issue shares
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
