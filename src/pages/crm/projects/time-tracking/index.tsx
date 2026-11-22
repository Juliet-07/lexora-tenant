import { defaultCurrency } from "@/lib/currency";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchTimeEntries } from "@/lib/crm/time-tracking-api";

import { EntriesTab } from "./EntriesTab";
import { WeeklyGridTab } from "./WeeklyGridTab";
import { ApprovalsTab } from "./ApprovalsTab";
import { UtilisationTab } from "./UtilisationTab";
import { RateCardsTab } from "./RateCardsTab";

const money = (n: number, c = defaultCurrency()) =>
  n.toLocaleString(undefined, {
    style: "currency",
    currency: c,
    maximumFractionDigits: 0,
  });

export default function TimeTracking() {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["timeEntries"],
    queryFn: () => fetchTimeEntries(),
  });
  const pending = entries.filter((e) => e.status === "Submitted");
  const approvedValue = entries
    .filter((e) => e.status === "Approved" && e.billable)
    .reduce((s, e) => s + e.hours * e.rate, 0);
  const billableHrs = entries
    .filter((e) => e.billable)
    .reduce((s, e) => s + e.hours, 0);
  const totalHrs = entries.reduce((s, e) => s + e.hours, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Timesheets</h1>
          <p className="text-sm text-muted-foreground">
            Time entry, approval, utilisation and billing — start the timer from
            the top bar
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { l: "Hours logged", v: totalHrs.toFixed(1) },
          { l: "Billable hours", v: billableHrs.toFixed(1) },
          { l: "Approved value (to WIP)", v: money(approvedValue) },
          { l: "Awaiting approval", v: String(pending.length) },
        ].map((k) => (
          <Card key={k.l}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.l}</p>
              <p className="mt-1 text-xl font-bold">{k.v}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Loading…
        </p>
      ) : (
        <Tabs defaultValue="entries">
          <TabsList className="flex-wrap">
            <TabsTrigger value="entries">Time entries</TabsTrigger>
            <TabsTrigger value="grid">Weekly grid</TabsTrigger>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="utilisation">Utilisation</TabsTrigger>
            <TabsTrigger value="rates">Rate cards &amp; billing</TabsTrigger>
          </TabsList>

          <TabsContent value="entries" className="pt-4">
            <EntriesTab entries={entries} />
          </TabsContent>
          <TabsContent value="grid" className="pt-4">
            <WeeklyGridTab entries={entries} />
          </TabsContent>
          <TabsContent value="approvals" className="pt-4">
            <ApprovalsTab entries={entries} />
          </TabsContent>
          <TabsContent value="utilisation" className="pt-4">
            <UtilisationTab entries={entries} />
          </TabsContent>
          <TabsContent value="rates" className="pt-4">
            <RateCardsTab />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
