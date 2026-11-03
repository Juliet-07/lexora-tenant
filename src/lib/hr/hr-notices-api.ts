import { api } from "../api";

// ─────────────────────────────────────────────────────────────
// HR Notices & Communications — types + API
// ─────────────────────────────────────────────────────────────

export type NoticeStatus = "draft" | "scheduled" | "sent" | "archived";
export type NoticePriority = "normal" | "important" | "critical";
export type NoticeChannel = "inapp" | "email";
export type NoticeAckMethod = "click" | "signature" | "quiz";
export type NoticeReminders = "none" | "daily" | "every2" | "weekly";
export type NoticeAudienceType =
  | "all"
  | "departments"
  | "locations"
  | "types"
  | "individuals"
  | "group"
  | "newjoiners";
export type RecipientStatus =
  "acknowledged" | "overdue" | "pending" | "read" | "unread";

export interface NoticeAudience {
  type: NoticeAudienceType;
  values: string[];
}

export interface NoticeStats {
  total: number;
  opened: number;
  acknowledged: number;
  overdue: number;
  outstanding: number;
  openRate: number;
  ackRate: number;
}

export interface NoticeListItem {
  id: string;
  ref: string;
  title: string;
  category: string;
  priority: NoticePriority;
  summary: string;
  status: NoticeStatus;
  pinned: boolean;
  audience: NoticeAudience;
  audienceLabel: string;
  audienceCount: number;
  sentAt: string | null;
  scheduledFor: string | null;
  createdAt: string;
  requireAck: boolean;
  ackMethod: NoticeAckMethod;
  deadline: string | null;
  attachmentCount: number;
  unansweredQuestions: number;
  stats: NoticeStats;
}

export interface NoticeAttachment {
  name: string;
  size: string;
  url: string | null;
}

export interface EmployeeBrief {
  id: string;
  employeeNumber: string;
  name: string;
  firstName: string;
  email: string;
  role: string;
  dept: string;
  deptId: string | null;
  location: string;
  locationId: string | null;
  employmentType: string;
  managerId: string | null;
}

export interface NoticeQuestion {
  id: string;
  text: string;
  at: string;
  reply: string | null;
  replyAt: string | null;
  replyByName: string | null;
  shared: boolean;
  employee: EmployeeBrief | null;
}

export interface NoticeActivityItem {
  id: string;
  act: string;
  text: string;
  actorName: string;
  system: boolean;
  at: string;
}

export interface NoticeDetail extends NoticeListItem {
  body: string;
  channels: NoticeChannel[];
  quiz: { q: string; options: string[]; answer: number } | null;
  reminders: NoticeReminders;
  escalate: boolean;
  escalateAfter: number;
  expiresAt: string | null;
  attachments: NoticeAttachment[];
  authorName: string;
  revisionOf: string | null;
  templateId: string | null;
  versions: {
    v: number;
    at: string;
    byName: string;
    note: string;
    ref: string | null;
  }[];
  questions: NoticeQuestion[];
  activity: NoticeActivityItem[];
}

export interface NoticeRecipientRow {
  employee: EmployeeBrief;
  status: RecipientStatus;
  deliveredAt: string;
  openedAt: string | null;
  channel: NoticeChannel;
  ackAt: string | null;
  ackMethod: NoticeAckMethod | null;
  signature: string | null;
  offline: boolean;
  offlineMethod: string | null;
  reminders: number;
  lastReminderAt: string | null;
  escalatedAt: string | null;
}

export interface NoticeReceipt {
  reference: string;
  employee: { id: string; name: string; number: string; dept: string };
  notice: { id: string; ref: string; title: string; version: number };
  deliveredAt: string;
  openedAt: string | null;
  acknowledgedAt: string;
  method: NoticeAckMethod;
  signature: string | null;
  offline: boolean;
  offlineMethod: string | null;
  offlineNote: string | null;
  device: string;
  integrityHash: string;
}

export interface NoticeTemplate {
  id: string;
  name: string;
  category: string;
  priority: NoticePriority;
  description: string;
  requireAck: boolean;
  ackMethod: NoticeAckMethod;
  audienceHint: "individuals" | null;
  body: string;
  uses: number;
  custom: boolean;
}

export interface NoticeGroup {
  id: string;
  name: string;
  description: string;
  audience: NoticeAudience;
  rule: string;
  memberCount: number;
  usedIn: number;
}

export interface NoticeSettings {
  senderName: string;
  emailChannel: boolean;
  reminders: NoticeReminders;
  escalateAfter: number;
  quietFrom: string;
  quietTo: string;
  reAck: boolean;
  retention: number;
  footer: string;
  questions: boolean;
  readReceipts: boolean;
}

export interface NoticeMeta {
  categories: string[];
  employeeCount: number;
  departments: { id: string; name: string; count: number }[];
  locations: { id: string; name: string; count: number }[];
  employmentTypes: { value: string; label: string; count: number }[];
  groups: NoticeGroup[];
  templates: NoticeTemplate[];
  settings: NoticeSettings;
}

export interface NoticeOverview {
  kpis: {
    sentLast30Days: number;
    scheduled: number;
    drafts: number;
    averageReadRate: number;
    opened: number;
    delivered: number;
    acknowledgementRate: number;
    stillOutstanding: number;
    overdue: number;
  };
  compliance: { required: number; received: number; activeNotices: number };
  inProgress: {
    id: string;
    ref: string;
    title: string;
    priority: NoticePriority;
    deadline: string | null;
    acknowledged: number;
    total: number;
    rate: number;
  }[];
  attention: {
    kind: "overdue" | "question" | "scheduled" | "draft";
    noticeId: string;
    ref: string;
    title: string;
    text: string;
  }[];
  engagement: {
    id: string;
    ref: string;
    title: string;
    readRate: number;
    ackRate: number | null;
  }[];
  channelMix: Record<string, number>;
  recentActivity: {
    id: string;
    noticeId: string;
    noticeTitle: string;
    act: string;
    text: string;
    actorName: string;
    system: boolean;
    at: string;
  }[];
}

export interface NoticeTracker {
  notices: { id: string; ref: string; title: string; ackRate: number }[];
  kpis: {
    required: number;
    received: number;
    completion: number;
    overdue: number;
    withinDeadline: number;
    noticesInScope: number;
    avgHoursToAcknowledge: number;
  };
  byDepartment: {
    deptId: string | null;
    name: string;
    total: number;
    acknowledged: number;
    rate: number;
  }[];
  rows: {
    noticeId: string;
    noticeRef: string;
    noticeTitle: string;
    ackMethod: NoticeAckMethod;
    deadline: string | null;
    employee: EmployeeBrief;
    managerName: string | null;
    reminders: number;
    lastReminderAt: string | null;
    escalatedAt: string | null;
    status: RecipientStatus;
  }[];
}

export interface AudiencePreview {
  count: number;
  departments: number;
  locations: number;
  people: EmployeeBrief[];
}

/** The compose form. Dates are ISO strings. */
export interface NoticeDraftInput {
  title: string;
  category: string;
  priority: NoticePriority;
  summary: string;
  body: string;
  audience: NoticeAudience;
  channels: NoticeChannel[];
  requireAck: boolean;
  ackMethod: NoticeAckMethod;
  quiz: { q: string; options: string[]; answer: number } | null;
  deadline: string | null;
  reminders: NoticeReminders;
  escalate: boolean;
  escalateAfter: number;
  attachments: NoticeAttachment[];
  pinned: boolean;
  expiresAt: string | null;
  revisionOf: string | null;
  templateId: string | null;
}

export interface NoticePublishInput extends NoticeDraftInput {
  timing: "now" | "schedule";
  scheduleAt: string | null;
}

const unwrap = <T>(res: { data: unknown }): T => {
  const d = res.data as { data?: unknown } | null;
  return (d?.data ?? d) as T;
};
const B = "/hr/notices";

// ── Admin ────────────────────────────────────────────────────
export const fetchNoticeOverview = async () =>
  unwrap<NoticeOverview>(await api.get(`${B}/overview`));

export const fetchNoticeMeta = async () =>
  unwrap<NoticeMeta>(await api.get(`${B}/meta`));

export const searchNoticeEmployees = async (search: string) =>
  unwrap<EmployeeBrief[]>(
    await api.get(`${B}/employees`, { params: { search } }),
  );

export const previewNoticeAudience = async (audience: NoticeAudience) =>
  unwrap<AudiencePreview>(
    await api.post(`${B}/audience/preview`, { audience }),
  );

export const uploadNoticeAttachment = async (file: File) => {
  const fd = new FormData();
  fd.append("file", file);
  return unwrap<NoticeAttachment>(
    await api.post(`${B}/attachments`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  );
};

export interface NoticeListFilters {
  status?: string;
  category?: string;
  priority?: string;
  search?: string;
  sort?: string;
}
export const fetchNotices = async (params: NoticeListFilters) =>
  unwrap<{ items: NoticeListItem[]; counts: Record<string, number> }>(
    await api.get(B, { params }),
  );

export const fetchNotice = async (id: string) =>
  unwrap<NoticeDetail>(await api.get(`${B}/${id}`));

export const fetchNoticeRecipients = async (
  id: string,
  params: { status?: string; dept?: string; search?: string },
) =>
  unwrap<{ total: number; items: NoticeRecipientRow[] }>(
    await api.get(`${B}/${id}/recipients`, { params }),
  );

export const saveNoticeDraft = async (input: NoticeDraftInput, id?: string) =>
  unwrap<NoticeDetail>(
    id
      ? await api.put(`${B}/${id}/draft`, input)
      : await api.post(`${B}/draft`, input),
  );

export const publishNotice = async (input: NoticePublishInput, id?: string) =>
  unwrap<NoticeDetail>(
    id
      ? await api.post(`${B}/${id}/publish`, input)
      : await api.post(`${B}/publish`, input),
  );

const act = async (id: string, path: string, body: object = {}) =>
  unwrap<NoticeDetail>(await api.post(`${B}/${id}/${path}`, body));

export const sendNoticeNow = (id: string) => act(id, "send-now");
export const unscheduleNotice = (id: string) => act(id, "unschedule");
export const archiveNotice = (id: string) => act(id, "archive");
export const restoreNotice = (id: string) => act(id, "restore");
export const pinNotice = (id: string) => act(id, "pin");
export const deleteNotice = async (id: string) =>
  unwrap<{ deleted: boolean }>(await api.delete(`${B}/${id}`));

export const remindNotice = async (id: string, employeeIds?: string[]) =>
  unwrap<{ reminded: number }>(
    await api.post(`${B}/${id}/remind`, employeeIds ? { employeeIds } : {}),
  );
export const escalateNotice = async (id: string, employeeIds: string[]) =>
  unwrap<{ escalated: number; managers: number }>(
    await api.post(`${B}/${id}/escalate`, { employeeIds }),
  );
export const recordOfflineAck = async (
  id: string,
  employeeId: string,
  body: { method: string; date?: string; note?: string },
) =>
  unwrap<{ ok: boolean }>(
    await api.post(`${B}/${id}/recipients/${employeeId}/offline-ack`, body),
  );
export const fetchNoticeReceipt = async (id: string, employeeId: string) =>
  unwrap<NoticeReceipt>(
    await api.get(`${B}/${id}/recipients/${employeeId}/receipt`),
  );
export const replyToNoticeQuestion = async (
  id: string,
  questionId: string,
  body: { reply: string; shareWithAll?: boolean },
) =>
  unwrap<NoticeDetail>(
    await api.post(`${B}/${id}/questions/${questionId}/reply`, body),
  );

export const bulkArchiveNotices = async (noticeIds: string[]) =>
  unwrap<{ archived: number }>(
    await api.post(`${B}/bulk/archive`, { noticeIds }),
  );
export const bulkRemindNotices = async (noticeIds: string[]) =>
  unwrap<{ reminded: number }>(
    await api.post(`${B}/bulk/remind`, { noticeIds }),
  );

export interface CsvFile {
  filename: string;
  csv: string;
}
export const fetchNoticeRecipientsCsv = async (id: string) =>
  unwrap<CsvFile>(await api.get(`${B}/${id}/recipients.csv`));
export const fetchNoticeRegisterCsv = async (params: NoticeListFilters) =>
  unwrap<CsvFile>(await api.get(`${B}/register.csv`, { params }));

export interface TrackerFilters {
  noticeId?: string;
  dept?: string;
  status?: string;
  search?: string;
}
export const fetchNoticeTracker = async (params: TrackerFilters) =>
  unwrap<NoticeTracker>(await api.get(`${B}/tracker`, { params }));
export const fetchNoticeTrackerCsv = async (params: TrackerFilters) =>
  unwrap<CsvFile>(await api.get(`${B}/tracker.csv`, { params }));
export const trackerRemind = async (
  items: { noticeId: string; employeeId: string }[],
) =>
  unwrap<{ reminded: number }>(
    await api.post(`${B}/tracker/remind`, { items }),
  );
export const trackerEscalate = async (
  items: { noticeId: string; employeeId: string }[],
) =>
  unwrap<{ escalated: number; managers: number }>(
    await api.post(`${B}/tracker/escalate`, { items }),
  );

export const fetchNoticeEmployeeHistory = async (employeeId: string) =>
  unwrap<{
    employee: EmployeeBrief;
    items: {
      noticeId: string;
      ref: string;
      title: string;
      sentAt: string | null;
      ackAt: string | null;
      status: RecipientStatus;
    }[];
  }>(await api.get(`${B}/employee/${employeeId}/history`));

// Templates / groups / settings
export const fetchNoticeTemplates = async () =>
  unwrap<NoticeTemplate[]>(await api.get(`${B}/templates`));
export const createNoticeTemplate = async (body: {
  name: string;
  category?: string;
  priority?: NoticePriority;
  description?: string;
  requireAck?: boolean;
  ackMethod?: NoticeAckMethod;
  body: string;
}) => unwrap<NoticeTemplate[]>(await api.post(`${B}/templates`, body));
export const deleteNoticeTemplate = async (id: string) =>
  unwrap<NoticeTemplate[]>(await api.delete(`${B}/templates/${id}`));

export const fetchNoticeGroups = async () =>
  unwrap<NoticeGroup[]>(await api.get(`${B}/groups`));
export const createNoticeGroup = async (body: {
  name: string;
  description?: string;
  audience: NoticeAudience;
}) => unwrap<NoticeGroup>(await api.post(`${B}/groups`, body));
export const fetchNoticeGroupMembers = async (id: string) =>
  unwrap<{ name: string; members: EmployeeBrief[] }>(
    await api.get(`${B}/groups/${id}/members`),
  );
export const deleteNoticeGroup = async (id: string) =>
  unwrap<{ deleted: boolean }>(await api.delete(`${B}/groups/${id}`));

export const fetchNoticeSettings = async () =>
  unwrap<NoticeSettings>(await api.get(`${B}/settings`));
export const updateNoticeSettings = async (body: Partial<NoticeSettings>) =>
  unwrap<NoticeSettings>(await api.put(`${B}/settings`, body));

// ── Employee ─────────────────────────────────────────────────
export interface MyNoticeSummary {
  hasProfile: boolean;
  needsAction: number;
  overdue: number;
  unread: number;
  next: {
    id: string;
    title: string;
    deadline: string | null;
    overdue: boolean;
  } | null;
}

export interface MyNoticeItem {
  id: string;
  ref: string;
  title: string;
  summary: string;
  category: string;
  priority: NoticePriority;
  pinned: boolean;
  archived: boolean;
  sentAt: string;
  requireAck: boolean;
  ackMethod: NoticeAckMethod;
  deadline: string | null;
  seen: boolean;
  acknowledgedAt: string | null;
  needsAction: boolean;
  overdue: boolean;
}

export type MyNoticeFilter = "action" | "unread" | "ack" | "all";

export interface MyNoticeDetail extends MyNoticeItem {
  body: string;
  attachments: NoticeAttachment[];
  version: number;
  authorName: string;
  senderName: string;
  footer: string;
  questionsEnabled: boolean;
  quiz: { q: string; options: string[] } | null;
  acknowledgement: {
    at: string;
    method: NoticeAckMethod;
    signature: string | null;
    offline: boolean;
    offlineMethod: string | null;
    receiptRef: string;
  } | null;
  myQuestions: {
    id: string;
    text: string;
    at: string;
    reply: string | null;
    replyAt: string | null;
    replyByName: string | null;
  }[];
}

const E = "/employee/notices";
export const fetchMyNoticeSummary = async () =>
  unwrap<MyNoticeSummary>(await api.get(`${E}/summary`));
export const fetchMyNoticeList = async (filter: MyNoticeFilter) =>
  unwrap<{
    counts: Record<MyNoticeFilter, number>;
    items: MyNoticeItem[];
    questionsEnabled: boolean;
  }>(await api.get(E, { params: { filter } }));
export const openMyNotice = async (id: string) =>
  unwrap<MyNoticeDetail>(await api.get(`${E}/${id}`));
export const acknowledgeMyAnnouncement = async (
  id: string,
  body: { confirmed: boolean; signature?: string; quizAnswer?: number },
) => unwrap<MyNoticeDetail>(await api.post(`${E}/${id}/acknowledge`, body));
export const askAboutMyNotice = async (id: string, text: string) =>
  unwrap<MyNoticeDetail>(await api.post(`${E}/${id}/questions`, { text }));
export const fetchMyNoticeReceipt = async (id: string) =>
  unwrap<NoticeReceipt>(await api.get(`${E}/${id}/receipt`));

// ── Small shared helpers ─────────────────────────────────────
export const NOTICE_ACK_METHODS: Record<
  NoticeAckMethod,
  { label: string; hint: string }
> = {
  click: {
    label: "One-click confirmation",
    hint: "Employee reads and reviews it in the portal, then ticks to acknowledge.",
  },
  signature: {
    label: "Typed e-signature",
    hint: "Employee reads and reviews it, then acknowledges by typing their full name. Best for policies.",
  },
  quiz: {
    label: "Comprehension check",
    hint: "Employee answers a question on the content correctly before acknowledging.",
  },
};

export const NOTICE_REMINDER_LABEL: Record<NoticeReminders, string> = {
  none: "No reminders",
  daily: "Daily until acknowledged",
  every2: "Every 2 days",
  weekly: "Weekly",
};

export const RECIPIENT_STATUS_LABEL: Record<RecipientStatus, string> = {
  acknowledged: "Acknowledged",
  overdue: "Overdue",
  pending: "Read, not signed off",
  read: "Read",
  unread: "Not opened",
};

/** Download CSV text as a file. */
export const downloadCsv = ({ filename, csv }: CsvFile) => {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export const errMessage = (e: unknown, fallback = "Something went wrong") => {
  const err = e as {
    response?: { data?: { message?: string | string[] } };
    message?: string;
  };
  const m = err?.response?.data?.message;
  if (m) return Array.isArray(m) ? m.join(", ") : String(m);
  return err?.message || fallback;
};
