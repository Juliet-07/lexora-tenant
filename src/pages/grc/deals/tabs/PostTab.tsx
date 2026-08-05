import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Archive, Plus } from "lucide-react";
import {
  addPostCompletion,
  togglePostCompletion,
  type Deal,
} from "@/lib/grc/deals-api";

export default function PostTab({ deal }: { deal: Deal }) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["deal", deal._id] });
  const postCompletion = deal.postCompletion ?? [];
  const [f, setF] = useState({ item: "", dueDate: "" });

  const addMut = useMutation({
    mutationFn: () =>
      addPostCompletion(
        deal._id,
        f.item,
        f.dueDate || new Date().toISOString().slice(0, 10),
      ),
    onSuccess: () => {
      invalidate();
      setF({ item: "", dueDate: "" });
    },
  });
  const toggleMut = useMutation({
    mutationFn: (index: number) => togglePostCompletion(deal._id, index),
    onSuccess: invalidate,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Archive className="h-4 w-4" />
          Post-Completion register
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {postCompletion.map((p, i) => (
          <label
            key={i}
            className="flex items-center gap-2 text-sm p-2 border rounded cursor-pointer hover:bg-muted/40"
          >
            <input
              type="checkbox"
              checked={p.status === "Done"}
              onChange={() => toggleMut.mutate(i)}
            />
            <span
              className={
                p.status === "Done" ? "line-through text-muted-foreground" : ""
              }
            >
              {p.item}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              {p.dueDate.slice(0, 10)}
            </span>
          </label>
        ))}
        <div className="flex gap-2 pt-2 border-t">
          <Input
            placeholder="Register item (e.g. warranty period ends)"
            value={f.item}
            onChange={(e) => setF({ ...f, item: e.target.value })}
          />
          <Input
            type="date"
            value={f.dueDate}
            onChange={(e) => setF({ ...f, dueDate: e.target.value })}
            className="w-40"
          />
          <Button
            disabled={!f.item || addMut.isPending}
            onClick={() => addMut.mutate()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
