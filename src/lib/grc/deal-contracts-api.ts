import { api } from "@/lib/api";

// Contracts drafted inside a deal from templates the Super Admin publishes
// (module GRC, area "Deals"). A generated contract belongs to the deal
// (deal.contracts) and is edited, redlined, reviewed and executed there —
// it is not a Contract Management (CRM) contract. See the engine's
// DealContractService.

export interface DealContractTemplate {
  _id: string;
  title: string;
  category: string;
  jurisdiction: string;
  description: string;
  version: string;
  folderId: string | null;
  updatedAt: string;
  /** Template HTML — read to show which fields the template uses. */
  content: string;
}

export type DealFieldSource =
  | "deal" // supplied by the deal, our company profile or the system
  | "form" // typed on the generate form
  | "clause" // a clause-level detail, completed on the contract itself
  | "unknown"; // not a known field at all — stays as literal {{token}} text

export interface DealTemplateField {
  token: string;
  label: string;
  /** One of the fields every module shares. */
  common: boolean;
  source: DealFieldSource;
  /** The value the deal / company profile already supplies (may be blank). */
  value: string;
  filled: boolean;
}

export interface DealContractDraft {
  suggested: {
    title: string;
    value: number;
    currency: string;
    governingLaw: string;
    expiresOn: string;
  };
  /** Our own company — the default Party A. */
  ourCompany: {
    name: string;
    address: string;
    email: string;
    representative: string;
    representativeTitle: string;
  };
  parties: { side: string; name: string; title: string; email: string }[];
  template: { _id: string; title: string } | null;
  fields: DealTemplateField[];
}

export interface ContractPartyInput {
  name: string;
  email?: string;
  address?: string;
  representative?: string;
  representativeTitle?: string;
}

export interface GenerateDealContractInput {
  templateId: string;
  title: string;
  /** Omit to use our own company as Party A. */
  partyA?: ContractPartyInput;
  partyB: ContractPartyInput;
  value?: number;
  currency?: string;
  governingLaw?: string;
  scopeOfWork?: string;
  effectiveDate?: string;
  expiresOn?: string;
}

const unwrap = <T>(res: { data: any }): T => res.data?.data ?? res.data;

export const fetchDealContractTemplates = async (
  dealId: string,
): Promise<DealContractTemplate[]> => {
  const d = unwrap<DealContractTemplate[]>(
    await api.get(`/deals/${dealId}/contract-templates`),
  );
  return Array.isArray(d) ? d : [];
};

export const fetchDealContractDraft = async (
  dealId: string,
  templateId?: string,
): Promise<DealContractDraft> =>
  unwrap(
    await api.get(`/deals/${dealId}/contract-draft`, {
      params: templateId ? { templateId } : undefined,
    }),
  );

export const generateDealContract = async (
  dealId: string,
  dto: GenerateDealContractInput,
): Promise<{ contractId: string }> =>
  unwrap(await api.post(`/deals/${dealId}/template-contracts`, dto));
