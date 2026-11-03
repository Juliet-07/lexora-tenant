import { useQuery } from "@tanstack/react-query";
import {
  Archive,
  BadgeCheck,
  BellRing,
  Bot,
  CalendarClock,
  ChevronRight,
  CircleCheck,
  Eye,
  FilePenLine,
  History,
  Inbox,
  LayoutTemplate,
  Loader2,
  Megaphone,
  MessageCircleQuestion,
  Plus,
  RadioTower,
  Send,
  Sparkles,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchNoticeOverview,
  type NoticeOverview,
} from "@/lib/hr/hr-notices-api";
import { NOTICE_KEY } from "./noticeActions";
import {
  Bar,
  Chip,
  Empty,
  PriorityChip,
  ackColor,
  daysUntil,
  dayWord,
  initials,
  rel,
} from "./noticeUi";

const ATTENTION: Record<
  NoticeOverview["attention"][number]["kind"],
  { icon: LucideIcon; cls: string; action: string }
> = {
  overdue: {
    icon: TriangleAlert,
    cls: "bg-destructive/10 text-destructive",
    action: "Open",
  },
  question: {
    icon: MessageCircleQuestion,
    cls: "bg-purple-500/10 text-purple-600",
    action: "Reply",
  },
  scheduled: {
    icon: CalendarClock,
    cls: "bg-blue-500/10 text-blue-600",
    action: "Review",
  },
  draft: {
    icon: FilePenLine,
    cls: "bg-muted text-muted-foreground",
    action: "Continue",
  },
};

function Kpi({
  icon: I,
  label,
  value,
  sub,
  color,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden rounded-xl border bg-card p-4 text-left shadow-sm transition hover:shadow-md"
    >
      <span
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: color }}
      />
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <I className="h-4 w-4" style={{ color }} />
        {label}
      </span>
      <span className="mt-2 block text-3xl font-bold tabular-nums">
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{sub}</span>
    </button>
  );
}

function Seal({ value }: { value: number }) {
  const R = 32;
  const C = 2 * Math.PI * R;
  return (
    <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90">
      <circle
        cx="40"
        cy="40"
        r={R}
        fill="none"
        strokeWidth="8"
        className="stroke-muted"
      />
      <circle
        cx="40"
        cy="40"
        r={R}
        fill="none"
        strokeWidth="8"
        strokeLinecap="round"
        stroke="#b8860b"
        strokeDasharray={`${(value / 100) * C} ${C}`}
      />
      <g transform="rotate(90 40 40)">
        <text
          x="40"
          y="43"
          textAnchor="middle"
          fontWeight="800"
          fontSize="16"
          className="fill-foreground"
        >
          {value}%
        </text>
        <text
          x="40"
          y="55"
          textAnchor="middle"
          fontSize="7"
          className="fill-muted-foreground"
        >
          complied
        </text>
      </g>
    </svg>
  );
}

export function NoticesOverview({
  onCompose,
  onGo,
  onOpen,
  onEditDraft,
}: {
  onCompose: () => void;
  onGo: (view: string) => void;
  onOpen: (id: string, tab?: string) => void;
  onEditDraft: (id: string) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: [NOTICE_KEY, "overview"],
    queryFn: fetchNoticeOverview,
  });
  if (isLoading || !data)
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading overview…
      </div>
    );
  const { kpis, compliance, inProgress, attention, engagement, channelMix } =
    data;
  const chTotal = Object.values(channelMix).reduce((a, b) => a + b, 0);
  const chPct = (k: string) =>
    chTotal ? Math.round(((channelMix[k] ?? 0) / chTotal) * 100) : 0;
  const R = 54;
  const C = 2 * Math.PI * R;
  const colors: Record<string, string> = { inapp: "#3b36db", email: "#b8860b" };
  const labels: Record<string, string> = {
    inapp: "Employee portal",
    email: "Email",
  };
  let acc = 0;

  const attentionClick = (a: NoticeOverview["attention"][number]) =>
    a.kind === "draft"
      ? onEditDraft(a.noticeId)
      : onOpen(a.noticeId, a.kind === "question" ? "questions" : "overview");

  return (
    <div className="space-y-4">
      <section className="relative grid gap-6 overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-secondary/10 p-6 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            <Megaphone className="h-4 w-4 text-primary" />
            {new Date().toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            <Chip tone="purple" className="normal-case tracking-normal">
              Communications hub
            </Chip>
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">
            Notices and communications
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Publish notices and policies to the employee portal, where staff
            read, review and acknowledge them, and keep a complete record of
            what every employee received and confirmed.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={onCompose}>
              <Plus className="mr-2 h-4 w-4" />
              New notice
            </Button>
            <Button variant="outline" onClick={() => onGo("tracker")}>
              <BadgeCheck className="mr-2 h-4 w-4" />
              Track acknowledgements
            </Button>
            <Button variant="outline" onClick={() => onGo("notices")}>
              <Archive className="mr-2 h-4 w-4" />
              Notice register
            </Button>
            <Button variant="outline" onClick={() => onGo("templates")}>
              <LayoutTemplate className="mr-2 h-4 w-4" />
              Templates
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border bg-card/70 p-4">
          <Seal value={kpis.acknowledgementRate} />
          <div>
            <h4 className="text-sm font-semibold">
              Acknowledgement compliance
            </h4>
            <p className="mt-1 text-xs text-muted-foreground">
              {compliance.received} of {compliance.required} required
              acknowledgements received across {compliance.activeNotices} active
              notices.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => onGo("tracker")}
            >
              {kpis.overdue} overdue{" "}
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={Send}
          label="Notices sent, last 30 days"
          value={kpis.sentLast30Days}
          sub={`${kpis.scheduled} scheduled, ${kpis.drafts} drafts`}
          color="#3b36db"
          onClick={() => onGo("notices")}
        />
        <Kpi
          icon={Eye}
          label="Average read rate"
          value={`${kpis.averageReadRate}%`}
          sub={`${kpis.opened} of ${kpis.delivered} deliveries opened`}
          color="#6d28d9"
          onClick={() => onGo("notices")}
        />
        <Kpi
          icon={BadgeCheck}
          label="Acknowledgement rate"
          value={`${kpis.acknowledgementRate}%`}
          sub={`${kpis.stillOutstanding} still outstanding`}
          color="#b8860b"
          onClick={() => onGo("tracker")}
        />
        <Kpi
          icon={TriangleAlert}
          label="Overdue acknowledgements"
          value={kpis.overdue}
          sub="Past their deadline"
          color={kpis.overdue ? "#c62828" : "#059669"}
          onClick={() => onGo("tracker")}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <BadgeCheck className="h-4 w-4 text-amber-600" />
              Acknowledgements in progress
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={() => onGo("tracker")}>
              Open tracker <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {inProgress.length ? (
              inProgress.map((n) => {
                const dl = daysUntil(n.deadline);
                return (
                  <button
                    key={n.id}
                    onClick={() => onOpen(n.id)}
                    className="flex w-full items-center gap-4 rounded-lg px-2 py-3 text-left hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold">
                          {n.title}
                        </span>
                        <PriorityChip priority={n.priority} />
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {n.acknowledged} of {n.total} acknowledged ·{" "}
                        {n.deadline ? (
                          dl < 0 ? (
                            <span className="font-semibold text-destructive">
                              {dayWord(-dl)} past deadline
                            </span>
                          ) : dl === 0 ? (
                            "Due today"
                          ) : (
                            `Due in ${dayWord(dl)}`
                          )
                        ) : (
                          "No deadline"
                        )}
                      </div>
                    </div>
                    <Bar
                      value={n.rate}
                      color={ackColor(n.rate)}
                      className="w-48"
                    />
                  </button>
                );
              })
            ) : (
              <Empty icon={CircleCheck} title="Every acknowledgement is in">
                No active notices are waiting on staff.
              </Empty>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <BellRing className="h-4 w-4 text-destructive" />
              Needs your attention
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {attention.length} items
            </span>
          </CardHeader>
          <CardContent className="max-h-[340px] overflow-auto">
            {attention.length ? (
              attention.map((a, i) => {
                const m = ATTENTION[a.kind];
                return (
                  <div key={i} className="flex items-center gap-3 py-2.5">
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${m.cls}`}
                    >
                      <m.icon className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-medium">{a.text}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {a.title}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => attentionClick(a)}
                    >
                      {m.action}
                    </Button>
                  </div>
                );
              })
            ) : (
              <Empty icon={Inbox} title="Nothing needs attention" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Engagement by notice
            </CardTitle>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <i className="h-2 w-2 rounded-sm bg-[#3b36db]" />
                Read
              </span>
              <span className="flex items-center gap-1">
                <i className="h-2 w-2 rounded-sm bg-[#b8860b]" />
                Acknowledged
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {engagement.length ? (
              <>
                <div className="flex h-40 items-end gap-3 border-b">
                  {engagement.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => onOpen(n.id)}
                      title={`${n.title}: read ${n.readRate}%, acknowledged ${n.ackRate === null ? "not required" : n.ackRate + "%"}`}
                      className="flex h-full flex-1 items-end justify-center gap-1"
                    >
                      <div
                        className="w-3 rounded-t bg-[#3b36db]"
                        style={{ height: `${n.readRate}%` }}
                      />
                      <div
                        className="w-3 rounded-t bg-[#b8860b]"
                        style={{ height: `${n.ackRate ?? 0}%` }}
                      />
                    </button>
                  ))}
                </div>
                <div className="mt-1 flex gap-3 text-center text-[11px] text-muted-foreground">
                  {engagement.map((n) => (
                    <span key={n.id} className="flex-1">
                      {n.ref.replace("NTC-", "#")}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Most recent notices sent. Select a bar to open the notice.
                </p>
              </>
            ) : (
              <Empty icon={Send} title="No notices sent yet" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RadioTower className="h-4 w-4 text-purple-600" />
              Where staff open notices
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-5">
            <svg width="140" height="140" viewBox="0 0 140 140">
              {Object.entries(channelMix).map(([k, v]) => {
                const len = chTotal ? (C * v) / chTotal : 0;
                const el = (
                  <circle
                    key={k}
                    cx="70"
                    cy="70"
                    r={R}
                    fill="none"
                    stroke={colors[k] ?? "#64748b"}
                    strokeWidth="16"
                    strokeDasharray={`${len} ${C - len}`}
                    strokeDashoffset={-acc}
                    transform="rotate(-90 70 70)"
                  />
                );
                acc += len;
                return el;
              })}
              <text
                x="70"
                y="68"
                textAnchor="middle"
                fontWeight="800"
                fontSize="20"
                className="fill-foreground"
              >
                {chPct("inapp")}%
              </text>
              <text
                x="70"
                y="86"
                textAnchor="middle"
                fontSize="11"
                className="fill-muted-foreground"
              >
                from portal
              </text>
            </svg>
            <div className="flex-1 space-y-2 text-sm">
              {Object.keys(channelMix).map((k) => (
                <div key={k} className="flex items-center gap-2">
                  <i
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ background: colors[k] }}
                  />
                  <span className="flex-1">{labels[k] ?? k}</span>
                  <b className="tabular-nums">{chPct(k)}%</b>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Recent activity
          </CardTitle>
          <Button size="sm" variant="ghost" onClick={() => onGo("notices")}>
            View register <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent>
          {data.recentActivity.length ? (
            data.recentActivity.map((f) => (
              <button
                key={f.id}
                onClick={() => onOpen(f.noticeId, "activity")}
                className="flex w-full items-center gap-3 rounded-lg px-1.5 py-2.5 text-left hover:bg-muted/50"
              >
                {f.system ? (
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-700 text-white">
                    <Bot className="h-3.5 w-3.5" />
                  </span>
                ) : (
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {initials(f.actorName)}
                  </span>
                )}
                <div className="min-w-0 flex-1 text-sm">
                  <span className="font-semibold">
                    {f.system ? "Lexora" : f.actorName}
                  </span>{" "}
                  {f.text.charAt(0).toLowerCase() + f.text.slice(1)}
                  <div className="truncate text-xs text-muted-foreground">
                    {f.noticeTitle}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {rel(f.at)}
                </span>
              </button>
            ))
          ) : (
            <Empty icon={History} title="No activity yet" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
