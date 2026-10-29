import { api } from "../api";

// ══════════════════════════════════════════════════════════════
// Organisation Structure → Cap Table & Share Register, Intellectual
// Property, Register of Charges (Oct 2026).
//
// Every money figure the API returns is in the tenant's BASE currency.
// The UI can show another currency: `fetchCapTableFx` returns the rate,
// and `useDisplayMoney` (components/grc/ownership/shared) applies it.
// ══════════════════════════════════════════════════════════════

const unwrap = <T>(res: { data: any }): T => (res.data?.data ?? res.data) as T;

// ── Cap table ───────────────────────────────────────────────────

export type VotingKind = "Yes" | "No" | "Limited";
export type DividendType =
  | "Pro rata"
  | "Cumulative preferred"
  | "Non-cumulative preferred"
  | "Non-participating";

export interface ShareClass {
  id: string;
  name: string;
  authorised: number;
  issued: number;
  holders: number;
  parValue: number;
  voting: VotingKind;
  votingRights: boolean;
  votingNote: string;
  dividendType: DividendType;
  dividendRate: number | null;
  liquidation: string;
  conversion: string;
  rights: string[];
}

export interface HolderHolding {
  classId: string;
  className: string;
  shares: number;
  voting: boolean;
}

export interface Shareholder {
  nodeId: string;
  name: string;
  email: string | null;
  types: string[];
  holdings: HolderHolding[];
  totalShares: number;
  votingShares: number;
  pct: number;
  votingPct: number;
  value: number;
  vesting: { total: number; vested: number } | null;
}

export interface CapTable {
  baseCurrency: string;
  pricePerShare: number;
  stats: {
    authorised: number;
    issued: number;
    unissued: number;
    shareholders: number;
    valuation: number;
  };
  classes: ShareClass[];
  holders: Shareholder[];
}

export type ShareTransactionType =
  "Issuance" | "Transfer" | "Buyback" | "Valuation";

export interface ShareTransaction {
  id: string;
  date: string;
  type: ShareTransactionType;
  fromNodeId: string | null;
  from: string | null;
  toNodeId: string | null;
  to: string | null;
  shareClassId: string | null;
  className: string | null;
  shares: number;
  pricePerShare: number;
  value: number;
  note: string;
  reference: string;
}

export interface VestingRow {
  id: string;
  holderNodeId: string;
  holder: string;
  shareClassId: string | null;
  className: string | null;
  grantDate: string;
  totalShares: number;
  cliffMonths: number;
  periodMonths: number;
  cliffDate: string;
  endDate: string;
  vested: number;
  unvested: number;
  vestedPct: number;
  vestedValue: number;
}

export type ConvertibleType = "SAFE" | "Convertible Note";
export type ConvertibleStatus = "Outstanding" | "Converted" | "Cancelled";

export interface Convertible {
  _id: string;
  type: ConvertibleType;
  investor: string;
  amount: number;
  valuationCap: number;
  discount: number;
  dateIssued: string;
  trigger: string;
  interestRate: number | null;
  maturityDate: string | null;
  status: ConvertibleStatus;
  notes: string;
  documents: UploadedDoc[];
}

export interface UploadedDoc {
  name: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export type ShareholderDocAccess = "Private" | "Restricted" | "Board";

export interface ShareholderDoc {
  id: string;
  category: string;
  title: string;
  shareholderNodeId: string | null;
  shareholder: string;
  access: ShareholderDocAccess;
  date: string;
  refNo: string;
  notes: string;
  files: {
    index: number;
    name: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
  }[];
}

export interface ShareholderDocLog {
  id: string;
  documentId: string | null;
  documentTitle: string;
  userName: string;
  action: "Uploaded" | "Viewed" | "Downloaded" | "Deleted";
  ip: string;
  at: string;
}

const CAP = "/grc/governance/cap-table";

export const fetchCapTable = async () => unwrap<CapTable>(await api.get(CAP));

export const fetchCapTableFx = async (currency: string) =>
  unwrap<{
    baseCurrency: string;
    currency: string;
    rate: number;
    stale: boolean;
  }>(await api.get(`${CAP}/fx`, { params: { currency } }));

export interface ShareClassInput {
  name: string;
  authorised: number;
  parValue?: number;
  voting?: VotingKind;
  votingNote?: string;
  dividendType?: DividendType;
  dividendRate?: number;
  liquidation?: string;
  conversion?: string;
  rights?: string[];
}
export const createShareClass = async (p: ShareClassInput) =>
  unwrap<ShareClass>(await api.post(`${CAP}/classes`, p));
export const updateShareClass = async (
  id: string,
  p: Partial<ShareClassInput>,
) => unwrap<ShareClass>(await api.patch(`${CAP}/classes/${id}`, p));
export const deleteShareClass = async (id: string) =>
  unwrap(await api.delete(`${CAP}/classes/${id}`));

export const fetchShareTransactions = async () =>
  unwrap<ShareTransaction[]>(await api.get(`${CAP}/transactions`));
export const createShareTransaction = async (p: {
  type: ShareTransactionType;
  date: string;
  fromNodeId?: string;
  toNodeId?: string;
  shareClassId?: string;
  shares?: number;
  pricePerShare?: number;
  note?: string;
  reference?: string;
}) => unwrap<ShareTransaction>(await api.post(`${CAP}/transactions`, p));
export const deleteShareTransaction = async (id: string) =>
  unwrap(await api.delete(`${CAP}/transactions/${id}`));

export const addShareholder = async (p: {
  nodeId?: string;
  name?: string;
  email?: string;
  subtitle?: string;
  alsoTypes?: string[];
  parentIds?: string[];
  shareClassId?: string;
  shares?: number;
  pricePerShare?: number;
  date?: string;
  reference?: string;
}) =>
  unwrap<{ node: { _id: string; name: string }; transaction: unknown }>(
    await api.post(`${CAP}/shareholders`, p),
  );

export const fetchVesting = async () =>
  unwrap<VestingRow[]>(await api.get(`${CAP}/vesting`));
export const createVesting = async (p: {
  holderNodeId: string;
  shareClassId?: string;
  grantDate: string;
  totalShares: number;
  cliffMonths: number;
  periodMonths: number;
}) => unwrap(await api.post(`${CAP}/vesting`, p));
export const deleteVesting = async (id: string) =>
  unwrap(await api.delete(`${CAP}/vesting/${id}`));

export const fetchConvertibles = async () =>
  unwrap<Convertible[]>(await api.get(`${CAP}/convertibles`));
export type ConvertibleInput = Omit<
  Convertible,
  "_id" | "documents" | "status" | "interestRate" | "maturityDate"
> & {
  status?: ConvertibleStatus;
  interestRate?: number;
  maturityDate?: string;
};
export const createConvertible = async (p: ConvertibleInput) =>
  unwrap<Convertible>(await api.post(`${CAP}/convertibles`, p));
export const updateConvertible = async (
  id: string,
  p: Partial<ConvertibleInput>,
) => unwrap<Convertible>(await api.patch(`${CAP}/convertibles/${id}`, p));
export const deleteConvertible = async (id: string) =>
  unwrap(await api.delete(`${CAP}/convertibles/${id}`));
export const uploadConvertibleDocument = async (id: string, file: File) => {
  const fd = new FormData();
  fd.append("file", file);
  return unwrap<Convertible>(
    await api.post(`${CAP}/convertibles/${id}/documents`, fd),
  );
};
export const removeConvertibleDocument = async (id: string, index: number) =>
  unwrap<Convertible>(
    await api.delete(`${CAP}/convertibles/${id}/documents/${index}`),
  );

export const fetchShareholderDocs = async () =>
  unwrap<ShareholderDoc[]>(await api.get(`${CAP}/documents`));
export const fetchShareholderDocLog = async () =>
  unwrap<ShareholderDocLog[]>(await api.get(`${CAP}/documents/access-log`));
export const uploadShareholderDoc = async (p: {
  category: string;
  title: string;
  shareholderNodeId?: string;
  access: ShareholderDocAccess;
  date?: string;
  refNo?: string;
  notes?: string;
  file?: File | null;
}) => {
  const fd = new FormData();
  fd.append("category", p.category);
  fd.append("title", p.title);
  fd.append("access", p.access);
  if (p.shareholderNodeId) fd.append("shareholderNodeId", p.shareholderNodeId);
  if (p.date) fd.append("date", p.date);
  if (p.refNo) fd.append("refNo", p.refNo);
  if (p.notes) fd.append("notes", p.notes);
  if (p.file) fd.append("file", p.file);
  return unwrap(await api.post(`${CAP}/documents`, fd));
};
export const addShareholderDocFile = async (id: string, file: File) => {
  const fd = new FormData();
  fd.append("file", file);
  return unwrap(await api.post(`${CAP}/documents/${id}/files`, fd));
};
export const deleteShareholderDoc = async (id: string) =>
  unwrap(await api.delete(`${CAP}/documents/${id}`));

/**
 * Fetches a stored shareholder file through the authenticated, logged
 * endpoint (files are NOT publicly reachable by URL). `view` opens it
 * in a new tab; `download` saves it. Each call is recorded in the
 * document access log.
 */
export const openShareholderDocFile = async (
  id: string,
  index: number,
  mode: "view" | "download",
  fileName: string,
) => {
  const res = await api.get(`${CAP}/documents/${id}/files/${index}`, {
    params: { action: mode },
    responseType: "blob",
  });
  const url = URL.createObjectURL(res.data as Blob);
  if (mode === "view") {
    window.open(url, "_blank", "noopener");
  } else {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

// ── Intellectual property ───────────────────────────────────────

export type IpAssetType =
  | "Trademark"
  | "Patent"
  | "Copyright"
  | "Trade Secret"
  | "Domain Name"
  | "Design";
export type IpAssetStatus =
  "Registered" | "Active" | "Pending" | "Expired" | "Lapsed" | "Abandoned";

export interface IpDeadline {
  _id: string;
  label: string;
  dueDate: string;
  done: boolean;
  doneAt: string | null;
}

export interface IpAsset {
  _id: string;
  name: string;
  type: IpAssetType;
  owner: string;
  regNo: string;
  filingDate: string | null;
  expiryDate: string | null;
  jurisdiction: string;
  status: IpAssetStatus;
  value: number;
  description: string;
  licensees: string[];
  deadlines: IpDeadline[];
  documents: UploadedDoc[];
}

export interface IpDueItem {
  key: string;
  assetId: string;
  assetName: string;
  assetType: IpAssetType;
  kind: "expiry" | "deadline";
  deadlineId: string | null;
  label: string;
  action: string;
  dueDate: string;
  daysLeft: number;
  urgency: "overdue" | "critical" | "soon" | "ok";
  jurisdiction: string;
}

export interface IpOverview {
  baseCurrency: string;
  assets: IpAsset[];
  renewals: IpDueItem[];
  stats: {
    total: number;
    totalValue: number;
    registered: number;
    pending: number;
    overdue: number;
    dueWithin90: number;
    dueWithin365: number;
    licensed: number;
  };
}

const IP = "/grc/governance/ip-assets";

export const fetchIpOverview = async () =>
  unwrap<IpOverview>(await api.get(IP));

export interface IpAssetInput {
  name: string;
  type: IpAssetType;
  owner?: string;
  regNo?: string;
  filingDate?: string | null;
  expiryDate?: string | null;
  jurisdiction?: string;
  status?: IpAssetStatus;
  value?: number;
  description?: string;
  licensees?: string[];
}
export const createIpAsset = async (p: IpAssetInput) =>
  unwrap<IpAsset>(await api.post(IP, p));
export const updateIpAsset = async (id: string, p: Partial<IpAssetInput>) =>
  unwrap<IpAsset>(await api.patch(`${IP}/${id}`, p));
export const deleteIpAsset = async (id: string) =>
  unwrap(await api.delete(`${IP}/${id}`));
export const renewIpAsset = async (id: string, newExpiryDate: string) =>
  unwrap<IpAsset>(await api.post(`${IP}/${id}/renew`, { newExpiryDate }));
export const addIpDeadline = async (
  id: string,
  p: { label: string; dueDate: string },
) => unwrap<IpAsset>(await api.post(`${IP}/${id}/deadlines`, p));
export const updateIpDeadline = async (
  id: string,
  deadlineId: string,
  p: Partial<{ label: string; dueDate: string; done: boolean }>,
) => unwrap<IpAsset>(await api.patch(`${IP}/${id}/deadlines/${deadlineId}`, p));
export const removeIpDeadline = async (id: string, deadlineId: string) =>
  unwrap<IpAsset>(await api.delete(`${IP}/${id}/deadlines/${deadlineId}`));
export const uploadIpDocument = async (id: string, file: File) => {
  const fd = new FormData();
  fd.append("file", file);
  return unwrap<IpAsset>(await api.post(`${IP}/${id}/documents`, fd));
};
export const removeIpDocument = async (id: string, index: number) =>
  unwrap<IpAsset>(await api.delete(`${IP}/${id}/documents/${index}`));

// ── Register of charges ─────────────────────────────────────────

export type ChargeType =
  | "Fixed Charge"
  | "Floating Charge"
  | "Mortgage"
  | "Debenture"
  | "Lien"
  | "Pledge";
export type ChargeStatus = "Active" | "Satisfied";

export interface RegisteredCharge {
  _id: string;
  chargeType: ChargeType;
  chargeHolder: string;
  dateCreated: string;
  dateSatisfied: string | null;
  amountSecured: number;
  propertyCharged: string;
  regRef: string;
  description: string;
  status: ChargeStatus;
  documents: UploadedDoc[];
}

export interface ChargesOverview {
  baseCurrency: string;
  charges: RegisteredCharge[];
  stats: {
    total: number;
    active: number;
    satisfied: number;
    activeAmount: number;
    totalAmount: number;
    byType: Record<string, { count: number; amount: number }>;
  };
}

const CH = "/grc/governance/charges";

export const fetchCharges = async () =>
  unwrap<ChargesOverview>(await api.get(CH));
export interface ChargeInput {
  chargeType: ChargeType;
  chargeHolder: string;
  dateCreated: string;
  dateSatisfied?: string | null;
  amountSecured: number;
  propertyCharged?: string;
  regRef?: string;
  description?: string;
}
export const createCharge = async (p: ChargeInput) =>
  unwrap<RegisteredCharge>(await api.post(CH, p));
export const updateCharge = async (id: string, p: Partial<ChargeInput>) =>
  unwrap<RegisteredCharge>(await api.patch(`${CH}/${id}`, p));
export const satisfyCharge = async (id: string, dateSatisfied: string) =>
  unwrap<RegisteredCharge>(
    await api.post(`${CH}/${id}/satisfy`, { dateSatisfied }),
  );
export const deleteCharge = async (id: string) =>
  unwrap(await api.delete(`${CH}/${id}`));
export const uploadChargeDocument = async (id: string, file: File) => {
  const fd = new FormData();
  fd.append("file", file);
  return unwrap<RegisteredCharge>(await api.post(`${CH}/${id}/documents`, fd));
};
export const removeChargeDocument = async (id: string, index: number) =>
  unwrap<RegisteredCharge>(await api.delete(`${CH}/${id}/documents/${index}`));
