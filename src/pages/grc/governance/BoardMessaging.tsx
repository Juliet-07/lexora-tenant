import { useMemo, useRef, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Send, MessageSquare, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Board Messaging — direct chat between the tenant (company secretary /
 * management) and board members. Prototype data only, stored locally per
 * tenant under grc_board_messages_v1 until the governance API exposes a
 * messaging endpoint.
 */

interface BoardMember {
  id: string;
  name: string;
  role: string;
  online: boolean;
}

interface ChatMessage {
  id: string;
  memberId: string;
  direction: "tenant" | "member";
  body: string;
  createdAt: string;
  read: boolean;
}

const STORE_KEY = "grc_board_messages_v1";

const BOARD_MEMBERS: BoardMember[] = [
  { id: "bm-1", name: "Amina Uwase", role: "Board Chair", online: true },
  { id: "bm-2", name: "Jean-Bosco Nsengimana", role: "Independent Director", online: true },
  { id: "bm-3", name: "Clarisse Mukamana", role: "Audit Committee Chair", online: false },
  { id: "bm-4", name: "David Habimana", role: "Non-Executive Director", online: false },
  { id: "bm-5", name: "Grace Ingabire", role: "Risk Committee Chair", online: true },
];

const seedMessages = (): ChatMessage[] => {
  const now = Date.now();
  const h = 3600_000;
  return [
    { id: "m1", memberId: "bm-1", direction: "member", body: "Good morning. Could we get the updated risk appetite statement before Friday's committee call?", createdAt: new Date(now - 26 * h).toISOString(), read: true },
    { id: "m2", memberId: "bm-1", direction: "tenant", body: "Good morning Chair. Yes — the revised draft will be circulated with the board pack tomorrow.", createdAt: new Date(now - 25 * h).toISOString(), read: true },
    { id: "m3", memberId: "bm-1", direction: "member", body: "Perfect, thank you. Please also flag the cybersecurity item for discussion.", createdAt: new Date(now - 24 * h).toISOString(), read: false },
    { id: "m4", memberId: "bm-2", direction: "member", body: "I've reviewed the Q3 management accounts. One question on the receivables ageing — can finance join the next audit committee session?", createdAt: new Date(now - 8 * h).toISOString(), read: false },
    { id: "m5", memberId: "bm-3", direction: "tenant", body: "The external audit engagement letter has been signed and filed in the data room.", createdAt: new Date(now - 50 * h).toISOString(), read: true },
    { id: "m6", memberId: "bm-3", direction: "member", body: "Noted, thanks. I'll review over the weekend.", createdAt: new Date(now - 49 * h).toISOString(), read: true },
    { id: "m7", memberId: "bm-5", direction: "member", body: "The BCP test report looks solid. Suggest we table the failover timings at the next risk committee.", createdAt: new Date(now - 3 * h).toISOString(), read: false },
  ];
};

const loadMessages = (): ChatMessage[] => {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as ChatMessage[];
  } catch {
    /* ignore */
  }
  const seeded = seedMessages();
  localStorage.setItem(STORE_KEY, JSON.stringify(seeded));
  return seeded;
};

const initials = (name: string) =>
  name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

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
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [activeId, setActiveId] = useState<string>(BOARD_MEMBERS[0].id);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(STORE_KEY, JSON.stringify(messages));
  }, [messages]);

  const threads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return BOARD_MEMBERS.filter(
      (m) => !q || m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q),
    ).map((m) => {
      const msgs = messages.filter((x) => x.memberId === m.id);
      const last = msgs[msgs.length - 1];
      const unread = msgs.filter((x) => x.direction === "member" && !x.read).length;
      return { member: m, last, unread };
    });
  }, [messages, search]);

  const activeMember = BOARD_MEMBERS.find((m) => m.id === activeId)!;
  const activeMessages = messages.filter((m) => m.memberId === activeId);

  const openThread = (id: string) => {
    setActiveId(id);
    setMessages((prev) =>
      prev.map((m) => (m.memberId === id && m.direction === "member" ? { ...m, read: true } : m)),
    );
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeId, activeMessages.length]);

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `m-${Date.now()}`,
        memberId: activeId,
        direction: "tenant",
        body,
        createdAt: new Date().toISOString(),
        read: true,
      },
    ]);
    setDraft("");
  };

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Board Messaging</h1>
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
              {threads.map(({ member, last, unread }) => (
                <button
                  key={member.id}
                  onClick={() => openThread(member.id)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-muted/50",
                    member.id === activeId && "bg-accent",
                  )}
                >
                  <div className="relative">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs">{initials(member.name)}</AvatarFallback>
                    </Avatar>
                    <Circle
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                        member.online ? "fill-emerald-500 text-emerald-500" : "fill-muted-foreground/40 text-muted-foreground/40",
                      )}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{member.name}</p>
                      {last && (
                        <span className="flex-none text-[10px] text-muted-foreground">
                          {formatTime(last.createdAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{member.role}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {last ? last.body : "No messages yet"}
                    </p>
                  </div>
                  {unread > 0 && (
                    <Badge className="ml-1 flex-none rounded-full px-1.5 text-[10px]">{unread}</Badge>
                  )}
                </button>
              ))}
              {!threads.length && (
                <p className="p-4 text-sm text-muted-foreground">No board members match your search.</p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Conversation */}
        <Card className="flex flex-col">
          <CardHeader className="border-b pb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="text-xs">{initials(activeMember.name)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-base">{activeMember.name}</CardTitle>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Circle
                    className={cn(
                      "h-2 w-2",
                      activeMember.online ? "fill-emerald-500 text-emerald-500" : "fill-muted-foreground/40 text-muted-foreground/40",
                    )}
                  />
                  {activeMember.role} · {activeMember.online ? "Online" : "Offline"}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col p-0">
            <ScrollArea className="h-[420px] p-4">
              <div className="space-y-3">
                {!activeMessages.length && (
                  <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
                    <MessageSquare className="h-8 w-8" />
                    <p className="text-sm">No messages yet. Start the conversation below.</p>
                  </div>
                )}
                {activeMessages.map((m) => (
                  <div
                    key={m.id}
                    className={cn("flex", m.direction === "tenant" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                        m.direction === "tenant"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted",
                      )}
                    >
                      <p className="mb-0.5 text-[11px] font-medium opacity-80">
                        {m.direction === "tenant" ? "You" : activeMember.name}
                      </p>
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <p className="mt-1 text-right text-[10px] opacity-70">{formatTime(m.createdAt)}</p>
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
              <Button onClick={send} disabled={!draft.trim()} className="self-end">
                <Send className="mr-2 h-4 w-4" /> Send
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
