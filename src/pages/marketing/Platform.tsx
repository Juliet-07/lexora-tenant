import { Check } from "lucide-react";
import { CtaBand, MarketingLayout, PageHero } from "@/components/marketing/MarketingLayout";
import { modules } from "@/data/marketingContent";

export default function Platform() {
  return (
    <MarketingLayout>
      <PageHero
        eyebrow="The platform"
        title={<>Five integrated modules.<br />One unified data layer.</>}
        subtitle="Each module works independently. Together, they form a complete operating system for a governance-focused organisation."
      />

      <section className="bg-intro-soft py-20 text-intro-soft-foreground sm:py-24">
        <div className="mx-auto max-w-[1320px] space-y-6 px-5 sm:px-8">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <article
                key={module.name}
                className="grid gap-8 rounded-2xl border border-intro-soft-border bg-intro-soft-raised p-7 sm:p-10 lg:grid-cols-[1fr_1fr]"
              >
                <div>
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-intro-primary/10 text-intro-primary">
                      <Icon className="h-6 w-6" />
                    </span>
                    <span className="text-xs font-semibold text-intro-soft-muted">{module.number}</span>
                  </div>
                  <h2 className="mt-6 font-display text-3xl leading-tight">{module.name}</h2>
                  <p className="mt-4 max-w-lg text-sm leading-6 text-intro-soft-muted">{module.description}</p>
                </div>
                <ul className="grid grid-cols-1 gap-x-6 gap-y-2.5 self-center sm:grid-cols-2">
                  {module.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-intro-soft-foreground/90">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-intro-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      <CtaBand
        title="See the full platform."
        copy="Book a tailored walkthrough of the modules your organisation needs."
      />
    </MarketingLayout>
  );
}
