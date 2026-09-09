import { CtaBand, MarketingLayout, PageHero } from "@/components/marketing/MarketingLayout";
import { solutions } from "@/data/marketingContent";

export default function Solutions() {
  return (
    <MarketingLayout>
      <PageHero
        eyebrow="Solutions"
        title="Lexora adapts to how your organisation operates."
        subtitle="One platform, configured around the mandate you carry — whether that is a boardroom, a fund, a regulator-facing entity, or a growing business."
      />

      <section className="bg-intro-soft py-20 text-intro-soft-foreground sm:py-24">
        <div className="mx-auto grid max-w-[1320px] gap-5 px-5 sm:px-8 lg:grid-cols-3">
            {solutions.map((solution, i) => {
            return (
              <article
                key={solution.title}
                className="border-t border-intro-soft-border py-8"
              >
                <span className="text-xs font-semibold text-intro-primary">0{i + 1}</span>
                <h2 className="mt-5 font-display text-2xl leading-tight">{solution.title}</h2>
                <p className="mt-3 text-sm leading-6 text-intro-soft-muted">{solution.copy}</p>
              </article>
            );
          })}
        </div>
      </section>

      <CtaBand
        title="Find the right configuration."
        copy="Tell us about your organisation and we will show you the modules that fit."
      />
    </MarketingLayout>
  );
}
