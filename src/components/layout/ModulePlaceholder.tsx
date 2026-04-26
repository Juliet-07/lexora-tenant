import { useModule, MODULES } from "@/contexts/ModuleContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const CAPABILITIES: Record<string, { title: string; items: string[] }[]> = {
  aml: [
    {
      title: "Onboarding & Screening",
      items: [
        "Digital onboarding",
        "CDD / EDD",
        "UBO identification",
        "Sanctions & PEP screening",
      ],
    },
    {
      title: "Monitoring & Reporting",
      items: [
        "Risk scoring",
        "Transaction monitoring",
        "SAR / STR management",
        "Regulatory reporting",
      ],
    },
  ],
  grc: [
    {
      title: "Risk Management",
      items: [
        "Risk register",
        "Risk appetite framework",
        "Third-party risk",
        "Incident management",
      ],
    },
    {
      title: "Controls & Assurance",
      items: [
        "Control library & testing",
        "Compliance monitoring",
        "Policy management",
        "Audit support",
        "BCP / DR",
      ],
    },
  ],
  crm: [
    {
      title: "Client Lifecycle",
      items: [
        "Contact & account management",
        "Lead scoring",
        "Opportunity pipeline",
        "Client portal",
      ],
    },
    {
      title: "Delivery & Billing",
      items: [
        "Project planning & execution",
        "Resource management",
        "Time tracking",
        "Billing & invoicing",
        "Contract & document management",
        "E-signing",
      ],
    },
  ],
  hr: [
    {
      title: "People Operations",
      items: [
        "HRIS",
        "Time & attendance",
        "Leave management",
        "Performance management",
        "Recruitment",
        "L&D",
      ],
    },
    {
      title: "Payroll & Benefits",
      items: [
        "Rwanda payroll (PAYE, RSSB, CBHI)",
        "Tanzania payroll (PAYE, NSSF, SDL, WCF)",
        "Benefits administration",
        "Succession planning",
        "Employee relations",
      ],
    },
  ],
};

export function ModulePlaceholder() {
  const { currentModule, setModule } = useModule();
  const Icon = currentModule.icon;
  const caps = CAPABILITIES[currentModule.id] ?? [];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start gap-4">
        <div
          className={`w-14 h-14 rounded-xl bg-gradient-to-br ${currentModule.color} flex items-center justify-center shrink-0`}
        >
          <Icon className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1">
          <Badge variant="outline" className="mb-2">
            Module
          </Badge>
          <h1 className="text-2xl font-bold tracking-tight">
            {currentModule.name}
          </h1>
          <p className="text-muted-foreground mt-1">{currentModule.scope}</p>
        </div>
      </div>

      <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
        <div className="flex items-center gap-2 text-sm font-medium text-primary mb-1">
          <Sparkles className="w-4 h-4" />
          Module preview
        </div>
        <p className="text-sm text-muted-foreground">
          Detailed screens for this module are being built. Below is the scope of
          capabilities planned for {currentModule.shortName}.
        </p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {caps.map((group) => (
          <Card key={group.title} className="p-5">
            <h3 className="font-semibold mb-3">{group.title}</h3>
            <ul className="space-y-2">
              {group.items.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h3 className="font-semibold mb-3">Switch module</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {MODULES.filter((m) => m.id !== currentModule.id).map((m) => {
            const MIcon = m.icon;
            return (
              <Button
                key={m.id}
                variant="outline"
                className="justify-start h-auto py-3"
                onClick={() => setModule(m.id)}
              >
                <div
                  className={`w-8 h-8 rounded-md bg-gradient-to-br ${m.color} flex items-center justify-center mr-3`}
                >
                  <MIcon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-semibold">{m.shortName}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    {m.scope}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </Button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
