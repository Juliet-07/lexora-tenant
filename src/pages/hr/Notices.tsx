import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  errMessage,
  fetchNotice,
  fetchNoticeMeta,
  fetchNoticeTracker,
  fetchNotices,
  type NoticeGroup,
  type NoticeTemplate,
} from "@/lib/hr/hr-notices-api";
import { NOTICE_KEY } from "@/components/hr/notices/noticeActions";
import {
  NoticeCompose,
  blankForm,
  formFromDetail,
  type ComposeForm,
} from "@/components/hr/notices/NoticeCompose";
import { NoticeDrawer } from "@/components/hr/notices/NoticeDrawer";
import { NoticesOverview } from "@/components/hr/notices/NoticesOverview";
import { NoticesRegister } from "@/components/hr/notices/NoticesRegister";
import { AckTracker } from "@/components/hr/notices/AckTracker";
import {
  NoticeGroups,
  NoticeSettingsPanel,
  NoticeTemplates,
} from "@/components/hr/notices/NoticeLibrary";

const VIEWS: [string, string][] = [
  ["overview", "Overview"],
  ["notices", "Notice register"],
  ["tracker", "Acknowledgements"],
  ["templates", "Templates"],
  ["groups", "Audience groups"],
  ["settings", "Settings"],
];

/**
 * HR → Notices & Comms. One page, several views kept in the URL
 * (?view=tracker) so a refresh or a shared link lands in the same place.
 */
export default function HRNotices() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const view = params.get("view") || "overview";
  const [compose, setCompose] = useState<ComposeForm | null>(null);
  const [drawer, setDrawer] = useState<{ id: string; tab: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  const { data: meta } = useQuery({
    queryKey: [NOTICE_KEY, "meta"],
    queryFn: fetchNoticeMeta,
  });
  // Overdue count badge on the tracker tab
  const { data: tracker } = useQuery({
    queryKey: [
      NOTICE_KEY,
      "tracker",
      { noticeId: "all", dept: "all", status: "all" },
    ],
    queryFn: () =>
      fetchNoticeTracker({ noticeId: "all", dept: "all", status: "all" }),
    staleTime: 30_000,
  });

  const go = (v: string) => {
    setCompose(null);
    setParams(v === "overview" ? {} : { view: v });
    window.scrollTo({ top: 0 });
  };
  const open = (id: string, tab = "overview") => setDrawer({ id, tab });

  const startNew = (tpl?: NoticeTemplate | null) => {
    if (!meta) return;
    setDrawer(null);
    setCompose(blankForm(meta, tpl));
    setParams({ view: "compose" });
    window.scrollTo({ top: 0 });
  };

  const startFrom = async (
    id: string,
    mode: "edit" | "revise" | "duplicate",
  ) => {
    setBusy(true);
    try {
      const d = await fetchNotice(id);
      setDrawer(null);
      setCompose(formFromDetail(d, mode));
      setParams({ view: "compose" });
      window.scrollTo({ top: 0 });
    } catch (e) {
      toast({ title: errMessage(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const messageGroup = (g: NoticeGroup) => {
    if (!meta) return;
    const f = blankForm(meta);
    f.audience = { type: "group", values: [g.id] };
    setCompose(f);
    setParams({ view: "compose" });
  };

  const openByRef = async (ref: string) => {
    try {
      const r = await fetchNotices({ search: ref });
      const hit = r.items.find((n) => n.ref === ref);
      if (hit) open(hit.id);
      else toast({ title: `${ref} could not be found` });
    } catch (e) {
      toast({ title: errMessage(e), variant: "destructive" });
    }
  };

  const closeCompose = () => {
    setCompose(null);
    setParams({ view: "notices" });
  };

  if (!meta)
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading notices…
      </div>
    );

  const inCompose = view === "compose";
  const overdue = tracker?.kpis.overdue ?? 0;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-muted-foreground">
          Lexora HR › Notices &amp; Comms
          {view !== "overview" && !inCompose
            ? ` › ${VIEWS.find(([k]) => k === view)?.[1] ?? ""}`
            : inCompose
              ? " › Compose"
              : ""}
        </p>
        <h1 className="text-2xl font-bold">
          {inCompose
            ? "Compose notice"
            : VIEWS.find(([k]) => k === view)?.[1] === "Overview"
              ? "Notices & Comms"
              : (VIEWS.find(([k]) => k === view)?.[1] ?? "Notices & Comms")}
        </h1>
      </div>

      {!inCompose && (
        <div className="flex gap-1 overflow-x-auto border-b">
          {VIEWS.map(([k, l]) => (
            <button
              key={k}
              onClick={() => go(k)}
              className={`-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium ${
                view === k
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {l}
              {k === "tracker" && overdue > 0 && (
                <span className="rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-destructive-foreground">
                  {overdue}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {busy && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/40">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {inCompose ? (
        <NoticeCompose
          // A new key resets the form whenever a different draft is opened
          key={compose?.id ?? compose?.revisionOf ?? "new"}
          initial={compose ?? blankForm(meta)}
          meta={meta}
          onClose={closeCompose}
          onSent={(n) => {
            qc.invalidateQueries({ queryKey: [NOTICE_KEY] });
            setCompose(null);
            setParams({ view: "notices" });
            open(n.id);
          }}
          onGoGroups={() => go("groups")}
        />
      ) : (
        <>
          {view === "overview" && (
            <NoticesOverview
              onCompose={() => startNew()}
              onGo={go}
              onOpen={open}
              onEditDraft={(id) => startFrom(id, "edit")}
            />
          )}
          {view === "notices" && (
            <NoticesRegister
              onCompose={() => startNew()}
              onOpen={open}
              onEdit={(id) => startFrom(id, "edit")}
              onRevise={(id) => startFrom(id, "revise")}
              onDuplicate={(id) => startFrom(id, "duplicate")}
            />
          )}
          {view === "tracker" && <AckTracker onOpen={open} />}
          {view === "templates" && (
            <NoticeTemplates onUse={(t) => startNew(t)} />
          )}
          {view === "groups" && <NoticeGroups onMessage={messageGroup} />}
          {view === "settings" && <NoticeSettingsPanel />}
        </>
      )}

      <NoticeDrawer
        id={drawer?.id ?? null}
        tab={drawer?.tab ?? "overview"}
        onTab={(t) => drawer && setDrawer({ ...drawer, tab: t })}
        onClose={() => setDrawer(null)}
        onEdit={(id) => startFrom(id, "edit")}
        onRevise={(id) => startFrom(id, "revise")}
        onDuplicate={(id) => startFrom(id, "duplicate")}
        onOpenOther={openByRef}
      />
    </div>
  );
}
