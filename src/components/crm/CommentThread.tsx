import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { useToast } from "@/hooks/use-toast";
import {
  fetchCommentThread,
  addComment,
  editComment,
  deleteComment,
  toggleReaction,
  fetchMentionDirectory,
  type CommentNode,
  type CommentSubjectType,
} from "@/lib/crm/tools-api";

const REACTIONS = ["👍", "✅", "👀", "🚩", "🔥", "❓"];
const AUTHOR_STORAGE_KEY = "lexora-comment-author-name";

const initials = (n: string) =>
  n
    .split(/[\s-]/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

type MentionEntry = { name: string; role: string };

/** Renders comment text with @mentions as clickable profile cards. */
export function MentionText({
  body,
  directory,
}: {
  body: string;
  directory: MentionEntry[];
}) {
  const parts = useMemo(() => {
    if (!directory.length) return [body];
    const names = directory.map((t) => t.name);
    const rx = new RegExp(
      `@(${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
      "g",
    );
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
  }, [body, directory]);

  return (
    <span className="whitespace-pre-wrap text-sm">
      {parts.map((p, i) =>
        typeof p === "string" ? (
          <span key={i}>{p}</span>
        ) : (
          <MentionChip key={i} name={p.mention} directory={directory} />
        ),
      )}
    </span>
  );
}

function MentionChip({
  name,
  directory,
}: {
  name: string;
  directory: MentionEntry[];
}) {
  const member = directory.find((t) => t.name === name);
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
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Composer({
  placeholder,
  onSubmit,
  autoFocus,
  directory,
}: {
  placeholder: string;
  onSubmit: (body: string) => void;
  autoFocus?: boolean;
  directory: MentionEntry[];
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
      {showMentions && directory.length > 0 && (
        <Card>
          <CardContent className="max-h-44 overflow-auto p-1">
            {directory.map((t) => (
              <button
                key={t.name}
                onClick={() => insert(t.name)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                <span className="font-medium">@{t.name}</span>
                <span className="text-xs text-muted-foreground">{t.role}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Paperclip className="h-3 w-3" /> Markdown supported. Type @ to
          mention.
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
  currentAuthor,
  directory,
  depth = 0,
}: {
  node: CommentNode;
  onReply: (id: string, body: string) => void;
  onReact: (id: string, emoji: string) => void;
  onEdit: (id: string, body: string) => void;
  onDelete: (id: string) => void;
  currentAuthor: string;
  directory: MentionEntry[];
  depth?: number;
}) {
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(node.body);
  const mine = !!currentAuthor && node.author === currentAuthor;

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
              {new Date(node.createdAt).toLocaleString()}
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
                    onEdit(node._id, draft);
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
            <MentionText body={node.body} directory={directory} />
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
                      onClick={() => onReact(node._id, r)}
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
                    onClick={() => onDelete(node._id)}
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
                directory={directory}
                onSubmit={(b) => {
                  onReply(node._id, b);
                  setReplying(false);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {node.replies.map((r) => (
        <CommentItem
          key={r._id}
          node={r}
          depth={depth + 1}
          currentAuthor={currentAuthor}
          directory={directory}
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
 * Shared collaboration component: real threaded comments, @mentions
 * with profile cards (from the real employee directory), reactions,
 * edit/delete. Consumed by Contracts today; mandates, tasks,
 * tickets, documents and ADR cases can adopt it the same way.
 */
export function CommentThread({
  subject,
  subjectType,
}: {
  subject: string;
  subjectType: CommentSubjectType;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [authorName, setAuthorName] = useState(
    () => localStorage.getItem(AUTHOR_STORAGE_KEY) ?? "",
  );
  const saveAuthorName = (v: string) => {
    setAuthorName(v);
    localStorage.setItem(AUTHOR_STORAGE_KEY, v);
  };

  const { data: nodes = [] } = useQuery({
    queryKey: ["comment-thread", subjectType, subject],
    queryFn: () => fetchCommentThread(subjectType, subject),
    enabled: !!subject,
  });
  const { data: directory = [] } = useQuery({
    queryKey: ["mention-directory"],
    queryFn: fetchMentionDirectory,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["comment-thread", subjectType, subject],
    });

  const notifyMentions = (body: string) => {
    const names = directory
      .map((t) => t.name)
      .filter((n) => body.includes(`@${n}`));
    if (names.length)
      toast({
        title: "Mentioned",
        description: `${names.join(", ")} mentioned in this comment.`,
      });
  };

  const addMut = useMutation({
    mutationFn: (vars: { body: string; parentId?: string }) =>
      addComment(subjectType, subject, {
        author: authorName,
        body: vars.body,
        parentId: vars.parentId,
      }),
    onSuccess: (_, vars) => {
      invalidate();
      notifyMentions(vars.body);
    },
    onError: () =>
      toast({ title: "Failed to post comment", variant: "destructive" }),
  });
  const editMut = useMutation({
    mutationFn: (vars: { id: string; body: string }) =>
      editComment(vars.id, vars.body),
    onSuccess: invalidate,
    onError: () =>
      toast({ title: "Failed to edit comment", variant: "destructive" }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteComment(id),
    onSuccess: invalidate,
    onError: () =>
      toast({ title: "Failed to delete comment", variant: "destructive" }),
  });
  const reactMut = useMutation({
    mutationFn: (vars: { id: string; emoji: string }) =>
      toggleReaction(vars.id, vars.emoji, authorName),
    onSuccess: invalidate,
    onError: () => toast({ title: "Failed to react", variant: "destructive" }),
  });

  const threadCount = (list: CommentNode[]): number =>
    list.reduce((s, n) => s + 1 + threadCount(n.replies), 0);

  if (!authorName) {
    return (
      <div className="space-y-2 rounded-lg border p-3">
        <h4 className="text-sm font-semibold">Discussion</h4>
        <p className="text-xs text-muted-foreground">
          Enter your name once to comment — it's remembered on this device.
        </p>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded border bg-background px-2 py-1 text-sm"
            placeholder="Your name"
            onKeyDown={(e) => {
              if (e.key === "Enter")
                saveAuthorName((e.target as HTMLInputElement).value.trim());
            }}
          />
          <Button
            size="sm"
            onClick={(e) => {
              const input = e.currentTarget.previousSibling as HTMLInputElement;
              saveAuthorName(input.value.trim());
            }}
          >
            Set
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-semibold">Discussion</h4>
        <Badge variant="secondary" className="text-xs">
          {threadCount(nodes)} comments
        </Badge>
        <button
          className="ml-auto text-xs text-muted-foreground underline"
          onClick={() => saveAuthorName("")}
        >
          Not {authorName}?
        </button>
      </div>
      <div className="divide-y rounded-lg border px-3">
        {nodes.map((n) => (
          <CommentItem
            key={n._id}
            node={n}
            currentAuthor={authorName}
            directory={directory}
            onReply={(id, body) => addMut.mutate({ body, parentId: id })}
            onReact={(id, emoji) => reactMut.mutate({ id, emoji })}
            onEdit={(id, body) => editMut.mutate({ id, body })}
            onDelete={(id) => deleteMut.mutate(id)}
          />
        ))}
        {!nodes.length && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No comments yet.
          </p>
        )}
      </div>
      <Composer
        placeholder="Add a comment… type @ to mention"
        directory={directory}
        onSubmit={(body) => addMut.mutate({ body })}
      />
    </div>
  );
}

/** Unified activity stream (Section 9.3). */
export function ActivityLog({
  entries,
}: {
  entries: {
    id: string;
    at: string;
    actor: string;
    type: string;
    text: string;
  }[];
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
