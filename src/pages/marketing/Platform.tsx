import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CtaBand, MarketingLayout, PageHero } from "@/components/marketing/MarketingLayout";
import { referencePlatform } from "@/data/referencePlatform";

export default function Platform() {
  const [selected, setSelected] = useState(0);
  const module = referencePlatform[selected];
  return <MarketingLayout>
    <PageHero eyebrow="Platform" title="Five modules that work as one" subtitle="Every plan includes every module. No feature gates. The only variable is team size."/>
    <section className="bg-intro-soft px-5 py-12 text-intro-soft-foreground sm:px-8 sm:py-20"><div className="mx-auto max-w-[1200px]">
      <div role="tablist" aria-label="Platform modules" className="flex gap-2 overflow-x-auto border-b border-intro-soft-border pb-3">
        {referencePlatform.map((item,index)=><Button key={item.name} role="tab" aria-selected={selected===index} aria-controls="module-panel" id={`module-tab-${index}`} onClick={()=>setSelected(index)} variant={selected===index?"default":"ghost"} className={`shrink-0 ${selected===index?"bg-intro-primary text-intro-foreground":"text-intro-soft-muted hover:text-intro-soft-foreground"}`}>{item.name}</Button>)}
      </div>
      <div id="module-panel" role="tabpanel" aria-labelledby={`module-tab-${selected}`} key={module.name} className="marketing-enter mt-10 grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div><h2 className="font-display text-4xl leading-tight">{module.title}</h2><p className="mt-5 max-w-xl text-sm leading-7 text-intro-soft-muted">{module.copy}</p><ul className="mt-7 space-y-3">{module.features.map(feature=><li key={feature} className="flex items-start gap-3 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-intro-primary"/>{feature}</li>)}</ul></div>
        <div className="overflow-hidden rounded-lg border border-intro-foreground/10 bg-intro text-intro-foreground shadow-intro-deep"><div className="flex h-10 items-center gap-1.5 border-b border-intro-foreground/10 px-5" aria-hidden="true"><span className="h-2 w-2 rounded-full bg-destructive"/><span className="h-2 w-2 rounded-full bg-warning"/><span className="h-2 w-2 rounded-full bg-success"/></div><div className="p-6">{module.rows.map(([name,value])=><div key={name} className="flex justify-between gap-4 border-b border-intro-foreground/10 py-4 text-sm last:border-0"><span>{name}</span><span className="text-right font-semibold text-intro-accent">{value}</span></div>)}</div></div>
      </div>
    </div></section>
    <CtaBand title="See the full platform." copy="Book a tailored walkthrough of the modules your organisation needs."/>
  </MarketingLayout>;
}
