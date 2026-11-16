import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  fetchFinanceSettingsLog,
  type FinanceSettingsSection,
} from "@/lib/crm/finance-api";
import { SettingsCard, SimpleSelect, SETTINGS_LOG_KEY } from "./shared";

const LABEL: Record<FinanceSettingsSection, string> = {
  general: "General",
  tax: "Tax",
  invoicing: "Invoicing",
  approvals: "Approvals",
  banking: "Bank accounts",
  branding: "Document branding",
};

export default function ChangeLogTab() {
  const [section, setSection] = useState<"all" | FinanceSettingsSection>("all");
  const { data: entries = [], isLoading } = useQuery({
    queryKey: [...SETTINGS_LOG_KEY, section],
    queryFn: () => fetchFinanceSettingsLog(section),
  });

  return (
    <SettingsCard
      icon={<History className="h-4 w-4" />}
      title="Settings change log"
      description="Every change to finance settings, who made it and when."
      action={
        <SimpleSelect
          className="w-44"
          value={section}
          onChange={(v) => setSection(v as any)}
          options={[
            { value: "all", label: "All sections" },
            ...Object.entries(LABEL).map(([value, label]) => ({ value, label })),
          ]}
        />
      }
    >
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && !entries.length && (
        <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
      )}
      <ol className="space-y-2">
        {entries.map((e) => (
          <li key={e._id} className="flex items-start gap-3 rounded-lg border p-3">
            <Badge variant="outline" className="mt-0.5 shrink-0 text-[10px]">
              {LABEL[e.section] ?? e.section}
            </Badge>
            <div className="min-w-0 flex-1">
              <p className="text-sm">{e.summary}</p>
              <p className="text-xs text-muted-foreground">
                {e.actorName || "System"} ·{" "}
                {new Date(e.createdAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </SettingsCard>
  );
}
