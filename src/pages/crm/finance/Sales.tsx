import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import {
  wip, wipValue, wipBand, quotes, creditNotes, recurringInvoices,
  receivables, dunningStages, paymentPlans, badDebtBands, fmoney,
  type WipItem, type Receivable,
} from "@/data/financeMockData";
import { Clock, FileText, ReceiptText, RefreshCw, AlertTriangle } from "lucide-react";

const badge = (s: string) => {
  if (["Accepted", "Paid", "Active", "Approved for billing", "Synced"].includes(s))
    return "bg-success/10 text-success";
  if (["Sent", "Unbilled", "Pending", "Scheduled", "Held"].includes(s))
    return "bg-warning/10 text-warning";
  if (["Declined", "Expired", "Written off", "Overdue", "Error"].includes(s))
    return "bg-destructive/10 text-destructive";
  return "bg-muted text-muted-foreground";
};

export default function Sales() {
  const { toast } = useToast();
  const [wipList, setWipList] = useState<WipItem[]>(wip);
  const [selected, setSelected] = useState<Receivable | null>(null);

  const totals = useMemo(() => {
    const unbilled = wipList
      .filter(w => w.status !== "Written off")
      .reduce((s, w) => s + wipValue(w), 0);
    const ar = receivables.reduce((s, r) => s + r.amount, 0);
    const overdue = receivables.filter(r => r.daysOverdue > 0).reduce((s, r) => s + r.amount, 0);
    return { unbilled, ar, overdue };
  }, [wipList]);

  const setWipStatus = (id: string, status: WipItem["status"]) => {
    setWipList(l => l.map(w => (w.id === id ? { ...w, status } : w)));
    toast({ title: "WIP updated", description: `${id} marked ${status.toLowerCase()}.` });
  };

  const bands = ["0–30", "31–60", "61–90", "90+"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sales</h1>
        <p className="text-sm text-muted-foreground">
          WIP, quotes, credit notes, receivables and credit control
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: "Unbilled WIP", value: fmoney(totals.unbilled), icon: Clock },
          { label: "Total receivables", value: fmoney(totals.ar), icon: ReceiptText },
          { label: "Overdue", value: fmoney(totals.overdue), icon: AlertTriangle },
          { label: "Lock-up days", value: "68 days", icon: RefreshCw },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="p-5 flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10"><k.icon className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">{k.label}</p>
                <p className="text-lg font-bold">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="wip">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="wip">Work in progress</TabsTrigger>
          <TabsTrigger value="quotes">Quotes & proformas</TabsTrigger>
          <TabsTrigger value="credit">Credit notes</TabsTrigger>
          <TabsTrigger value="recurring">Recurring</TabsTrigger>
          <TabsTrigger value="ar">Aged receivables</TabsTrigger>
          <TabsTrigger value="dunning">Credit control</TabsTrigger>
        </TabsList>

        {/* WIP */}
        <TabsContent value="wip" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {bands.map(b => {
              const items = wipList.filter(w => wipBand(w.ageDays) === b);
              return (
                <Card key={b}>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{b} days</p>
                    <p className="text-lg font-bold">
                      {fmoney(items.reduce((s, w) => s + wipValue(w), 0))}
                    </p>
                    <p className="text-xs text-muted-foreground">{items.length} entries</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">WIP register</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entry</TableHead><TableHead>Member</TableHead>
                    <TableHead>Mandate</TableHead><TableHead>Narrative</TableHead>
                    <TableHead>Date</TableHead><TableHead>Hours</TableHead>
                    <TableHead>Value</TableHead><TableHead>Age</TableHead>
                    <TableHead>Status</TableHead><TableHead className="text-right">Review</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wipList.map(w => (
                    <TableRow key={w.id}>
                      <TableCell className="font-medium text-sm">{w.id}</TableCell>
                      <TableCell className="text-sm">{w.member}</TableCell>
                      <TableCell className="text-sm">{w.mandate}<div className="text-xs text-muted-foreground">{w.client}</div></TableCell>
                      <TableCell className="text-sm max-w-[220px] truncate">{w.narrative}</TableCell>
                      <TableCell className="text-sm">{w.date}</TableCell>
                      <TableCell className="text-sm">{w.kind === "Disbursement" ? `Disb.${w.markupPct ? ` +${w.markupPct}%` : ""}` : `${w.hours}h`}</TableCell>
                      <TableCell className="text-sm font-semibold">{fmoney(wipValue(w))}</TableCell>
                      <TableCell className="text-sm">{wipBand(w.ageDays)}</TableCell>
                      <TableCell><Badge className={`text-xs ${badge(w.status)}`}>{w.status}</Badge></TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="outline" onClick={() => setWipStatus(w.id, "Approved for billing")}>Approve</Button>
                        <Button size="sm" variant="ghost" onClick={() => setWipStatus(w.id, "Written down")}>Write down</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quotes */}
        <TabsContent value="quotes" className="mt-4">
          <Card>
            <CardContent className="p-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead><TableHead>Type</TableHead>
                    <TableHead>Client</TableHead><TableHead>Title</TableHead>
                    <TableHead>Amount</TableHead><TableHead>Issued</TableHead>
                    <TableHead>Expires</TableHead><TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map(q => (
                    <TableRow key={q.id}>
                      <TableCell className="font-medium text-sm">{q.id}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{q.kind}</Badge></TableCell>
                      <TableCell className="text-sm">{q.client}</TableCell>
                      <TableCell className="text-sm">{q.title}</TableCell>
                      <TableCell className="text-sm font-semibold">{fmoney(q.amount, q.currency)}</TableCell>
                      <TableCell className="text-sm">{q.issued}</TableCell>
                      <TableCell className="text-sm">{q.expires}</TableCell>
                      <TableCell><Badge className={`text-xs ${badge(q.status)}`}>{q.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline"
                          onClick={() => toast({ title: "Converted", description: `${q.id} converted to a draft invoice.` })}>
                          Convert to invoice
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credit notes */}
        <TabsContent value="credit" className="mt-4 space-y-2">
          <p className="text-sm text-muted-foreground">
            Credit notes are checkpoint two of the write-down lifecycle. The full audit trail across WIP
            write-downs, credit notes and bad debt sits in Reporting → Write-offs.
          </p>
          <Card>
            <CardContent className="p-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Credit note</TableHead><TableHead>Original invoice</TableHead>
                    <TableHead>Client</TableHead><TableHead>Amount</TableHead>
                    <TableHead>Reason</TableHead><TableHead>Approved by</TableHead>
                    <TableHead>EBM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditNotes.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium text-sm">{c.id}</TableCell>
                      <TableCell className="text-sm">{c.invoice}</TableCell>
                      <TableCell className="text-sm">{c.client}</TableCell>
                      <TableCell className="text-sm font-semibold">{fmoney(c.amount)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.reason}</TableCell>
                      <TableCell className="text-sm">{c.approvedBy}</TableCell>
                      <TableCell><Badge className={`text-xs ${badge(c.ebm)}`}>{c.ebm}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recurring */}
        <TabsContent value="recurring" className="mt-4">
          <Card>
            <CardContent className="p-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Schedule</TableHead><TableHead>Client</TableHead>
                    <TableHead>Mandate</TableHead><TableHead>Amount</TableHead>
                    <TableHead>Frequency</TableHead><TableHead>Next run</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recurringInvoices.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-sm">{r.id}</TableCell>
                      <TableCell className="text-sm">{r.client}</TableCell>
                      <TableCell className="text-sm">{r.mandate}</TableCell>
                      <TableCell className="text-sm font-semibold">{fmoney(r.amount)}</TableCell>
                      <TableCell className="text-sm">{r.frequency}</TableCell>
                      <TableCell className="text-sm">{r.nextRun}</TableCell>
                      <TableCell><Badge className={`text-xs ${badge(r.status)}`}>{r.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aged receivables */}
        <TabsContent value="ar" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {["Current", "31–60", "61–90", "90+"].map(band => {
              const items = receivables.filter(r => r.stage === band);
              const total = items.reduce((s, r) => s + r.amount, 0);
              return (
                <Card key={band}>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{band}</p>
                    <p className="text-lg font-bold">{fmoney(total)}</p>
                    <Progress className="mt-2 h-1.5" value={(total / totals.ar) * 100} />
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Card>
            <CardContent className="p-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead><TableHead>Client</TableHead>
                    <TableHead>Mandate</TableHead><TableHead>Amount</TableHead>
                    <TableHead>Due</TableHead><TableHead>Days overdue</TableHead>
                    <TableHead>Band</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivables.map(r => (
                    <TableRow key={r.id} className="cursor-pointer" onClick={() => setSelected(r)}>
                      <TableCell className="font-medium text-sm">{r.id}</TableCell>
                      <TableCell className="text-sm">{r.client}</TableCell>
                      <TableCell className="text-sm">{r.mandate}</TableCell>
                      <TableCell className="text-sm font-semibold">{fmoney(r.amount)}</TableCell>
                      <TableCell className="text-sm">{r.due}</TableCell>
                      <TableCell className="text-sm">{r.daysOverdue}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{r.stage}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dunning */}
        <TabsContent value="dunning" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {dunningStages.map(s => {
              const items = receivables.filter(r => r.stage === s.stage);
              return (
                <Card key={s.stage}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{s.stage}</CardTitle>
                    <p className="text-xs text-muted-foreground">{s.note}</p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-lg font-bold">{fmoney(items.reduce((a, r) => a + r.amount, 0))}</p>
                    <p className="text-xs text-muted-foreground">{items.length} invoice(s)</p>
                    {items.map(r => (
                      <button key={r.id} onClick={() => setSelected(r)}
                        className="w-full text-left rounded-lg border p-2 hover:bg-muted/50">
                        <p className="text-xs font-medium">{r.client}</p>
                        <p className="text-xs text-muted-foreground">{r.id} · {fmoney(r.amount)}</p>
                        {r.dunningPaused && <Badge className="mt-1 text-[10px] bg-muted text-muted-foreground">Paused</Badge>}
                      </button>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Payment plans</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {paymentPlans.map(p => (
                  <div key={p.id} className="rounded-lg border p-3">
                    <p className="text-sm font-medium">{p.client} · {p.invoice}</p>
                    <div className="mt-2 space-y-1">
                      {p.instalments.map(i => (
                        <div key={i.due} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{i.due}</span>
                          <span>{fmoney(i.amount)}</span>
                          <Badge className={`text-[10px] ${badge(i.status)}`}>{i.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Bad debt provisioning</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Age band</TableHead><TableHead>Provision %</TableHead><TableHead>Exposure</TableHead><TableHead>Provision</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {badDebtBands.map(b => (
                      <TableRow key={b.band}>
                        <TableCell className="text-sm">{b.band}</TableCell>
                        <TableCell className="text-sm">{b.provisionPct}%</TableCell>
                        <TableCell className="text-sm">{fmoney(b.exposure)}</TableCell>
                        <TableCell className="text-sm font-semibold">{fmoney(b.exposure * b.provisionPct / 100)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Sheet open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.id} · {selected.client}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-muted-foreground text-xs">Mandate</p>{selected.mandate}</div>
                  <div><p className="text-muted-foreground text-xs">Amount</p>{fmoney(selected.amount)}</div>
                  <div><p className="text-muted-foreground text-xs">Due</p>{selected.due}</div>
                  <div><p className="text-muted-foreground text-xs">Days overdue</p>{selected.daysOverdue}</div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Dunning timeline</p>
                  <div className="space-y-2">
                    {["Sent", "Due", "30d reminder", "60d reminder", "90d final notice", "Write-off review"].map((step, i) => {
                      const reached = selected.daysOverdue >= [0, 0, 30, 60, 90, 180][i];
                      return (
                        <div key={step} className="flex items-center gap-2 text-sm">
                          <span className={`h-2 w-2 rounded-full ${reached ? "bg-primary" : "bg-muted"}`} />
                          <span className={reached ? "" : "text-muted-foreground"}>{step}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {selected.lastAction && (
                  <div className="rounded-lg border p-3 text-sm">
                    <p className="text-xs text-muted-foreground">Last action</p>{selected.lastAction}
                  </div>
                )}
                {selected.notes && (
                  <div className="rounded-lg border p-3 text-sm">
                    <p className="text-xs text-muted-foreground">Client response</p>{selected.notes}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {["Log call", "Resend reminder", "Set follow-up", selected.dunningPaused ? "Resume dunning" : "Pause dunning", "Offer payment plan", "Escalate to partner", "Mark as disputed"].map(a => (
                    <Button key={a} size="sm" variant="outline"
                      onClick={() => toast({ title: a, description: `${a} recorded for ${selected.id}.` })}>
                      {a}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Sales workflow</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-2">
          {["WIP accumulation", "WIP review", "Invoice creation", "Approve & send", "Payment received", "Credit control"].map((s, i) => (
            <div key={s} className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Step {i + 1}</p>
              <p className="text-sm font-medium">{s}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
