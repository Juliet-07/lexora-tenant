import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock, Landmark, Scale, Leaf, Wallet, TriangleAlert, ChartNoAxesCombined } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MarketingLayout, PageHero } from "@/components/marketing/MarketingLayout";
import { insightArticles } from "@/data/insightArticles";

const icons = [Landmark, Scale, Leaf, Wallet, TriangleAlert, ChartNoAxesCombined];
const bands = ["bg-intro", "bg-intro-primary", "bg-intro-success", "bg-intro-gold", "bg-destructive", "bg-intro-surface"];
const backLink = <Button asChild variant="ghost" className="px-0 text-intro-primary hover:bg-transparent hover:text-intro-soft-foreground"><Link to="/insights"><ArrowLeft className="h-4 w-4" /> Back to insights</Link></Button>;

export default function Insights() {
  const [email, setEmail] = useState("");
  const { articleSlug } = useParams();
  const article = insightArticles.find(item => item.slug === articleSlug);

  if (articleSlug) {
    if (!article) return <MarketingLayout><PageHero eyebrow="Insights" title="Article not found" subtitle="This article is no longer available or the link is incorrect." /><section className="bg-intro-soft px-5 py-16 text-center">{backLink}</section></MarketingLayout>;
    const related = insightArticles.filter(item => item.slug !== article.slug).slice(0, 2);
    return <MarketingLayout>
      <PageHero eyebrow={article.category} title={article.title} subtitle={article.excerpt} />
      <section className="bg-intro-soft-raised px-5 py-12 text-intro-soft-foreground sm:px-8">
        <article className="mx-auto max-w-[760px]">
          {backLink}
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-intro-soft-border pb-6 text-sm text-intro-soft-muted"><span>{article.author}</span><span className="inline-flex items-center gap-2"><Clock className="h-4 w-4" />{article.readTime}</span><span className="text-xs font-medium uppercase tracking-wide">Sample article</span></div>
          <p className="mt-8 text-lg leading-8">{article.excerpt}</p>
          {article.sections.map(section => <section key={section.title} className="mt-10"><h2 className="font-display text-3xl leading-tight">{section.title}</h2>{section.paragraphs.map(paragraph => <p key={paragraph} className="mt-4 text-base leading-8 text-intro-soft-muted">{paragraph}</p>)}</section>)}
          <aside className="mt-10 border-l-4 border-intro-primary bg-intro-soft p-6"><h2 className="text-lg font-semibold">Key takeaways</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-intro-soft-muted">{article.takeaways.map(item => <li key={item}>{item}</li>)}</ul></aside>
          <div className="mt-10 border-t border-intro-soft-border pt-6">{backLink}</div>
        </article>
      </section>
      <section className="bg-intro-soft px-5 py-12 text-intro-soft-foreground sm:px-8"><div className="mx-auto max-w-[1000px]"><h2 className="font-display text-3xl">More from Boardroom Bytes</h2><div className="mt-6 grid gap-5 sm:grid-cols-2">{related.map(item => <article key={item.slug} className="rounded-lg border border-intro-soft-border bg-intro-soft-raised p-6"><span className="text-xs font-bold uppercase text-intro-primary">{item.category}</span><h3 className="mt-3 text-lg font-semibold"><Link className="hover:text-intro-primary" to={`/insights/${item.slug}`}>{item.title}</Link></h3><p className="mt-3 text-sm leading-6 text-intro-soft-muted">{item.excerpt}</p><ReadMore slug={item.slug} title={item.title} /></article>)}</div></div></section>
    </MarketingLayout>;
  }

  return <MarketingLayout><PageHero eyebrow="Insights" title="Boardroom Bytes and governance intelligence" subtitle="Analysis, commentary, and practical guidance on governance, risk, and compliance across African markets." />
    <section className="bg-intro-soft px-5 py-16 text-intro-soft-foreground sm:px-8"><div className="mx-auto max-w-[1200px]">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{insightArticles.map((item, i) => {
        const Icon = icons[i] ?? Landmark;
        return <article key={item.slug} className="flex flex-col overflow-hidden rounded-lg border border-intro-soft-border bg-intro-soft-raised"><Link to={`/insights/${item.slug}`} aria-label={`Read ${item.title}`} className={`flex h-40 items-center justify-center ${bands[i]} transition-opacity hover:opacity-90`}><Icon className="h-12 w-12 text-intro-foreground" strokeWidth={1.25} /></Link><div className="flex flex-1 flex-col p-6"><span className="text-xs font-bold uppercase text-intro-primary">{item.category}</span><h2 className="mt-3 text-lg font-semibold leading-snug"><Link to={`/insights/${item.slug}`} className="transition-colors hover:text-intro-primary">{item.title}</Link></h2><p className="mt-3 text-sm leading-6 text-intro-soft-muted">{item.excerpt}</p><div className="mt-auto pt-5"><span className="flex items-center gap-1.5 text-xs text-intro-soft-muted"><Clock className="h-3.5 w-3.5" />{item.readTime}</span><ReadMore slug={item.slug} title={item.title} /></div></div></article>;
      })}</div>
      <form className="mx-auto mt-12 max-w-xl border-t border-intro-soft-border pt-10 text-center" onSubmit={e => { e.preventDefault(); if (!email.trim()) return; toast.info("Newsletter signups are not available yet."); }}><h2 className="font-display text-3xl">Boardroom Bytes Newsletter</h2><p className="mt-3 text-sm text-intro-soft-muted">Monthly governance intelligence, straight to your inbox.</p><div className="mt-5 flex flex-col gap-2 sm:flex-row"><Input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Your work email" className="bg-intro-soft-raised" /><Button type="submit" className="bg-intro-primary text-intro-foreground">Subscribe</Button></div></form>
    </div></section>
  </MarketingLayout>;
}

function ReadMore({ slug, title }: { slug: string; title: string }) {
  return <Button asChild variant="ghost" className="mt-3 h-auto px-0 text-intro-primary hover:bg-transparent hover:text-intro-soft-foreground"><Link to={`/insights/${slug}`} aria-label={`Read more: ${title}`}>Read more <ArrowRight className="h-4 w-4" /></Link></Button>;
}