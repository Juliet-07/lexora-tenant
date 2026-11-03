import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BellRing, CircleCheck } from "lucide-react";
import { fetchMyNoticeSummary } from "@/lib/hr/hr-notices-api";
import { fmtD } from "@/components/hr/notices/noticeUi";

/**
 * The one-line note under the dashboard greeting that tells an employee
 * whether any HR notice is waiting on them. It reads the employee's own
 * summary, so it only renders for people who have an employee profile.
 */
export function NoticeDashboardLine() {
  const { data } = useQuery({
    queryKey: ["my-notice-summary"],
    queryFn: fetchMyNoticeSummary,
    staleTime: 30_000,
    refetchInterval: 120_000,
    retry: false,
  });

  if (!data || !data.hasProfile) return null;

  if (!data.needsAction) {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
        <CircleCheck className="h-4 w-4 text-emerald-600" />
        You are up to date with every notice.
      </p>
    );
  }

  const n = data.needsAction;
  const tail = data.next
    ? data.overdue > 0
      ? `. ${data.overdue} past the deadline, so please start there.`
      : `. The next is due ${fmtD(data.next.deadline)}.`
    : ".";

  return (
    <Link
      to={
        data.next
          ? `/my/announcements?filter=action&id=${data.next.id}`
          : "/my/announcements?filter=action"
      }
      className="group mt-1.5 flex items-start gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <BellRing
        className={`mt-0.5 h-4 w-4 shrink-0 ${data.overdue > 0 ? "text-destructive" : "text-amber-600"}`}
      />
      <span>
        {n} {n === 1 ? "notice needs" : "notices need"} your acknowledgement
        {tail}{" "}
        <span className="font-medium text-primary underline-offset-2 group-hover:underline">
          Review now
        </span>
      </span>
    </Link>
  );
}
