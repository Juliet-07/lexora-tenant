import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AtSign, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchTasks } from "@/lib/crm/tasks-api";
import {
  fetchEmployeeMessages,
  sendEmployeeMessage,
} from "@/lib/crm/mandates-api";

export function CollaborationTab({ mandateId }: { mandateId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Who's eligible to @mention — anyone with a real task on this
  // mandate. Same "derive from tasks, no new endpoint" approach used
  // elsewhere, since that data's already real and already fetched.
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", { mandateId }],
    queryFn: () => fetchTasks({ mandateId }),
  });
  const teamMembers = useMemo(() => {
    const map = new Map<string, string>();
    tasks.forEach((t) => {
      if (t.assigneeUserId) map.set(t.assigneeUserId, t.assignee);
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [tasks]);

  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const recipient = teamMembers.find((m) => m.id === recipientId);

  const { data: thread = [] } = useQuery({
    queryKey: ["employeeMessages", mandateId, recipientId],
    queryFn: () => fetchEmployeeMessages(mandateId, recipientId as string),
    enabled: !!recipientId,
  });

  const sendMut = useMutation({
    mutationFn: () =>
      sendEmployeeMessage(mandateId, recipientId as string, "You", text.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["employeeMessages", mandateId, recipientId],
      });
      setText("");
      toast({
        title: "Message sent",
        description: `Sent to ${recipient?.name}`,
      });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to send",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);
    // Only tracks a mention actively being typed at the very end of
    // the text — the common case of "@" then a name right where the
    // cursor is, without needing full cursor-position tracking.
    const match = value.match(/@(\w*)$/);
    if (match) {
      setMentionOpen(true);
      setMentionQuery(match[1].toLowerCase());
    } else {
      setMentionOpen(false);
    }
  };

  const pickMention = (member: { id: string; name: string }) => {
    setText((t) => t.replace(/@(\w*)$/, `@${member.name} `));
    setRecipientId(member.id);
    setMentionOpen(false);
    textareaRef.current?.focus();
  };

  const filteredMembers = teamMembers.filter((m) =>
    m.name.toLowerCase().includes(mentionQuery),
  );

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Type <strong>@</strong> to mention a team member on this mandate and
        message them directly.
      </p>

      {!teamMembers.length && (
        <p className="rounded border border-dashed p-3 text-xs text-muted-foreground">
          No team members with tasks on this mandate yet — assign a task to
          someone first.
        </p>
      )}

      {recipientId && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Conversation with
            </span>
            <Badge variant="outline">
              <AtSign className="mr-1 h-3 w-3" />
              {recipient?.name}
            </Badge>
          </div>
          <div className="max-h-80 space-y-3 overflow-y-auto rounded border p-3">
            {!thread.length && (
              <p className="text-sm text-muted-foreground">
                No messages yet — say hello.
              </p>
            )}
            {thread.map((m) => (
              <div
                key={m._id}
                className={`flex gap-2 ${m.direction === "tenant" ? "flex-row-reverse" : ""}`}
              >
                <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {m.author
                    .split(" ")
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${m.direction === "tenant" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
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
        </>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            placeholder="Type @ to mention someone on the team…"
            className="min-h-[60px]"
          />
          {mentionOpen && filteredMembers.length > 0 && (
            <div className="absolute z-10 mt-1 w-64 rounded-md border bg-popover shadow-md">
              {filteredMembers.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => pickMention(m)}
                >
                  <AtSign className="h-3.5 w-3.5 text-muted-foreground" />
                  {m.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button
          disabled={!recipientId || sendMut.isPending || !text.trim()}
          onClick={() => sendMut.mutate()}
          className="self-end"
        >
          <Send className="mr-2 h-4 w-4" /> Send
        </Button>
      </div>
    </div>
  );
}
