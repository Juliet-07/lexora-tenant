import { TabsContent } from "@/components/ui/tabs";
import OnboardingDocumentsTab from "../OnboardingDocuments";

export function OnboardingTab() {
  return (
    <TabsContent value="onboarding" className="space-y-4">
      <OnboardingDocumentsTab />
    </TabsContent>
  );
}
