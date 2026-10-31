import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { registerMergeMeta, type RegistryField } from "@/lib/crm/merge-fields";

// Loads the engine's merge-field registry once and teaches metaFor() the
// labels/groups of fields the static table doesn't list (deal fields,
// term-sheet sections…). Components that show merge fields call this so
// they re-render when the registry arrives.
export function useMergeFieldRegistry() {
  return useQuery({
    queryKey: ["merge-field-registry"],
    queryFn: async () => {
      const res = await api.get("/tools/contract-templates/merge-fields");
      const fields: RegistryField[] = res.data?.data ?? res.data ?? [];
      const list = Array.isArray(fields) ? fields : [];
      registerMergeMeta(list);
      return list;
    },
    staleTime: Infinity,
    retry: 1,
  });
}
