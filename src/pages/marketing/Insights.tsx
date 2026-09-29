import { useState } from "react";
import { Landmark, Scale, Leaf, Wallet, TriangleAlert, ChartNoAxesCombined } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MarketingLayout, PageHero } from "@/components/marketing/MarketingLayout";
import { referenceInsights } from "@/data/referenceMarketing";
const icons=[Landmark,Scale,Leaf,Wallet,TriangleAlert,ChartNoAxesCombined];
const bands=["bg-intro","bg-intro-primary","bg-intro-success","bg-intro-gold","bg-destructive","bg-intro-surface"];
export default function Insights() {
 const [email,setEmail]=useState("");
 return <MarketingLayout><PageHero eyebrow="Insights" title="Boardroom Bytes and governance intelligence" subtitle="Analysis, commentary, and practical guidance on governance, risk, and compliance across African markets."/>
 <section className="bg-intro-soft px-5 py-16 text-intro-soft-foreground sm:px-8"><div className="mx-auto max-w-[1200px]"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{referenceInsights.map((item,i)=>{const Icon=icons[i];return <article key={item.title} className="overflow-hidden rounded-lg border border-intro-soft-border bg-intro-soft-raised"><div className={`flex h-40 items-center justify-center ${bands[i]}`}><Icon className="h-12 w-12 text-intro-foreground" strokeWidth={1.25}/></div><div className="p-6"><span className="text-xs font-bold uppercase text-intro-primary">{item.category}</span><h2 className="mt-3 text-lg font-semibold leading-snug">{item.title}</h2><p className="mt-3 text-sm leading-6 text-intro-soft-muted">{item.excerpt}</p></div></article>})}</div><form className="mx-auto mt-12 max-w-xl border-t border-intro-soft-border pt-10 text-center" onSubmit={e=>{e.preventDefault();if(!email.trim())return;toast.info("Newsletter signups are not available yet.")}}><h2 className="font-display text-3xl">Boardroom Bytes Newsletter</h2><p className="mt-3 text-sm text-intro-soft-muted">Monthly governance intelligence, straight to your inbox.</p><div className="mt-5 flex flex-col gap-2 sm:flex-row"><Input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Your work email" className="bg-intro-soft-raised"/><Button type="submit" className="bg-intro-primary text-intro-foreground">Subscribe</Button></div></form></div></section></MarketingLayout>
}
