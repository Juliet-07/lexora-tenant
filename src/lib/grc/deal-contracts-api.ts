import { api } from "@/lib/api";
import type { ContractType } from "@/lib/crm/tools-api";

// Contracts drafted inside a deal from templates the Super Admin publishes
// (module GRC, area "Deals"). A generated contract is a real Contract
// Management contract linked back to the deal — see the engine's
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
  | "deal" // read from the deal record
  | "auto" // filled by the system (our company, today's date)
  | "form" // typed on the generate form
  | "unavailable" // a real field, but not one a deal contract can fill
  | "unknown"; // not a known field at all — stays as literal {{token}} text

export interface DealTemplateField {
  token: string;
  label: string;
  source: DealFieldSource;
  /** The deal's value for a "deal" field (blank if the deal has none). */
  value: string;
  filled: boolean;
}

export interface DealContractDraft {
  suggested: {
    title: string;
    type: ContractType;
    value: number;
    currency: string;
    expiresOn: string;
    owner: string;
  };
  parties: { side: string; name: string; title: string; email: string }[];
  template: { _id: string; title: string } | null;
  fields: DealTemplateField[];
}

export interface DealContractLink {
  _id: string;
  ref: string;
  title: string;
  type: ContractType;
  stage: string;
  value: number;
  currency: string;
  counterparty: string;
  counterpartyEmail: string;
  templateName: string | null;
  signatureStatus: string;
  expiresOn: string;
  createdAt: string;
}

export interface GenerateDealContractInput {
  templateId: string;
  title: string;
  counterparty: string;
  counterpartyEmail: string;
  value?: number;
  currency?: string;
  scopeOfWork?: string;
  expiresOn: string;
  owner?: string;
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

export const fetchDealTemplateContracts = async (
  dealId: string,
): Promise<DealContractLink[]> => {
  const d = unwrap<DealContractLink[]>(
    await api.get(`/deals/${dealId}/template-contracts`),
  );
  return Array.isArray(d) ? d : [];
};

export const generateDealContract = async (
  dealId: string,
  dto: GenerateDealContractInput,
): Promise<{ _id: string; ref: string; title: string }> =>
  unwrap(await api.post(`/deals/${dealId}/template-contracts`, dto));
