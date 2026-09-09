import { useState } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CtaBand, MarketingLayout, PageHero } from "@/components/marketing/MarketingLayout";
import { modules, plans, pricingFaq } from "@/data/marketingContent";
import { cn } from "@/lib/utils";

export default function Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <MarketingLayout>
      <PageHero
        eyebrow="Simple, transparent pricing"
        title="One platform. Every feature. Priced by team size."
        subtitle="Every plan includes all five modules, every feature, and the full Lexora experience. The only difference is how many people use it."
      />

      <section className="bg-intro-soft py-16 text-intro-soft-foreground sm:py-20">
        <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
          <div className="mb-10 flex justify-center">
            <div className="inline-flex gap-1 rounded-xl bg-intro-soft-border/60 p-1">
              {[
                { label: "Monthly", value: false },
                { label: "Annual", value: true },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setAnnual(opt.value)}
                  className={cn(
                    "rounded-lg px-5 py-2 text-xs font-semibold transition-colors",
                    annual === opt.value
                      ? "bg-intro-primary text-white"
                      : "text-intro-soft-muted hover:text-intro-soft-foreground",
                  )}
                >
                  {opt.label}
                  {opt.value && <span className="ml-1.5 text-[10px] font-bold text-intro-success">Save 20%</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={cn(
                  "relative flex flex-col rounded-2xl border bg-intro-soft-raised p-7",
                  plan.highlight
                    ? "border-intro-primary shadow-intro-glow"
                    : "border-intro-soft-border",
                )}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-7 rounded-full bg-intro-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                    Most popular
                  </span>
                )}
                <p className="text-xs font-bold uppercase tracking-wide text-intro-primary">{plan.name}</p>
                <p className="mt-2 text-sm leading-6 text-intro-soft-muted">{plan.blurb}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  {plan.price ? (
                    <>
                      <span className="font-display text-4xl">
                        ${annual ? Math.round(plan.price * 0.8) : plan.price}
                      </span>
                      <span className="text-sm text-intro-soft-muted">/month</span>
                    </>
                  ) : (
                    <span className="font-display text-4xl">Let's talk</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-intro-soft-muted">{plan.seats}</p>
                <Button
                  asChild
                  className={cn(
                    "mt-6 w-full",
                    plan.highlight
                      ? "bg-intro-primary text-white hover:bg-intro-primary/90"
                      : "border border-intro-soft-border bg-transparent text-intro-soft-foreground hover:bg-intro-soft",
                  )}
                >
                  <Link to="/contact">{plan.cta}</Link>
                </Button>
                <ul className="mt-6 space-y-2 border-t border-intro-soft-border pt-5">
                  {plan.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2 text-xs text-intro-soft-muted">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-intro-success" />
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-intro-accent">What you get</p>
          <h2 className="mt-4 font-display text-4xl sm:text-5xl">Every feature. Every plan.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-intro-muted">
            No feature gates, no upgrade prompts. Every user on every plan has access to the full platform.
          </p>

          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <div key={module.name} className="rounded-2xl border border-intro-foreground/10 bg-intro-surface p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-intro-primary/15 text-intro-accent">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{module.name}</h3>
                  <p className="mt-1.5 text-xs text-intro-muted">{module.short}</p>
                  <ul className="mt-5 space-y-1.5">
                    {module.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-intro-muted">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-intro-success" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-intro-soft py-20 text-intro-soft-foreground">
        <div className="mx-auto max-w-[820px] px-5 sm:px-8">
          <h2 className="text-center font-display text-4xl">Common questions</h2>
          <Accordion type="single" collapsible className="mt-10">
            {pricingFaq.map((item) => (
              <AccordionItem key={item.q} value={item.q} className="border-intro-soft-border">
                <AccordionTrigger className="text-left text-base font-semibold">{item.q}</AccordionTrigger>
                <AccordionContent className="text-sm leading-6 text-intro-soft-muted">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <CtaBand
        title="Not sure which plan fits?"
        copy="Talk to our team and we will help you find the right size."
      />
    </MarketingLayout>
  );
}
