import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchMyCollabMessages,
  sendMyCollabMessage,
} from "@/lib/crm/mandates-api";

export function CollaborationTab({ mandateId }: { mandateId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: thread = [], isLoading } = useQuery({
    queryKey: ["myCollabMessages", mandateId],
    queryFn: () => fetchMyCollabMessages(mandateId),
  });
  const [text, setText] = useState("");

  const sendMut = useMutation({
    mutationFn: () => sendMyCollabMessage(mandateId, "You", text.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["myCollabMessages", mandateId],
      });
      setText("");
      toast({ title: "Message sent" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to send",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  if (isLoading)
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
    );

  return (
    <div className="space-y-3">
      <div className="max-h-96 space-y-3 overflow-y-auto rounded border p-3">
        {!thread.length && (
          <p className="text-sm text-muted-foreground">
            No messages yet — the tenant will reach out here about your work on
            this mandate.
          </p>
        )}
        {thread.map((m) => (
          <div
            key={m._id}
            className={`flex gap-2 ${m.direction === "employee" ? "flex-row-reverse" : ""}`}
          >
            <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-muted text-xs font-medium">
              {m.author
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("")}
            </div>
            <div
              className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${m.direction === "employee" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            >
              <p className="mb-0.5 text-[11px] font-medium opacity-80">
                {m.author}
              </p>
              <p>{m.body}</p>
              <p className="mt-1 text-[10px] opacity-70">
                {new Date(m.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Textarea
          placeholder="Reply to the tenant…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-[60px]"
        />
        <Button
          disabled={sendMut.isPending || !text.trim()}
          onClick={() => sendMut.mutate()}
          className="self-end"
        >
          <Send className="mr-2 h-4 w-4" /> Send
        </Button>
      </div>
    </div>
  );
}
