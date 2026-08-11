import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchNotes, addWorkspaceNote, deleteWorkspaceNote, type Mandate } from "@/lib/crm/mandates-api";

export function NotesTab({ mandate }: { mandate: Mandate }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: notes = [] } = useQuery({
    queryKey: ["mandateNotes", mandate._id],
    queryFn: () => fetchNotes(mandate._id),
  });
  const [text, setText] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["mandateNotes", mandate._id] });

  const addMut = useMutation({
    mutationFn: () => addWorkspaceNote(mandate._id, "You", text.trim()),
    onSuccess: () => { invalidate(); setText(""); toast({ title: "Note added" }); },
  });
  const deleteMut = useMutation({
    mutationFn: (noteId: string) => deleteWorkspaceNote(mandate._id, noteId),
    onSuccess: () => { invalidate(); toast({ title: "Note deleted" }); },
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Textarea placeholder="Add an internal note…" value={text} onChange={(e) => setText(e.target.value)} className="min-h-[60px]" />
        <Button disabled={addMut.isPending || !text.trim()} onClick={() => addMut.mutate()} className="self-end">Add note</Button>
      </div>
      <div className="space-y-2">
        {!notes.length && <p className="text-sm text-muted-foreground">No notes yet.</p>}
        {notes.map((n) => (
          <Card key={n._id}>
            <CardContent className="flex items-start justify-between gap-3 p-3">
              <div>
                <p className="text-sm">{n.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">{n.author} · {new Date(n.createdAt).toLocaleString()}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => deleteMut.mutate(n._id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
