import { useMemo, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { Paperclip, Pencil, Trash2, CornerDownRight } from "lucide-react";
import {
  CommentNode,
  seedComments,
  teamDirectory,
} from "@/data/crmPmMockData";
import { useToast } from "@/hooks/use-toast";

const REACTIONS = ["👍", "✅", "👀", "🚩", "🔥", "❓"];
const ME = "Sarah Chen";

const initials = (n: string) =>
  n
    .split(/[\s-]/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const availabilityDot: Record<string, string> = {
  Online: "bg-success",
  Away: "bg-warning",
  DND: "bg-destructive",
  Offline: "bg-muted-foreground",
};

/** Renders comment text with @mentions as clickable profile cards. */
export function MentionText({ body }: { body: string }) {
  const parts = useMemo(() => {
    const names = teamDirectory.map((t) => t.name);
    const rx = new RegExp(`@(${names.join("|")})`, "g");
    const out: (string | { mention: string })[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = rx.exec(body))) {
      if (m.index > last) out.push(body.slice(last, m.index));
      out.push({ mention: m[1] });
      last = m.index + m[0].length;
    }
    if (last < body.length) out.push(body.slice(last));
    return out;
  }, [body]);

  return (
    <span className="whitespace-pre-wrap text-sm">
      {parts.map((p, i) =>
        typeof p === "string" ? (
          <span key={i}>{p}</span>
        ) : (
          <MentionChip key={i} name={p.mention} />
        ),
      )}
    </span>
  );
}

function MentionChip({ name }: { name: string }) {
  const member = teamDirectory.find((t) => t.name === name);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="mx-0.5 rounded bg-primary/10 px-1 font-medium text-primary hover:bg-primary/20">
          @{name}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback>{initials(name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold">{name}</p>
            <p className="text-xs text-muted-foreground">{member?.role}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs">
              <span
                className={`h-2 w-2 rounded-full ${
                  availabilityDot[member?.availability ?? "Offline"]
                }`}
              />
              {member?.availability} · {member?.mandates ?? 0} active mandates
            </p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 text-xs">
            Message
          </Button>
          <Button size="sm" variant="outline" className="flex-1 text-xs">
            Assign task
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Composer({
  placeholder,
  onSubmit,
  autoFocus,
}: {
  placeholder: string;
  onSubmit: (body: string) => void;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  const insert = (name: string) => {
    const next = value.replace(/@[\w-]*$/, `@${name} `);
    setValue(next);
    setShowMentions(false);
    ref.current?.focus();
  };

  return (
    <div className="space-y-2">
      <Textarea
        ref={ref}
        autoFocus={autoFocus}
        rows={2}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          setValue(e.target.value);
          setShowMentions(/@[\w-]*$/.test(e.target.value));
        }}
      />
      {showMentions && (
        <Card>
          <CardContent className="max-h-44 overflow-auto p-1">
            {teamDirectory.map((t) => (
              <button
                key={t.name}
                onClick={() => insert(t.name)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                <span
                  className={`h-2 w-2 rounded-full ${availabilityDot[t.availability]}`}
                />
                <span className="font-medium">@{t.name}</span>
                <span className="text-xs text-muted-foreground">{t.role}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Paperclip className="h-3 w-3" /> Markdown & drag-and-drop attachments
          supported
        </p>
        <Button
          size="sm"
          disabled={!value.trim()}
          onClick={() => {
            onSubmit(value.trim());
            setValue("");
          }}
        >
          Comment
        </Button>
      </div>
    </div>
  );
}

function CommentItem({
  node,
  onReply,
  onReact,
  onEdit,
  onDelete,
  depth = 0,
}: {
  node: CommentNode;
  onReply: (id: string, body: string) => void;
  onReact: (id: string, emoji: string) => void;
  onEdit: (id: string, body: string) => void;
  onDelete: (id: string) => void;
  depth?: number;
}) {
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(node.body);
  const mine = node.author === ME;

  return (
    <div className={depth ? "ml-6 border-l pl-4" : ""}>
      <div className="flex gap-3 py-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">
            {initials(node.author)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{node.author}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(node.at).toLocaleString()}
            </span>
            {node.edited && (
              <span className="text-xs text-muted-foreground">(edited)</span>
            )}
          </div>

          {node.deleted ? (
            <p className="text-sm italic text-muted-foreground">
              This comment was deleted.
            </p>
          ) : editing ? (
            <div className="space-y-2">
              <Textarea
                rows={2}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    onEdit(node.id, draft);
                    setEditing(false);
                  }}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <MentionText body={node.body} />
          )}

          {!node.deleted && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {Object.entries(node.reactions).map(([emoji, users]) =>
                users.length ? (
                  <Popover key={emoji}>
                    <PopoverTrigger asChild>
                      <button className="rounded-full border px-2 py-0.5 text-xs hover:bg-muted">
                        {emoji} {users.length}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 text-xs">
                      {users.join(", ")}
                    </PopoverContent>
                  </Popover>
                ) : null,
              )}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted">
                    + React
                  </button>
                </PopoverTrigger>
                <PopoverContent className="flex w-auto gap-1 p-2">
                  {REACTIONS.map((r) => (
                    <button
                      key={r}
                      className="rounded p-1 text-base hover:bg-muted"
                      onClick={() => onReact(node.id, r)}
                    >
                      {r}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs"
                onClick={() => setReplying((v) => !v)}
              >
                <CornerDownRight className="mr-1 h-3 w-3" /> Reply
              </Button>
              {mine && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs"
                    onClick={() => setEditing(true)}
                  >
                    <Pencil className="mr-1 h-3 w-3" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs text-destructive"
                    onClick={() => onDelete(node.id)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" /> Delete
                  </Button>
                </>
              )}
            </div>
          )}

          {replying && (
            <div className="pt-2">
              <Composer
                autoFocus
                placeholder="Reply… type @ to mention"
                onSubmit={(b) => {
                  onReply(node.id, b);
                  setReplying(false);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {node.replies.map((r) => (
        <CommentItem
          key={r.id}
          node={r}
          depth={depth + 1}
          onReply={onReply}
          onReact={onReact}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

/**
 * Shared collaboration component (Section 9): threaded comments,
 * @mentions with profile cards, reactions, edit/delete, auto-watch.
 * Consumed by mandates, tasks, tickets, documents and ADR cases.
 */
export function CommentThread({ subject }: { subject: string }) {
  const [nodes, setNodes] = useState<CommentNode[]>(() =>
    seedComments(subject),
  );
  const { toast } = useToast();

  const mutate = (
    list: CommentNode[],
    id: string,
    fn: (n: CommentNode) => CommentNode,
  ): CommentNode[] =>
    list.map((n) =>
      n.id === id ? fn(n) : { ...n, replies: mutate(n.replies, id, fn) },
    );

  const notifyMentions = (body: string) => {
    const names = teamDirectory
      .map((t) => t.name)
      .filter((n) => body.includes(`@${n}`));
    if (names.length)
      toast({
        title: "Watchers added",
        description: `${names.join(", ")} mentioned, auto-subscribed and notified.`,
      });
  };

  const add = (body: string) => {
    setNodes((p) => [
      ...p,
      {
        id: `${subject}-${Date.now()}`,
        author: ME,
        at: new Date().toISOString(),
        body,
        reactions: {},
        replies: [],
      },
    ]);
    notifyMentions(body);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-semibold">Discussion</h4>
        <Badge variant="secondary" className="text-xs">
          {nodes.length} threads
        </Badge>
      </div>
      <div className="divide-y rounded-lg border px-3">
        {nodes.map((n) => (
          <CommentItem
            key={n.id}
            node={n}
            onReply={(id, body) => {
              setNodes((p) =>
                mutate(p, id, (n) => ({
                  ...n,
                  replies: [
                    ...n.replies,
                    {
                      id: `${id}-r${Date.now()}`,
                      author: ME,
                      at: new Date().toISOString(),
                      body,
                      reactions: {},
                      replies: [],
                    },
                  ],
                })),
              );
              notifyMentions(body);
            }}
            onReact={(id, emoji) =>
              setNodes((p) =>
                mutate(p, id, (n) => {
                  const users = n.reactions[emoji] ?? [];
                  return {
                    ...n,
                    reactions: {
                      ...n.reactions,
                      [emoji]: users.includes(ME)
                        ? users.filter((u) => u !== ME)
                        : [...users, ME],
                    },
                  };
                }),
              )
            }
            onEdit={(id, body) =>
              setNodes((p) => mutate(p, id, (n) => ({ ...n, body, edited: true })))
            }
            onDelete={(id) =>
              setNodes((p) => mutate(p, id, (n) => ({ ...n, deleted: true })))
            }
          />
        ))}
      </div>
      <Composer placeholder="Add a comment… type @ to mention" onSubmit={add} />
    </div>
  );
}

/** Unified activity stream (Section 9.3). */
export function ActivityLog({
  entries,
}: {
  entries: { id: string; at: string; actor: string; type: string; text: string }[];
}) {
  return (
    <div className="space-y-3">
      {entries.map((e) => (
        <div key={e.id} className="flex gap-3">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-[10px]">
              {initials(e.actor)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm">
              <span className="font-medium">{e.actor}</span> {e.text}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(e.at).toLocaleString()} ·{" "}
              <Badge variant="outline" className="text-[10px]">
                {e.type}
              </Badge>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
