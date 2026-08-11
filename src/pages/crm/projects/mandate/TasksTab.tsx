import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { fetchTasks, type Task } from "@/lib/crm/tasks-api";

export function TasksTab({ mandateId }: { mandateId: string }) {
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", { mandateId }],
    queryFn: () => fetchTasks({ mandateId }),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground py-6">Loading tasks…</p>;

  return (
    <Table>
      <TableHeader><TableRow><TableHead>Task</TableHead><TableHead>Assignee</TableHead><TableHead>Status</TableHead><TableHead>Due</TableHead></TableRow></TableHeader>
      <TableBody>
        {tasks.map((t: Task) => (
          <TableRow key={t._id}>
            <TableCell className="text-sm">{t.title}</TableCell>
            <TableCell className="text-sm">{t.assignee}</TableCell>
            <TableCell><Badge variant="outline">{t.status}</Badge></TableCell>
            <TableCell className="text-sm">{t.dueDate?.slice(0, 10)}</TableCell>
          </TableRow>
        ))}
        {!tasks.length && (
          <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">No tasks yet — add one from the Tasks page.</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  );
}
