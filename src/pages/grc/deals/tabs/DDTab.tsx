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
import { Progress } from "@/components/ui/progress";
import { ClipboardCheck, Plus } from "lucide-react";
import {
  addDDItem,
  updateDDItem,
  type Deal,
  type DDItem,
  type DDWorkstream,
  type Materiality,
} from "@/lib/grc/deals-api";

export default function DDTab({ deal }: { deal: Deal }) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["deal", deal._id] });
  const [item, setItem] = useState({
    workstream: "Legal" as DDWorkstream,
    item: "",
    owner: "",
  });

  const addMut = useMutation({
    mutationFn: () => addDDItem(deal._id, item),
    onSuccess: () => {
      invalidate();
      setItem({ ...item, item: "", owner: "" });
    },
  });
  const patchMut = useMutation({
    mutationFn: ({
      index,
      patch,
    }: {
      index: number;
      patch: Partial<{
        status: any;
        finding: string;
        materiality: Materiality;
      }>;
    }) => updateDDItem(deal._id, index, patch),
    onSuccess: invalidate,
  });

  const dd = deal.dd ?? [];
  const grouped = dd.reduce(
    (a: Record<string, (DDItem & { index: number })[]>, d, index) => {
      (a[d.workstream] ||= []).push({ ...d, index });
      return a;
    },
    {},
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Due Diligence workspace ({deal.ddProgress}% complete)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={deal.ddProgress} className="h-2" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Select
              value={item.workstream}
              onValueChange={(v) =>
                setItem({ ...item, workstream: v as DDWorkstream })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  "Legal",
                  "Financial",
                  "Tax",
                  "Commercial",
                  "Operational",
                  "ESG",
                ].map((w) => (
                  <SelectItem key={w} value={w}>
                    {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Checklist item…"
              value={item.item}
              onChange={(e) => setItem({ ...item, item: e.target.value })}
              className="md:col-span-2"
            />
            <div className="flex gap-2">
              <Input
                placeholder="Owner"
                value={item.owner}
                onChange={(e) => setItem({ ...item, owner: e.target.value })}
              />
              <Button
                disabled={!item.item || addMut.isPending}
                onClick={() => addMut.mutate()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {Object.entries(grouped).map(([ws, items]) => (
        <Card key={ws}>
          <CardHeader>
            <CardTitle className="text-base">{ws} workstream</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Materiality</TableHead>
                  <TableHead>Finding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.index}>
                    <TableCell className="text-sm">{it.item}</TableCell>
                    <TableCell className="text-xs">{it.owner}</TableCell>
                    <TableCell>
                      <Select
                        value={it.status}
                        onValueChange={(v) =>
                          patchMut.mutate({
                            index: it.index,
                            patch: { status: v },
                          })
                        }
                      >
                        <SelectTrigger className="h-7 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            "Not Started",
                            "In Progress",
                            "Complete",
                            "Red Flag",
                          ].map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={it.materiality ?? "__none__"}
                        onValueChange={(v) =>
                          patchMut.mutate({
                            index: it.index,
                            patch: {
                              materiality:
                                v === "__none__"
                                  ? undefined
                                  : (v as Materiality),
                            },
                          })
                        }
                      >
                        <SelectTrigger className="h-7 w-24 text-xs">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">—</SelectItem>
                          {["Low", "Medium", "High"].map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs">
                      <Input
                        className="h-7 text-xs"
                        defaultValue={it.finding}
                        placeholder="Finding notes…"
                        onBlur={(e) =>
                          e.target.value !== it.finding &&
                          patchMut.mutate({
                            index: it.index,
                            patch: { finding: e.target.value },
                          })
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
      {dd.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-6">
          No DD items yet.
        </div>
      )}
    </div>
  );
}
