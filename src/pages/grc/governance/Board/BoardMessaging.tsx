import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Send, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchBoardMembers,
  fetchBoardMessageThreads,
  fetchBoardMessageThread,
  sendBoardMessage,
  type BoardMember,
} from "@/lib/grc/governance-api";

/**
 * Board Messaging — direct chat between the tenant (company secretary /
 * management) and real board members, backed by lexora-engine's Board
 * Directory messaging feature (grc/governance/board-messages). No
 * realtime push on this app yet, so the thread list and open thread
 * both poll — see refetchInterval below.
 */

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const formatTime = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" }) +
        " " +
        d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export default function BoardMessaging() {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const membersQuery = useQuery({
    queryKey: ["board-members-for-messaging"],
    queryFn: fetchBoardMembers,
  });
  const boardMembers = useMemo(
    () =>
      (membersQuery.data ?? []).filter(
        (m) => m.lifecycleStatus !== "Offboarded",
      ),
    [membersQuery.data],
  );

  const threadsQuery = useQuery({
    queryKey: ["board-message-threads"],
    queryFn: fetchBoardMessageThreads,
    refetchInterval: 30_000,
  });
  const threadsByCounterpart = useMemo(() => {
    const map = new Map<
      string,
      { lastMessage: string; lastAt: string; unreadCount: number }
    >();
    for (const t of threadsQuery.data ?? []) {
      map.set(t.counterpartId, t);
    }
    return map;
  }, [threadsQuery.data]);

  // Default to the first board member once the directory has loaded.
  useEffect(() => {
    if (!activeId && boardMembers.length > 0) {
      setActiveId(boardMembers[0]._id);
    }
  }, [activeId, boardMembers]);

  const threadQuery = useQuery({
    queryKey: ["board-message-thread", activeId],
    queryFn: () => fetchBoardMessageThread(activeId as string),
    enabled: !!activeId,
    refetchInterval: 15_000,
  });
  const activeMessages = threadQuery.data ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeId, activeMessages.length]);

  const openThread = (id: string) => {
    setActiveId(id);
    // The GET already marked the member's messages read server-side —
    // refresh the thread list so the unread badge clears immediately
    // rather than waiting on the next poll.
    queryClient.invalidateQueries({ queryKey: ["board-message-threads"] });
  };

  const threads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return boardMembers
      .filter(
        (m) =>
          !q ||
          m.name.toLowerCase().includes(q) ||
          m.role.toLowerCase().includes(q),
      )
      .map((m) => {
        const t = threadsByCounterpart.get(m._id);
        return { member: m, last: t, unread: t?.unreadCount ?? 0 };
      });
  }, [boardMembers, search, threadsByCounterpart]);

  const activeMember: BoardMember | undefined = boardMembers.find(
    (m) => m._id === activeId,
  );

  const sendMut = useMutation({
    mutationFn: () => sendBoardMessage(activeId as string, draft.trim()),
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({
        queryKey: ["board-message-thread", activeId],
      });
      queryClient.invalidateQueries({ queryKey: ["board-message-threads"] });
    },
    onError: () =>
      toast("Failed to send message.", { description: "Try again." }),
  });

  const send = () => {
    if (!activeId || !draft.trim()) return;
    sendMut.mutate();
  };

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Board Messaging
        </h1>
        <p className="text-sm text-muted-foreground">
          Secure message channel between management and board members.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* Thread list */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search board members…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-[520px]">
              {membersQuery.isLoading && (
                <p className="p-4 text-sm text-muted-foreground">Loading…</p>
              )}
              {!membersQuery.isLoading &&
                threads.map(({ member, last, unread }) => (
                  <button
                    key={member._id}
                    onClick={() => openThread(member._id)}
                    className={cn(
                      "flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-muted/50",
                      member._id === activeId && "bg-accent",
                    )}
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs">
                        {initials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">
                          {member.name}
                        </p>
                        {last && (
                          <span className="flex-none text-[10px] text-muted-foreground">
                            {formatTime(last.lastAt)}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {member.role}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {last ? last.lastMessage : "No messages yet"}
                      </p>
                    </div>
                    {unread > 0 && (
                      <Badge className="ml-1 flex-none rounded-full px-1.5 text-[10px]">
                        {unread}
                      </Badge>
                    )}
                  </button>
                ))}
              {!membersQuery.isLoading && !threads.length && (
                <p className="p-4 text-sm text-muted-foreground">
                  No board members match your search.
                </p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Conversation */}
        <Card className="flex flex-col">
          {!activeMember ? (
            <CardContent className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
              {membersQuery.isLoading
                ? "Loading…"
                : "No active board members to message yet."}
            </CardContent>
          ) : (
            <>
              <CardHeader className="border-b pb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs">
                      {initials(activeMember.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">
                      {activeMember.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {activeMember.role}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col p-0">
                <ScrollArea className="h-[420px] p-4">
                  <div className="space-y-3">
                    {threadQuery.isLoading && (
                      <p className="py-16 text-center text-sm text-muted-foreground">
                        Loading…
                      </p>
                    )}
                    {!threadQuery.isLoading && !activeMessages.length && (
                      <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
                        <MessageSquare className="h-8 w-8" />
                        <p className="text-sm">
                          No messages yet. Start the conversation below.
                        </p>
                      </div>
                    )}
                    {activeMessages.map((m) => (
                      <div
                        key={m.id}
                        className={cn(
                          "flex",
                          m.fromMe ? "justify-end" : "justify-start",
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                            m.fromMe
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted",
                          )}
                        >
                          <p className="mb-0.5 text-[11px] font-medium opacity-80">
                            {m.fromMe ? "You" : activeMember.name}
                          </p>
                          <p className="whitespace-pre-wrap">{m.body}</p>
                          <p className="mt-1 text-right text-[10px] opacity-70">
                            {formatTime(m.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={bottomRef} />
                  </div>
                </ScrollArea>
                <div className="flex gap-2 border-t p-3">
                  <Textarea
                    placeholder={`Message ${activeMember.name}…`}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    className="min-h-[44px] flex-1"
                  />
                  <Button
                    onClick={send}
                    disabled={!draft.trim() || sendMut.isPending}
                    className="self-end"
                  >
                    <Send className="mr-2 h-4 w-4" /> Send
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
