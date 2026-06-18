import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, LogIn, LogOut, Coffee, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  fetchActiveShift,
  clockIn,
  startBreak,
  endBreak,
  clockOut,
  type AttendanceRecord,
} from "@/lib/hr-api";

const fmtTime = (d: string) =>
  new Date(d).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * Compact clock-in / break / clock-out widget for the employee
 * dashboard. Shares the same active-shift query key as MyTime.tsx,
 * so actions taken here stay in sync if the person also has that
 * page open, and vice versa.
 */
export function QuickClockCard() {
  const queryClient = useQueryClient();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const { data: activeShift, isLoading } = useQuery<AttendanceRecord | null>({
    queryKey: ["active-shift"],
    queryFn: fetchActiveShift,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const elapsed = activeShift?.clockIn
    ? Math.max(
        0,
        Math.floor(
          (now.getTime() - new Date(activeShift.clockIn).getTime()) / 60000,
        ) - (activeShift.breakMinutes ?? 0),
      )
    : 0;
  const hh = Math.floor(elapsed / 60);
  const mm = elapsed % 60;

  const clockedIn = !!activeShift && !activeShift.clockOut;
  const onBreak = clockedIn && !!activeShift?.breakStartedAt;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["active-shift"] });
    queryClient.invalidateQueries({ queryKey: ["attendance-stats"] });
    queryClient.invalidateQueries({ queryKey: ["attendance-history"] });
  };

  const clockInMutation = useMutation({
    mutationFn: () => clockIn({ location: "Office" }),
    onSuccess: (record) => {
      invalidate();
      toast.success(`Clocked in at ${fmtTime(record.clockIn)}`);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to clock in"),
  });

  const breakStartMutation = useMutation({
    mutationFn: startBreak,
    onSuccess: () => {
      invalidate();
      toast.success("Break started.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to start break"),
  });

  const breakEndMutation = useMutation({
    mutationFn: endBreak,
    onSuccess: () => {
      invalidate();
      toast.success("Break ended.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to end break"),
  });

  const clockOutMutation = useMutation({
    mutationFn: clockOut,
    onSuccess: (record) => {
      invalidate();
      toast.success(
        `Clocked out. Logged ${record.hoursWorked?.toFixed(1) ?? "0.0"}h.`,
      );
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to clock out"),
  });

  const anyMutating =
    clockInMutation.isPending ||
    breakStartMutation.isPending ||
    breakEndMutation.isPending ||
    clockOutMutation.isPending;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          My Time
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {isLoading
              ? "Loading…"
              : clockedIn
                ? onBreak
                  ? "On break"
                  : "Currently on shift"
                : "Not clocked in"}
          </p>
          <p className="text-2xl font-bold font-mono">
            {clockedIn ? `${hh}h ${mm}m` : "0h 0m"}
          </p>
        </div>

        {!clockedIn ? (
          <Button
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500"
            disabled={anyMutating || isLoading}
            onClick={() => clockInMutation.mutate()}
          >
            {clockInMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <LogIn className="h-4 w-4 mr-2" />
            )}
            Clock In
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={anyMutating}
              onClick={() =>
                onBreak
                  ? breakEndMutation.mutate()
                  : breakStartMutation.mutate()
              }
            >
              {breakStartMutation.isPending || breakEndMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Coffee className="h-4 w-4 mr-2" />
              )}
              {onBreak ? "End Break" : "Break"}
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={anyMutating}
              onClick={() => clockOutMutation.mutate()}
            >
              {clockOutMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <LogOut className="h-4 w-4 mr-2" />
              )}
              Clock Out
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
