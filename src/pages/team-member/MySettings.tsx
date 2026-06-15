import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User as UserIcon, Lock, Bell, Upload } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export default function MySettings() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "profile";
  const valid = useMemo(() => new Set(["profile", "password", "notifications"]), []);
  const active = valid.has(tab) ? tab : "profile";
  const setTab = (v: string) => {
    const next = new URLSearchParams(params);
    next.set("tab", v);
    setParams(next, { replace: true });
  };

  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("Team Member");

  const [current, setCurrent] = useState("");
  const [next1, setNext1] = useState("");
  const [confirm, setConfirm] = useState("");

  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
  const [notifLeave, setNotifLeave] = useState(true);
  const [notifPayroll, setNotifPayroll] = useState(true);

  const initials = (fullName || "TM")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const saveProfile = () => toast({ title: "Profile updated", description: "Your details have been saved." });
  const changePwd = () => {
    if (!current || !next1 || next1 !== confirm) {
      toast({ title: "Check your inputs", description: "Passwords must match.", variant: "destructive" });
      return;
    }
    setCurrent(""); setNext1(""); setConfirm("");
    toast({ title: "Password changed", description: "Use your new password on next sign-in." });
  };
  const saveNotif = () => toast({ title: "Preferences saved" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile, password and notifications.</p>
      </div>

      <Tabs value={active} onValueChange={setTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile"><UserIcon className="h-4 w-4 mr-2" /> Profile</TabsTrigger>
          <TabsTrigger value="password"><Lock className="h-4 w-4 mr-2" /> Password</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-2" /> Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Update your personal information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm"><Upload className="h-4 w-4 mr-2" /> Upload photo</Button>
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Full name</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234..." />
                </div>
                <div className="space-y-2">
                  <Label>Job title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={saveProfile}>Save changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Change password</CardTitle>
              <CardDescription>Use at least 8 characters with a mix of letters and numbers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label>Current password</Label>
                <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>New password</Label>
                <Input type="password" value={next1} onChange={(e) => setNext1(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Confirm new password</Label>
                <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <div className="flex justify-end">
                <Button onClick={changePwd}>Update password</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Choose how you want to be notified.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Email notifications", desc: "Get key updates by email", val: notifEmail, set: setNotifEmail },
                { label: "Push notifications", desc: "In-app and browser alerts", val: notifPush, set: setNotifPush },
                { label: "Leave updates", desc: "When your leave request status changes", val: notifLeave, set: setNotifLeave },
                { label: "Payroll & payslip", desc: "When a new payslip is ready", val: notifPayroll, set: setNotifPayroll },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{r.label}</p>
                    <p className="text-xs text-muted-foreground">{r.desc}</p>
                  </div>
                  <Switch checked={r.val} onCheckedChange={r.set} />
                </div>
              ))}
              <div className="flex justify-end">
                <Button onClick={saveNotif}>Save preferences</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
