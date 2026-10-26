import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Landmark,
  Scale,
  Leaf,
  Wallet,
  TriangleAlert,
  ChartNoAxesCombined,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  MarketingLayout,
  PageHero,
} from "@/components/marketing/MarketingLayout";
import { api } from "@/lib/api";

// Public "Insights" blog — authored by Super Admin (see
// lexora-super-admin's Insights page) and served from
// GET /public/insights (+ /:slug for the article page). No auth.
const CATEGORY_ICON: Record<string, typeof Landmark> = {
  Governance: Landmark,
  Compliance: Scale,
  ESG: Leaf,
  Finance: Wallet,
  Risk: TriangleAlert,
  Technology: ChartNoAxesCombined,
};
const CATEGORY_BAND: Record<string, string> = {
  Governance: "bg-intro",
  Compliance: "bg-intro-primary",
  ESG: "bg-intro-success",
  Finance: "bg-intro-gold",
  Risk: "bg-destructive",
  Technology: "bg-intro-surface",
};

interface PublicInsight {
  _id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content?: string;
  coverImage?: string;
  author?: string;
  publishedAt: string;
}

async function fetchPublicInsights(): Promise<PublicInsight[]> {
  const res = await api.get("/public/insights");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
}

async function fetchPublicInsight(slug: string): Promise<PublicInsight> {
  const res = await api.get(`/public/insights/${slug}`);
  return res.data?.data ?? res.data;
}

function NewsletterSubscribeForm() {
  const [email, setEmail] = useState("");
  const subscribeMut = useMutation({
    mutationFn: () =>
      api.post("/public/newsletter/subscribe", {
        email,
        source: "insights-page",
      }),
    onSuccess: () => {
      toast.success("Subscribed! Watch your inbox for Boardroom Bytes.");
      setEmail("");
    },
    onError: () =>
      toast.error("Couldn't subscribe right now. Please try again shortly."),
  });

  return (
    <form
      className="mx-auto mt-12 max-w-xl border-t border-intro-soft-border pt-10 text-center"
      onSubmit={(e) => {
        e.preventDefault();
        if (!email.trim()) return;
        subscribeMut.mutate();
      }}
    >
      <h2 className="font-display text-3xl">Boardroom Bytes Newsletter</h2>
      <p className="mt-3 text-sm text-intro-soft-muted">
        Monthly governance intelligence, straight to your inbox.
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your work email"
          className="bg-intro-soft-raised"
          disabled={subscribeMut.isPending}
        />
        <Button
          type="submit"
          disabled={subscribeMut.isPending}
          className="bg-intro-primary text-intro-foreground"
        >
          {subscribeMut.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Subscribe"
          )}
        </Button>
      </div>
    </form>
  );
}

function InsightsGrid() {
  const { data: insights = [], isLoading } = useQuery({
    queryKey: ["public-insights"],
    queryFn: fetchPublicInsights,
    staleTime: 60 * 1000,
  });

  return (
    <section className="bg-intro-soft px-5 py-16 text-intro-soft-foreground sm:px-8">
      <div className="mx-auto max-w-[1200px]">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-intro-soft-muted" />
          </div>
        ) : insights.length === 0 ? (
          <p className="py-16 text-center text-sm text-intro-soft-muted">
            New articles are on the way — check back soon.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {insights.map((item) => {
              const Icon = CATEGORY_ICON[item.category] ?? Landmark;
              const band = CATEGORY_BAND[item.category] ?? "bg-intro";
              return (
                <Link
                  key={item._id}
                  to={`/insights/${item.slug}`}
                  className="overflow-hidden rounded-lg border border-intro-soft-border bg-intro-soft-raised transition-transform duration-300 hover:-translate-y-1"
                >
                  {item.coverImage ? (
                    <div className="h-40 w-full overflow-hidden">
                      <img
                        src={item.coverImage}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className={`flex h-40 items-center justify-center ${band}`}
                    >
                      <Icon
                        className="h-12 w-12 text-intro-foreground"
                        strokeWidth={1.25}
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <span className="text-xs font-bold uppercase text-intro-primary">
                      {item.category}
                    </span>
                    <h2 className="mt-3 text-lg font-semibold leading-snug">
                      {item.title}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-intro-soft-muted">
                      {item.excerpt}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        <NewsletterSubscribeForm />
      </div>
    </section>
  );
}

function InsightArticle({ slug }: { slug: string }) {
  const {
    data: article,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["public-insight", slug],
    queryFn: () => fetchPublicInsight(slug),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-intro-muted" />
      </div>
    );
  }

  if (isError || !article) {
    return (
      <div className="px-5 py-24 text-center sm:px-8">
        <p className="text-intro-muted">That article couldn't be found.</p>
        <Link
          to="/insights"
          className="mt-4 inline-flex items-center gap-2 text-sm text-intro-primary hover:underline"
        >
          <ArrowLeft size={16} /> Back to Insights
        </Link>
      </div>
    );
  }

  return (
    <article className="border-b border-intro-foreground/10 px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-[760px]">
        <Link
          to="/insights"
          className="inline-flex items-center gap-2 text-sm text-intro-muted hover:text-intro-foreground"
        >
          <ArrowLeft size={16} /> All Insights
        </Link>
        <p className="mt-8 text-xs font-bold uppercase text-intro-accent">
          {article.category}
        </p>
        <h1 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">
          {article.title}
        </h1>
        <p className="mt-4 text-sm text-intro-muted">
          {article.author ? `By ${article.author} · ` : ""}
          {new Date(article.publishedAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
        {article.coverImage && (
          <img
            src={article.coverImage}
            alt=""
            className="mt-8 aspect-[16/9] w-full rounded-lg object-cover"
          />
        )}
        <div
          className="prose prose-invert mt-10 max-w-none leading-7 text-intro-muted prose-img:mx-auto prose-img:my-6 prose-img:w-full prose-img:rounded-lg prose-figure:my-8 prose-figcaption:mt-2 prose-figcaption:text-center prose-figcaption:text-sm prose-hr:my-10 prose-blockquote:border-l-4 prose-blockquote:pl-5 prose-blockquote:italic"
          // Rich-text content, authored exclusively by Super Admin.
          dangerouslySetInnerHTML={{ __html: article.content ?? "" }}
        />
      </div>
    </article>
  );
}

export default function Insights() {
  const { slug } = useParams();

  if (slug) {
    return (
      <MarketingLayout>
        <InsightArticle slug={slug} />
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout>
      <PageHero
        eyebrow="Insights"
        title="Boardroom Bytes and governance intelligence"
        subtitle="Analysis, commentary, and practical guidance on governance, risk, and compliance across African markets."
      />
      <InsightsGrid />
    </MarketingLayout>
  );
}
