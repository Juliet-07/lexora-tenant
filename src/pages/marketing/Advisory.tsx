import { GraduationCap, Handshake } from "lucide-react";
import { CtaBand, MarketingLayout, PageHero } from "@/components/marketing/MarketingLayout";
import { advisoryServices, trainingProgrammes } from "@/data/marketingContent";

export default function Advisory() {
  return (
    <MarketingLayout>
      <PageHero
        eyebrow="Advisory & Training"
        title="The human layer that makes the platform work."
        subtitle="Implementation support and capacity building that accelerate platform adoption and build lasting institutional strength."
      />

      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-intro-primary/15 text-intro-accent">
              <Handshake className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-intro-accent">Advisory</p>
              <h2 className="font-display text-3xl">Implementation that sticks</h2>
            </div>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            {advisoryServices.map((item) => (
              <article key={item.title} className="rounded-2xl border border-intro-foreground/10 bg-intro-surface p-7">
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-intro-muted">{item.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-intro-soft py-20 text-intro-soft-foreground sm:py-24">
        <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-intro-primary/10 text-intro-primary">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-intro-primary">Training</p>
              <h2 className="font-display text-3xl">Capacity that compounds</h2>
            </div>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            {trainingProgrammes.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-intro-soft-border bg-intro-soft-raised p-7"
              >
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-intro-soft-muted">{item.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        title="Bring governance to life."
        copy="Advisory engagements and training programmes tailored to your organisation."
      />
    </MarketingLayout>
  );
}
