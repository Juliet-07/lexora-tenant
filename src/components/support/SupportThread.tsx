import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import type { SupportMessage } from "@/lib/support-api";

interface Props {
  messages: SupportMessage[];
  onSend: (body: string) => Promise<unknown> | void;
  sending?: boolean;
  disabled?: boolean;
  disabledNote?: string;
  placeholder?: string;
  /** Extra control on each platform message (e.g. "Share with client"). */
  messageAction?: (m: SupportMessage) => ReactNode;
}

// A conversation with the platform team: their messages on one side, ours on
// the other, and a box to reply.
export function SupportThread({
  messages,
  onSend,
  sending,
  disabled,
  disabledNote,
  placeholder = "Write a reply to the platform team…",
  messageAction,
}: Props) {
  const [body, setBody] = useState("");

  const send = async () => {
    if (!body.trim()) return;
    await onSend(body.trim());
    setBody("");
  };

  return (
    <div className="space-y-3">
      {messages.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No replies yet — the platform team will respond here.
        </p>
      )}
      {messages.map((m) => {
        const platform = m.authorType === "platform";
        return (
          <div
            key={m._id}
            className={`rounded-lg border p-3 ${platform ? "border-primary/30 bg-primary/5" : "bg-card"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{m.authorName}</span>
              <Badge variant="outline" className="text-[10px]">
                {platform ? "Platform team" : "You"}
              </Badge>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm">{m.body}</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {new Date(m.at).toLocaleString()}
              </p>
              {platform && messageAction?.(m)}
            </div>
          </div>
        );
      })}
      {disabled ? (
        <p className="text-xs text-muted-foreground">{disabledNote}</p>
      ) : (
        <div className="space-y-2">
          <Textarea
            rows={3}
            placeholder={placeholder}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="flex justify-end">
            <Button size="sm" disabled={!body.trim() || sending} onClick={send}>
              {sending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Send
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
