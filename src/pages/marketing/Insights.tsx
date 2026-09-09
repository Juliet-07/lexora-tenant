import { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { MarketingLayout, PageHero } from "@/components/marketing/MarketingLayout";
import { articleCategories, articles } from "@/data/marketingContent";
import { cn } from "@/lib/utils";

export default function Insights() {
  const [category, setCategory] = useState("All");
  const [email, setEmail] = useState("");

  const featured = articles.filter((a) => a.featured);
  const rest = useMemo(
    () => articles.filter((a) => !a.featured && (category === "All" || a.category === category)),
    [category],
  );

  return (
    <MarketingLayout>
      <PageHero
        eyebrow="Insights"
        title="Perspectives on governance and African business."
        subtitle="Governance, compliance, risk, and the future of African business infrastructure."
      />

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
          <div className="grid gap-4 lg:grid-cols-2">
            {featured.map((article) => (
              <article
                key={article.title}
                className="group border-t border-intro-gold/50 bg-intro-surface p-8"
              >
                <span className="rounded-full bg-intro-accent/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-intro-accent">
                  Featured · {article.category}
                </span>
                <h2 className="mt-5 font-display text-3xl leading-tight">{article.title}</h2>
                <p className="mt-4 text-sm leading-6 text-intro-muted">{article.excerpt}</p>
                <p className="mt-6 flex items-center gap-2 text-xs text-intro-muted">
                  {article.read} · {article.date}
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </p>
              </article>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap gap-2">
            {articleCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-xs font-medium transition-colors",
                  category === cat
                    ? "border-intro-primary bg-intro-primary/20 text-intro-foreground"
                    : "border-intro-foreground/12 text-intro-muted hover:text-intro-foreground",
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {rest.map((article) => (
              <article
                key={article.title}
                  className="group flex flex-col border-t border-intro-foreground/15 py-7 transition-colors hover:border-intro-gold"
              >
                <span className="text-[10px] font-bold uppercase tracking-wide text-intro-accent">
                  {article.category}
                </span>
                <h3 className="mt-4 text-lg font-semibold leading-snug">{article.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-6 text-intro-muted">{article.excerpt}</p>
                <p className="mt-5 text-xs text-intro-muted">
                  {article.read} · {article.date}
                </p>
              </article>
            ))}
            {rest.length === 0 && (
              <p className="text-sm text-intro-muted">No articles in this category yet.</p>
            )}
          </div>
        </div>
      </section>

      <section className="border-y border-intro-foreground/10 bg-intro-surface py-16">
        <div className="mx-auto max-w-[720px] px-5 text-center sm:px-8">
          <h2 className="font-display text-3xl">Stay in the loop</h2>
          <p className="mt-3 text-sm leading-6 text-intro-muted">
            Governance insights, regulatory updates, and platform news delivered to your inbox monthly. No spam,
            unsubscribe anytime.
          </p>
          <form
            className="mx-auto mt-7 flex max-w-md flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (!email.trim()) return;
              toast.success("You're subscribed. Look out for the next issue.");
              setEmail("");
            }}
          >
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="h-11 border-intro-foreground/15 bg-intro text-intro-foreground placeholder:text-intro-muted"
            />
            <Button type="submit" className="h-11 bg-intro-primary px-6 text-intro-foreground hover:bg-intro-primary/90">
              Subscribe
            </Button>
          </form>
        </div>
      </section>
    </MarketingLayout>
  );
}
