import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TimeEntry } from "@/lib/crm/time-tracking-api";

export function WeeklyGridTab({ entries }: { entries: TimeEntry[] }) {
  const { days, members, grid, dayTotals, memberTotals } = useMemo(() => {
    const daySet = new Set(entries.map((e) => e.date?.slice(0, 10)));
    const memberSet = new Set(entries.map((e) => e.member));
    const days = Array.from(daySet).sort();
    const members = Array.from(memberSet).sort();

    const grid: Record<string, Record<string, number>> = {};
    members.forEach((m) => {
      grid[m] = {};
      days.forEach((d) => {
        grid[m][d] = 0;
      });
    });
    entries.forEach((e) => {
      const d = e.date?.slice(0, 10);
      if (grid[e.member] && d in grid[e.member]) grid[e.member][d] += e.hours;
    });

    const dayTotals: Record<string, number> = {};
    days.forEach((d) => {
      dayTotals[d] = members.reduce((s, m) => s + grid[m][d], 0);
    });
    const memberTotals: Record<string, number> = {};
    members.forEach((m) => {
      memberTotals[m] = days.reduce((s, d) => s + grid[m][d], 0);
    });

    return { days, members, grid, dayTotals, memberTotals };
  }, [entries]);

  if (!days.length) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No time entries logged yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              {days.map((d) => (
                <TableHead key={d} className="text-right">
                  {d.slice(5)}
                </TableHead>
              ))}
              <TableHead className="text-right font-semibold">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m}>
                <TableCell className="text-sm font-medium">{m}</TableCell>
                {days.map((d) => (
                  <TableCell key={d} className="text-right text-sm">
                    {grid[m][d] > 0 ? grid[m][d].toFixed(1) : "—"}
                  </TableCell>
                ))}
                <TableCell className="text-right text-sm font-semibold">
                  {memberTotals[m].toFixed(1)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell className="text-sm font-semibold">Total</TableCell>
              {days.map((d) => (
                <TableCell key={d} className="text-right text-sm font-semibold">
                  {dayTotals[d].toFixed(1)}
                </TableCell>
              ))}
              <TableCell className="text-right text-sm font-semibold">
                {members.reduce((s, m) => s + memberTotals[m], 0).toFixed(1)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
