import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchMyCollabMessages,
  sendMyCollabMessage,
  markMyThreadRead,
  fetchMyGroupMessages,
  replyToMyGroup,
  type GroupMessage,
} from "@/lib/crm/mandates-api";

// One group conversation: everyone the tenant addressed sees it, and any of
// them can answer the whole group.
function GroupThread({
  mandateId,
  messages,
}: {
  mandateId: string;
  messages: GroupMessage[];
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const groupId = messages[0].groupId;
  const members = messages[0].recipientNames ?? [];

  const replyMut = useMutation({
    mutationFn: () => replyToMyGroup(mandateId, groupId, "You", text.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["myGroupMessages", mandateId],
      });
      setText("");
      toast({ title: "Reply sent to the group" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to send",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  return (
    <div className="space-y-2 rounded border p-3">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Users className="h-3.5 w-3.5" /> Group: {members.join(", ")}
      </p>
      <div className="max-h-72 space-y-3 overflow-y-auto">
        {messages.map((m) => (
          <div
            key={m._id}
            className={`rounded-lg px-3 py-2 text-sm ${m.direction === "employee" ? "bg-primary/10" : "bg-muted"}`}
          >
            <p className="mb-0.5 text-[11px] font-medium opacity-80">
              {m.author}
              {m.direction === "tenant" && " (owner)"}
            </p>
            <p>{m.body}</p>
            <p className="mt-1 text-[10px] opacity-70">
              {new Date(m.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Textarea
          placeholder="Reply to everyone in this group…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-[52px]"
        />
        <Button
          disabled={replyMut.isPending || !text.trim()}
          onClick={() => replyMut.mutate()}
          className="self-end"
        >
          <Send className="mr-2 h-4 w-4" /> Reply
        </Button>
      </div>
    </div>
  );
}

export function CollaborationTab({ mandateId }: { mandateId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: thread = [], isLoading } = useQuery({
    queryKey: ["myCollabMessages", mandateId],
    queryFn: () => fetchMyCollabMessages(mandateId),
  });
  const [text, setText] = useState("");
  const { data: groupMessages = [] } = useQuery({
    queryKey: ["myGroupMessages", mandateId],
    queryFn: () => fetchMyGroupMessages(mandateId),
    refetchInterval: 15000,
  });
  const groups = Array.from(
    groupMessages.reduce((map, m) => {
      map.set(m.groupId, [...(map.get(m.groupId) ?? []), m]);
      return map;
    }, new Map<string, GroupMessage[]>()),
  ).map(([, msgs]) => msgs);

  // Opening this tab is what "reading" it means — mark read as soon
  // as it mounts, and again whenever a new message arrives while
  // it's already open.
  useEffect(() => {
    markMyThreadRead(mandateId).then(() =>
      queryClient.invalidateQueries({
        queryKey: ["myThreadUnread", mandateId],
      }),
    );
  }, [mandateId, thread.length, queryClient]);

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
      {groups.length > 0 && (
        <div className="space-y-3 pt-2">
          <p className="text-sm font-medium">Group conversations</p>
          {groups.map((msgs) => (
            <GroupThread
              key={msgs[0].groupId}
              mandateId={mandateId}
              messages={msgs}
            />
          ))}
        </div>
      )}
    </div>
  );
}
