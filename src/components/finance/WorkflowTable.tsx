import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export interface WorkflowStep {
  action: string;
  detail: string;
  owner: string;
  trigger: string;
}

/** Action → detail → owner → trigger table, used by every operational Finance section. */
export function WorkflowTable({ title, steps }: { title: string; steps: WorkflowStep[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="p-4 pt-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead><TableHead>Detail</TableHead>
              <TableHead>Owner</TableHead><TableHead>Trigger</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {steps.map(s => (
              <TableRow key={s.action}>
                <TableCell className="text-sm font-medium">{s.action}</TableCell>
                <TableCell className="text-sm">{s.detail}</TableCell>
                <TableCell className="text-sm">{s.owner}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{s.trigger}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
