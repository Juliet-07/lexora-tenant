import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchMessages, sendMessage, type Mandate } from "@/lib/crm/mandates-api";

export function CommunicationsTab({ mandate }: { mandate: Mandate }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: messages = [] } = useQuery({
    queryKey: ["mandateMessages", mandate._id],
    queryFn: () => fetchMessages(mandate._id),
  });
  const [text, setText] = useState("");

  const sendMut = useMutation({
    mutationFn: () => sendMessage(mandate._id, "You", text.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mandateMessages", mandate._id] });
      setText("");
      toast({ title: "Message sent", description: `Sent to ${mandate.clientName}` });
    },
  });

  return (
    <div className="space-y-3">
      <div className="max-h-96 space-y-3 overflow-y-auto rounded border p-3">
        {!messages.length && <p className="text-sm text-muted-foreground">No messages yet.</p>}
        {messages.map((m) => (
          <div key={m._id} className={`flex gap-2 ${m.direction === "tenant" ? "flex-row-reverse" : ""}`}>
            <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-muted text-xs font-medium">
              {m.author.split(" ").map((p) => p[0]).slice(0, 2).join("")}
            </div>
            <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${m.direction === "tenant" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              <p className="mb-0.5 text-[11px] font-medium opacity-80">{m.author}</p>
              <p>{m.body}</p>
              <p className="mt-1 text-[10px] opacity-70">{new Date(m.createdAt).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Textarea placeholder={`Message ${mandate.clientName}…`} value={text} onChange={(e) => setText(e.target.value)} className="min-h-[60px]" />
        <Button disabled={sendMut.isPending || !text.trim()} onClick={() => sendMut.mutate()} className="self-end">
          <Send className="mr-2 h-4 w-4" /> Send
        </Button>
      </div>
    </div>
  );
}
