import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User as UserIcon, Lock, Crown, Landmark, ShieldCheck } from "lucide-react";

import ProfileTab from "./Profile";
import SecurityTab from "./Security";
import PlanTab from "./Plan";
import PaymentDetailsTab from "./PaymentDetails";
import RolesTab from "./Roles";

export default function Settings() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "profile";
  const validTabs = useMemo(
    () => new Set(["profile", "security", "roles", "plan", "payment-details"]),
    [],
  );
  const active = validTabs.has(tab) ? tab : "profile";

  const setTab = (v: string) => {
    const next = new URLSearchParams(params);
    next.set("tab", v);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your profile, security and subscription.
        </p>
      </div>

      <Tabs value={active} onValueChange={setTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">
            <UserIcon className="h-4 w-4 mr-2" /> Profile
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="h-4 w-4 mr-2" /> Security
          </TabsTrigger>
          <TabsTrigger value="roles">
            <ShieldCheck className="h-4 w-4 mr-2" /> Roles
          </TabsTrigger>
          <TabsTrigger value="plan">
            <Crown className="h-4 w-4 mr-2" /> Plan
          </TabsTrigger>
          <TabsTrigger value="payment-details">
            <Landmark className="h-4 w-4 mr-2" /> Payment details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>
        <TabsContent value="roles">
          <RolesTab />
        </TabsContent>
        <TabsContent value="plan">
          <PlanTab />
        </TabsContent>
        <TabsContent value="payment-details">
          <PaymentDetailsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
