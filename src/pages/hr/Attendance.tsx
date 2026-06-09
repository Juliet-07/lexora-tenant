import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, LogIn, LogOut, MapPin, Users, CalendarDays, TrendingUp } from "lucide-react";
import { attendanceRecords as initial, type AttendanceRecord } from "@/data/hrMockData";
import { useToast } from "@/hooks/use-toast";

const statusColor = (s: AttendanceRecord["status"]) =>
  s === "Present" || s === "Remote" ? "bg-success/10 text-success border-success/20"
  : s === "Late" ? "bg-warning/10 text-warning border-warning/20"
  : s === "Half-day" ? "bg-info/10 text-info border-info/20"
  : s === "On Leave" ? "bg-muted text-muted-foreground border-border"
  : "bg-destructive/10 text-destructive border-destructive/20";

export default function HRAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>(initial);
  const [clockedIn, setClockedIn] = useState(false);
  const [shiftStart, setShiftStart] = useState<string | null>(null);
  const { toast } = useToast();

  const present = records.filter(r => r.status === "Present" || r.status === "Remote").length;
  const late = records.filter(r => r.status === "Late").length;
  const absent = records.filter(r => r.status === "Absent").length;
  const onLeave = records.filter(r => r.status === "On Leave").length;
  const avg = (records.reduce((s, r) => s + r.hoursWorked, 0) / Math.max(1, records.filter(r => r.hoursWorked > 0).length)).toFixed(1);

  const clockIn = () => {
    const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    setClockedIn(true); setShiftStart(now);
    toast({ title: "Clocked in", description: `Shift started at ${now}.` });
  };
  const clockOut = () => {
    const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    setClockedIn(false);
    toast({ title: "Clocked out", description: `Shift ended at ${now}. Great work!` });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Time & Attendance</h1>
        <p className="text-sm text-muted-foreground">Daily attendance, shifts and overtime — for {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}.</p>
      </div>

      <Card className="bg-gradient-to-br from-primary/10 via-secondary/5 to-background border-primary/20">
        <CardContent className="p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center"><Clock className="h-7 w-7 text-white" /></div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Your Shift</p>
              <p className="text-xl font-bold">{clockedIn ? `In since ${shiftStart}` : "Not clocked in"}</p>
              <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" />Office — Lagos · WiFi verified</p>
            </div>
          </div>
          {clockedIn ? (
            <Button onClick={clockOut} variant="destructive" size="lg"><LogOut className="h-4 w-4 mr-2" /> Clock Out</Button>
          ) : (
            <Button onClick={clockIn} size="lg" className="bg-gradient-to-r from-primary to-secondary"><LogIn className="h-4 w-4 mr-2" /> Clock In</Button>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Stat label="Present" value={present} icon={Users} tone="from-emerald-500 to-teal-500" />
        <Stat label="Late" value={late} icon={Clock} tone="from-amber-500 to-orange-500" />
        <Stat label="Absent" value={absent} icon={Users} tone="from-rose-500 to-red-500" />
        <Stat label="On Leave" value={onLeave} icon={CalendarDays} tone="from-violet-500 to-purple-600" />
        <Stat label="Avg Hours" value={`${avg}h`} icon={TrendingUp} tone="from-blue-500 to-cyan-500" />
      </div>

      <Tabs defaultValue="today" className="space-y-4">
        <TabsList><TabsTrigger value="today">Today's Log</TabsTrigger><TabsTrigger value="trends">Weekly Trends</TabsTrigger><TabsTrigger value="overtime">Overtime</TabsTrigger></TabsList>

        <TabsContent value="today">
          <Card><CardHeader><CardTitle className="text-base">Daily Attendance Log</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {records.map(r => (
                <div key={r.id} className="flex items-center justify-between gap-3 py-3 border-b last:border-b-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9"><AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xs font-semibold">{r.employeeName.split(" ").map(n => n[0]).join("").slice(0, 2)}</AvatarFallback></Avatar>
                    <div className="min-w-0"><p className="text-sm font-medium truncate">{r.employeeName}</p><p className="text-xs text-muted-foreground truncate">{r.location ?? "—"}</p></div>
                  </div>
                  <div className="hidden md:flex items-center gap-6 text-xs text-muted-foreground">
                    <div><p>In</p><p className="font-mono text-sm text-foreground">{r.clockIn ?? "—"}</p></div>
                    <div><p>Out</p><p className="font-mono text-sm text-foreground">{r.clockOut ?? "—"}</p></div>
                    <div><p>Hours</p><p className="font-mono text-sm text-foreground">{r.hoursWorked.toFixed(1)}</p></div>
                  </div>
                  <Badge variant="outline" className={statusColor(r.status)}>{r.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card><CardHeader><CardTitle className="text-base">Last 7 Days · Attendance Rate</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d, i) => {
                const v = [96, 94, 98, 92, 95, 40, 30][i];
                return <div key={d}><div className="flex justify-between text-sm mb-1"><span>{d}</span><span className="font-medium">{v}%</span></div><Progress value={v} className="h-2" /></div>;
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overtime">
          <Card><CardHeader><CardTitle className="text-base">Overtime — This Pay Period</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[{ n: "Amelia Okonkwo", h: 12.5, rate: "1.5×" }, { n: "Liam Walsh", h: 8, rate: "1.5×" }, { n: "Marco Bianchi", h: 5.5, rate: "1.5×" }, { n: "Noah Petrov", h: 3, rate: "1.0×" }].map(o => (
                <div key={o.n} className="flex items-center justify-between border-b pb-2 last:border-b-0">
                  <div><p className="text-sm font-medium">{o.n}</p><p className="text-xs text-muted-foreground">{o.rate} rate</p></div>
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">{o.h}h</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
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
