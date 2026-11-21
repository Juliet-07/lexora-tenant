import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AtSign, Send, Users, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchTasks } from "@/lib/crm/tasks-api";
import {
  fetchEmployeeMessages,
  fetchGroupMessages,
  fetchMandateTeamMembers,
  sendEmployeeMessage,
  sendGroupMessage,
  type EmployeeMessage,
} from "@/lib/crm/mandates-api";

const EVERYONE = "__everyone__";

export function CollaborationTab({ mandateId }: { mandateId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Who's eligible to message — anyone with a real task on this mandate,
  // plus everyone on the mandate's team (so the owner can reach the Head
  // of Department and members before any task exists).
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", { mandateId }],
    queryFn: () => fetchTasks({ mandateId }),
  });
  const { data: teamRoster = [] } = useQuery({
    queryKey: ["mandateTeamMembers", mandateId],
    queryFn: () => fetchMandateTeamMembers(mandateId),
  });
  const teamMembers = useMemo(() => {
    const map = new Map<string, string>();
    teamRoster.forEach((m) => map.set(m._id, m.name));
    tasks.forEach((t) => {
      if (t.assigneeUserId) map.set(t.assigneeUserId, t.assignee);
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [tasks, teamRoster]);

  // One or more people. One = a private conversation; two or more = a
  // shared group thread that everyone addressed sees and can answer.
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isGroup = recipientIds.length > 1;
  const nameOf = (id: string) => teamMembers.find((m) => m.id === id)?.name;
  const allSelected =
    teamMembers.length > 0 && recipientIds.length === teamMembers.length;

  const toggle = (id: string) =>
    setRecipientIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  const toggleEveryone = () =>
    setRecipientIds(allSelected ? [] : teamMembers.map((m) => m.id));

  const threadKey = [...recipientIds].sort().join(",");
  const { data: thread = [] } = useQuery<EmployeeMessage[]>({
    queryKey: [
      "employeeMessages",
      mandateId,
      isGroup ? "group" : "one",
      threadKey,
    ],
    queryFn: () =>
      isGroup
        ? fetchGroupMessages(mandateId, recipientIds)
        : fetchEmployeeMessages(mandateId, recipientIds[0]),
    enabled: recipientIds.length > 0,
    refetchInterval: 15000,
  });

  const sendMut = useMutation({
    mutationFn: () =>
      isGroup
        ? sendGroupMessage(mandateId, "You", text.trim(), recipientIds)
        : sendEmployeeMessage(mandateId, recipientIds[0], "You", text.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["employeeMessages", mandateId],
      });
      setText("");
      toast({
        title: "Message sent",
        description: isGroup
          ? `Sent to ${recipientIds.length} people — they can all reply here`
          : `Sent to ${nameOf(recipientIds[0])}`,
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
    // Only tracks a mention actively being typed at the very end of the
    // text — "@" then a name right where the cursor is.
    const match = value.match(/@(\w*)$/);
    if (match) {
      setMentionOpen(true);
      setMentionQuery(match[1].toLowerCase());
    } else {
      setMentionOpen(false);
    }
  };

  const pickMention = (m: { id: string; name: string }) => {
    setText((t) =>
      t.replace(/@(\w*)$/, m.id === EVERYONE ? "@everyone " : `@${m.name} `),
    );
    if (m.id === EVERYONE) setRecipientIds(teamMembers.map((x) => x.id));
    else setRecipientIds((cur) => (cur.includes(m.id) ? cur : [...cur, m.id]));
    setMentionOpen(false);
    textareaRef.current?.focus();
  };

  const mentionOptions = [
    ...(teamMembers.length > 1 ? [{ id: EVERYONE, name: "everyone" }] : []),
    ...teamMembers,
  ].filter((m) => m.name.toLowerCase().includes(mentionQuery));

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Pick one person for a private conversation, or several (or everyone) to
        start a group thread — everyone you pick gets the message and can reply
        to the whole group. You can also type <strong>@</strong> to add people.
      </p>

      {!teamMembers.length && (
        <p className="rounded border border-dashed p-3 text-xs text-muted-foreground">
          No team members on this mandate yet — assign a team or a task first.
        </p>
      )}

      {teamMembers.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant={allSelected ? "default" : "outline"}
            className="h-7 text-xs"
            onClick={toggleEveryone}
          >
            <Users className="mr-1 h-3 w-3" /> Everyone
          </Button>
          {teamMembers.map((m) => (
            <Button
              key={m.id}
              type="button"
              size="sm"
              variant={recipientIds.includes(m.id) ? "default" : "outline"}
              className="h-7 text-xs"
              onClick={() => toggle(m.id)}
            >
              {m.name}
            </Button>
          ))}
        </div>
      )}

      {recipientIds.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {isGroup ? "Group conversation with" : "Conversation with"}
            </span>
            {recipientIds.map((id) => (
              <Badge key={id} variant="outline" className="gap-1">
                <AtSign className="h-3 w-3" />
                {nameOf(id)}
                <button
                  type="button"
                  aria-label={`Remove ${nameOf(id)}`}
                  onClick={() => toggle(id)}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
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
            placeholder="Write a message — type @ to add people or @everyone…"
            className="min-h-[60px]"
          />
          {mentionOpen && mentionOptions.length > 0 && (
            <div className="absolute z-10 mt-1 w-64 rounded-md border bg-popover shadow-md">
              {mentionOptions.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => pickMention(m)}
                >
                  {m.id === EVERYONE ? (
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <AtSign className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  {m.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button
          disabled={!recipientIds.length || sendMut.isPending || !text.trim()}
          onClick={() => sendMut.mutate()}
          className="self-end"
        >
          <Send className="mr-2 h-4 w-4" /> Send
        </Button>
      </div>
    </div>
  );
}
