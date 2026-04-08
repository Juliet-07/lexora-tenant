import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Download, FileText } from "lucide-react";
import { revenueData, clients } from "@/data/mockData";

const riskData = [
  { name: "Low", value: clients.filter(c => c.riskLevel === "Low").length, color: "hsl(var(--success))" },
  { name: "Medium", value: clients.filter(c => c.riskLevel === "Medium").length, color: "hsl(var(--warning))" },
  { name: "High", value: clients.filter(c => c.riskLevel === "High").length, color: "hsl(var(--destructive))" },
];

export default function Reports() {
  const [reportType, setReportType] = useState("financial");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Reports</h1><p className="text-sm text-muted-foreground">Generate and export reports</p></div>
        <Button variant="outline"><Download className="h-4 w-4 mr-2" /> Export</Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="financial">Financial Summary</SelectItem>
                  <SelectItem value="compliance">Compliance Report</SelectItem>
                  <SelectItem value="risk">Risk Assessment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>From</Label><Input type="date" defaultValue="2025-11-01" /></div>
            <div><Label>To</Label><Input type="date" defaultValue="2026-04-08" /></div>
          </div>
        </CardContent>
      </Card>

      {reportType === "financial" && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Revenue by Month</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `$${v/1000}k`} />
                  <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div><p className="text-sm text-muted-foreground">Total Revenue</p><p className="text-2xl font-bold">${revenueData.reduce((s, d) => s + d.revenue, 0).toLocaleString()}</p></div>
                <div><p className="text-sm text-muted-foreground">Average Monthly</p><p className="text-2xl font-bold">${Math.round(revenueData.reduce((s, d) => s + d.revenue, 0) / revenueData.length).toLocaleString()}</p></div>
                <div><p className="text-sm text-muted-foreground">Peak Month</p><p className="text-2xl font-bold">March</p></div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {reportType === "risk" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Client Risk Distribution</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={riskData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" paddingAngle={4}>
                    {riskData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">High Risk Clients</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {clients.filter(c => c.riskLevel === "High").map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5">
                  <div><p className="text-sm font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{c.type} · {c.country}</p></div>
                  <Badge className="bg-destructive/10 text-destructive text-xs">High Risk</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {reportType === "compliance" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Compliance Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Total KYC Reviews Completed", value: "24", badge: "On Track" },
              { label: "Pending Reviews", value: "3", badge: "Action Needed" },
              { label: "Suspicious Activity Reports", value: "1", badge: "Under Investigation" },
              { label: "PEP Screenings", value: "8", badge: "All Clear" },
              { label: "Document Renewals Due", value: "2", badge: "30 Days" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3"><FileText className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">{item.label}</span></div>
                <div className="flex items-center gap-3"><span className="font-bold">{item.value}</span><Badge variant="outline" className="text-xs">{item.badge}</Badge></div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
