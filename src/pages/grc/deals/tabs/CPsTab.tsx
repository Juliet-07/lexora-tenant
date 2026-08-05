import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ShieldCheck, Plus } from "lucide-react";
import { addCP, updateCP, type Deal, type CPKind } from "@/lib/grc/deals-api";

export default function CPsTab({ deal }: { deal: Deal }) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["deal", deal._id] });
  const [f, setF] = useState({
    type: "Precedent" as CPKind,
    description: "",
    responsible: "",
    deadline: "",
  });

  const addMut = useMutation({
    mutationFn: () => addCP(deal._id, f),
    onSuccess: () => {
      invalidate();
      setF({ ...f, description: "", responsible: "", deadline: "" });
    },
  });
  const patchMut = useMutation({
    mutationFn: ({
      index,
      patch,
    }: {
      index: number;
      patch: Partial<{ status: any; evidence: string }>;
    }) => updateCP(deal._id, index, patch),
    onSuccess: invalidate,
  });

  const today = new Date().toISOString().slice(0, 10);
  const groups = [
    ["Precedent", "Conditions Precedent"],
    ["Subsequent", "Conditions Subsequent"],
  ] as const;
  const cps = deal.cps ?? [];
  const withIndex = cps.map((c, index) => ({ ...c, index }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Longstop monitoring
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Longstop date</div>
            <div
              className={`text-lg font-bold ${deal.longstopDate.slice(0, 10) < today ? "text-rose-600" : ""}`}
            >
              {deal.longstopDate.slice(0, 10)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">CPs at risk</div>
            <div className="text-lg font-bold text-amber-700">
              {cps.filter((c) => c.status === "At Risk").length}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Days remaining</div>
            <div className="text-lg font-bold">
              {Math.max(
                0,
                Math.ceil(
                  (new Date(deal.longstopDate).getTime() - Date.now()) /
                    86400000,
                ),
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add condition</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <Select
            value={f.type}
            onValueChange={(v) => setF({ ...f, type: v as CPKind })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Precedent">Precedent</SelectItem>
              <SelectItem value="Subsequent">Subsequent</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Description"
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
            className="md:col-span-2"
          />
          <Input
            placeholder="Responsible"
            value={f.responsible}
            onChange={(e) => setF({ ...f, responsible: e.target.value })}
          />
          <div className="flex gap-2">
            <Input
              type="date"
              value={f.deadline}
              onChange={(e) => setF({ ...f, deadline: e.target.value })}
            />
            <Button
              disabled={!f.description || addMut.isPending}
              onClick={() => addMut.mutate()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {groups.map(([key, label]) => {
        const rows = withIndex.filter((c) => c.type === key);
        return (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="text-base">
                {label} ({rows.filter((r) => r.status === "Satisfied").length}/
                {rows.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Responsible</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Evidence</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((c) => (
                    <TableRow key={c.index}>
                      <TableCell className="text-sm">{c.description}</TableCell>
                      <TableCell className="text-xs">{c.responsible}</TableCell>
                      <TableCell
                        className={`text-xs ${c.deadline.slice(0, 10) < today && c.status !== "Satisfied" ? "text-rose-600 font-semibold" : ""}`}
                      >
                        {c.deadline.slice(0, 10)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Input
                          className="h-7 text-xs w-32"
                          defaultValue={c.evidence}
                          placeholder="Reference…"
                          onBlur={(e) =>
                            e.target.value !== c.evidence &&
                            patchMut.mutate({
                              index: c.index,
                              patch: { evidence: e.target.value },
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={c.status}
                          onValueChange={(v) =>
                            patchMut.mutate({
                              index: c.index,
                              patch: { status: v },
                            })
                          }
                        >
                          <SelectTrigger className="h-7 w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[
                              "Satisfied",
                              "Pending",
                              "At Risk",
                              "Not Yet Due",
                            ].map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-xs text-muted-foreground py-6"
                      >
                        No {label.toLowerCase()}.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
