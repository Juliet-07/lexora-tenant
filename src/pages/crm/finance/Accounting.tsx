import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  chartOfAccounts, journals, recodeCandidates, fmoney,
} from "@/data/financeMockData";

const workflow = [
  { action: "Maintain chart of accounts", detail: "Add, rename or archive accounts; codes stay stable for reporting", owner: "Finance manager", trigger: "New account need" },
  { action: "Raise manual journal", detail: "Debit / credit lines with narration and supporting document", owner: "Accountant", trigger: "Accrual, provision, reclass" },
  { action: "Approve journal", detail: "Second pair of eyes before posting to the ledger", owner: "Finance manager", trigger: "Journal submitted" },
  { action: "Find & recode", detail: "Search miscoded transactions and reassign them in bulk", owner: "Accountant", trigger: "Month-end review" },
  { action: "Close the period", detail: "Lock the ledger once reconciliations and journals are posted", owner: "Finance manager", trigger: "Month-end close" },
];

export default function Accounting() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Accounting</h1>
        <p className="text-sm text-muted-foreground">
          Core bookkeeping — chart of accounts, manual journals and find &amp; recode
        </p>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Assets, depreciation, insurance and maintenance now live in their own Asset Register.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link to="/crm/assets">Open Asset Register <ArrowUpRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="coa">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="coa">Chart of accounts</TabsTrigger>
          <TabsTrigger value="journals">Manual journals</TabsTrigger>
          <TabsTrigger value="recode">Find &amp; recode</TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
        </TabsList>

        <TabsContent value="coa" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Code</TableHead><TableHead>Account</TableHead><TableHead>Type</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {chartOfAccounts.map(a => (
                    <TableRow key={a.code}>
                      <TableCell className="text-sm font-medium">{a.code}</TableCell>
                      <TableCell className="text-sm">{a.name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{a.type}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journals" className="mt-4">
          <Card>
            <CardContent className="p-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Journal</TableHead><TableHead>Date</TableHead>
                    <TableHead>Narration</TableHead><TableHead>Debit</TableHead>
                    <TableHead>Credit</TableHead><TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journals.map(j => (
                    <TableRow key={j.id}>
                      <TableCell className="text-sm font-medium">{j.id}</TableCell>
                      <TableCell className="text-sm">{j.date}</TableCell>
                      <TableCell className="text-sm">{j.narration}</TableCell>
                      <TableCell className="text-sm">{j.debit}</TableCell>
                      <TableCell className="text-sm">{j.credit}</TableCell>
                      <TableCell className="text-sm font-semibold">{fmoney(j.amount)}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${j.status === "Posted" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                          {j.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recode" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Find &amp; recode</CardTitle>
              <p className="text-sm text-muted-foreground">
                Transactions flagged as miscoded during month-end review, with a suggested account.
              </p>
            </CardHeader>
            <CardContent className="p-4 pt-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead><TableHead>Date</TableHead>
                    <TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead>
                    <TableHead>Current account</TableHead><TableHead>Suggested account</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recodeCandidates.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm font-medium">{r.id}</TableCell>
                      <TableCell className="text-sm">{r.date}</TableCell>
                      <TableCell className="text-sm">{r.description}</TableCell>
                      <TableCell className="text-sm text-right">{fmoney(r.amount)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.currentAccount}</TableCell>
                      <TableCell className="text-sm">{r.suggested}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline">Recode</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflow" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">How accounting is used</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead><TableHead>Detail</TableHead>
                    <TableHead>Owner</TableHead><TableHead>Trigger</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workflow.map(w => (
                    <TableRow key={w.action}>
                      <TableCell className="text-sm font-medium">{w.action}</TableCell>
                      <TableCell className="text-sm">{w.detail}</TableCell>
                      <TableCell className="text-sm">{w.owner}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{w.trigger}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
