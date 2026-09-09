import { ModuleGlyph } from "@/components/marketing/Brand";
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
          {modules.map((module, index) => {
            return (
              <article
                key={module.name}
                className="grid gap-8 border-b border-intro-soft-border py-10 last:border-0 lg:grid-cols-[1fr_1fr]"
              >
                <div>
                  <div className="flex items-center gap-4">
                    <ModuleGlyph index={index} className="text-intro-primary" />
                    <span className="text-xs font-semibold text-intro-soft-muted">{module.number}</span>
                  </div>
                  <h2 className="mt-6 font-display text-3xl leading-tight">{module.name}</h2>
                  <p className="mt-4 max-w-lg text-sm leading-6 text-intro-soft-muted">{module.description}</p>
                </div>
                <ul className="grid grid-cols-1 gap-x-6 gap-y-2.5 self-center sm:grid-cols-2">
                  {module.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-intro-soft-foreground/90">
                      <span className="mt-2 h-px w-4 shrink-0 bg-intro-primary" aria-hidden="true" />{feature}
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
