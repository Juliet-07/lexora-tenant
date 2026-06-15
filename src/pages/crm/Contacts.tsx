import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Building2, Users, Mail, Phone } from "lucide-react";
import { contacts, accounts } from "@/data/crmMockData";

export default function Contacts() {
  const [query, setQuery] = useState("");

  const fc = contacts.filter(c =>
    `${c.name} ${c.accountName} ${c.email}`.toLowerCase().includes(query.toLowerCase()),
  );
  const fa = accounts.filter(a =>
    `${a.name} ${a.industry} ${a.country}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contacts & Accounts</h1>
          <p className="text-sm text-muted-foreground">{accounts.length} accounts · {contacts.length} contacts</p>
        </div>
        <Button className="bg-gradient-to-r from-primary to-secondary">
          <Plus className="h-4 w-4 mr-2" /> Add
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-5 flex items-center gap-3"><div className="p-3 rounded-xl bg-primary/10"><Building2 className="h-5 w-5 text-primary" /></div><div><p className="text-sm text-muted-foreground">Accounts</p><p className="text-xl font-bold">{accounts.length}</p></div></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3"><div className="p-3 rounded-xl bg-info/10"><Users className="h-5 w-5 text-info" /></div><div><p className="text-sm text-muted-foreground">Contacts</p><p className="text-xl font-bold">{contacts.length}</p></div></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3"><div className="p-3 rounded-xl bg-success/10"><Building2 className="h-5 w-5 text-success" /></div><div><p className="text-sm text-muted-foreground">Total ARR</p><p className="text-xl font-bold">${accounts.reduce((s, a) => s + a.arr, 0).toLocaleString()}</p></div></CardContent></Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search contacts and accounts..." value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Last Contacted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fc.map(c => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{c.name}</p>
                          {c.isPrimary && <Badge variant="outline" className="text-[10px]">Primary</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{c.title}</TableCell>
                      <TableCell className="text-sm">{c.accountName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground"><Mail className="inline h-3 w-3 mr-1" />{c.email}</TableCell>
                      <TableCell className="text-xs text-muted-foreground"><Phone className="inline h-3 w-3 mr-1" />{c.phone}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {c.tags.map(t => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.lastContacted}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>ARR</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fa.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium text-sm">{a.name}</TableCell>
                      <TableCell className="text-sm">{a.industry}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{a.size}</Badge></TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{a.tier}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.country}</TableCell>
                      <TableCell className="text-sm">{a.owner}</TableCell>
                      <TableCell className="font-semibold">${a.arr.toLocaleString()}</TableCell>
                      <TableCell><Badge className="text-xs">{a.status}</Badge></TableCell>
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
