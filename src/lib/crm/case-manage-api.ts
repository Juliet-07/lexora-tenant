import { api } from "../api";

const unwrap = (res: any) => res.data?.data ?? res.data;

export type CaseKind = "ADR" | "Litigation";

const base = (kind: CaseKind) =>
  kind === "ADR" ? "/crm/adr-cases" : "/crm/litigation-cases";

export interface CaseDeleteImpact {
  ref: string;
  title: string;
  willDelete: Record<string, number>;
  willDetach: Record<string, number>;
}

export const fetchCaseDeleteImpact = async (
  kind: CaseKind,
  id: string,
): Promise<CaseDeleteImpact> =>
  unwrap(await api.get(`${base(kind)}/${id}/delete-impact`));

export const deleteCase = async (kind: CaseKind, id: string): Promise<void> => {
  await api.delete(`${base(kind)}/${id}`);
};

// Case-detail edit. `mandateId: ""` unlinks the case from its mandate.
export const updateCaseDetails = async (
  kind: CaseKind,
  id: string,
  dto: Record<string, unknown>,
) => unwrap(await api.patch(`${base(kind)}/${id}/details`, dto));
