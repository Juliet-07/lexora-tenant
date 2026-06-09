import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, BookOpen, Award, Clock, ShieldAlert } from "lucide-react";
import { courses, certifications, employees } from "@/data/hrMockData";

const certTone = (s: string) =>
  s === "Valid" ? "bg-success/10 text-success border-success/20"
  : s === "Expiring Soon" ? "bg-warning/10 text-warning border-warning/20"
  : "bg-destructive/10 text-destructive border-destructive/20";

export default function HRLearning() {
  const total = courses.reduce((s, c) => s + c.enrolled, 0);
  const completion = Math.round(courses.reduce((s, c) => s + c.completion, 0) / courses.length);
  const certCount = certifications.length;
  const expiring = certifications.filter(c => c.status !== "Valid").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Learning & Development</h1>
        <p className="text-sm text-muted-foreground">Courses, certifications and growth plans.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Courses" value={courses.length} icon={BookOpen} tone="from-primary to-secondary" />
        <Stat label="Enrollments" value={total} icon={GraduationCap} tone="from-blue-500 to-cyan-500" />
        <Stat label="Avg Completion" value={`${completion}%`} icon={Clock} tone="from-emerald-500 to-teal-500" />
        <Stat label="Certs Need Action" value={expiring} icon={ShieldAlert} tone="from-amber-500 to-orange-500" />
      </div>

      <Tabs defaultValue="catalog" className="space-y-4">
        <TabsList><TabsTrigger value="catalog">Course Catalog</TabsTrigger><TabsTrigger value="certs">Certifications</TabsTrigger><TabsTrigger value="paths">Career Paths</TabsTrigger></TabsList>

        <TabsContent value="catalog" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map(c => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{c.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.provider} · {c.durationHours}h</p>
                  </div>
                  {c.mandatory && <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Mandatory</Badge>}
                </div>
                <Badge variant="secondary" className="text-xs">{c.category}</Badge>
                <div>
                  <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Cohort completion</span><span className="font-medium">{c.completion}%</span></div>
                  <Progress value={c.completion} className="h-2" />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{c.enrolled} enrolled</span>
                  <Button size="sm" variant="outline">Enroll team</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="certs">
          <Card><CardHeader><CardTitle className="text-base">Employee Certifications · {certCount}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {certifications.map((c, i) => {
                const emp = employees.find(e => e.id === c.employeeId);
                return (
                  <div key={i} className="flex items-center justify-between border-b pb-2 last:border-b-0">
                    <div className="flex items-center gap-3"><Award className="h-5 w-5 text-primary" /><div><p className="text-sm font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{emp?.firstName} {emp?.lastName} · {c.issuer} · expires {c.expires}</p></div></div>
                    <Badge variant="outline" className={certTone(c.status)}>{c.status}</Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paths" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: "Engineering IC Track", from: "Engineer I", to: "Staff Engineer", steps: ["Engineer I","Engineer II","Senior","Staff"], people: 3 },
            { title: "People Manager Track", from: "Senior IC", to: "Director", steps: ["Senior IC","Lead","Manager","Director"], people: 2 },
            { title: "Sales Excellence", from: "AE", to: "VP Sales", steps: ["AE","Senior AE","Manager","Director","VP"], people: 1 },
          ].map(p => (
            <Card key={p.title}>
              <CardContent className="p-5 space-y-3">
                <h3 className="font-semibold">{p.title}</h3>
                <p className="text-xs text-muted-foreground">{p.from} → {p.to}</p>
                <ol className="space-y-1 mt-2 text-sm">
                  {p.steps.map((s, i) => <li key={i} className="flex items-center gap-2"><span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-semibold">{i + 1}</span>{s}</li>)}
                </ol>
                <Badge variant="outline">{p.people} active</Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: any; icon: any; tone: string }) {
  return (
    <Card><CardContent className="p-5 flex items-center justify-between">
      <div><p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p><p className="text-2xl font-bold mt-1">{value}</p></div>
      <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${tone} flex items-center justify-center`}><Icon className="h-5 w-5 text-white" /></div>
    </CardContent></Card>
  );
}
