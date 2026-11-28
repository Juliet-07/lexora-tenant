import { FormEvent, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { initView } from "./fx/view";
import { useSite } from "./SiteLayout";

// Insights: the PO's page design filled with the real, Super-Admin authored
// articles (GET /public/insights, GET /public/insights/:slug).

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

async function fetchInsights(): Promise<PublicInsight[]> {
  const res = await api.get("/public/insights");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
}
async function fetchInsight(slug: string): Promise<PublicInsight> {
  const res = await api.get(`/public/insights/${slug}`);
  return res.data?.data ?? res.data;
}

const COVER: Record<string, string> = {
  Governance: "cv-g",
  Compliance: "cv-c",
  Risk: "cv-r",
  ESG: "cv-e",
};
const ICON: Record<string, string> = {
  Governance: "M3 21h18M4 10h16M12 3l9 5H3zM6 10v8M10 10v8M14 10v8M18 10v8",
  Compliance: "M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6zM9 12l2 2 4-4",
  Risk: "M12 3l10 18H2zM12 10v5M12 18v.5",
  ESG: "M5 19c0-9 6-14 15-14 0 9-5 15-14 15M5 19c3-5 6-8 10-10",
};
const DEFAULT_ICON = "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

function Cover({ item, big }: { item: PublicInsight; big?: boolean }) {
  return (
    <div
      className={`cov ${COVER[item.category] ?? "cv-g"}${big ? " big" : ""}`}
    >
      {item.coverImage ? (
        <img
          src={item.coverImage}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        <>
          <span className="cov-grid" />
          <span className="cov-orb" />
          <span className="cov-ic">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={ICON[item.category] ?? DEFAULT_ICON} />
            </svg>
          </span>
        </>
      )}
      <span className="cov-sh" />
      <span className="cov-tag">{item.category}</span>
    </div>
  );
}

function Newsletter() {
  const [msg, setMsg] = useState("");
  const mut = useMutation({
    mutationFn: (email: string) =>
      api.post("/public/newsletter/subscribe", {
        email,
        source: "insights-page",
      }),
    onSuccess: () =>
      setMsg(
        "Thank you. You are now subscribed to the Boardroom Bytes Newsletter.",
      ),
    onError: () =>
      setMsg("We could not subscribe you right now. Please try again shortly."),
  });
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (new FormData(form).get("email") as string | null)?.trim();
    if (!email) return;
    setMsg("");
    mut.mutate(email, { onSuccess: () => form.reset() });
  };
  return (
    <div className="nlx rv">
      <div className="nlx-in">
        <span className="nlx-ic">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 7l9 6 9-6" />
          </svg>
        </span>
        <div>
          <h3>Boardroom Bytes Newsletter</h3>
          <p>Monthly governance intelligence, straight to your inbox.</p>
        </div>
        <form className="sub-form nlf" onSubmit={submit}>
          <label className="sr" htmlFor="lx-ins-email">
            Work email
          </label>
          <input
            id="lx-ins-email"
            name="email"
            type="email"
            required
            placeholder="Your work email"
          />
          <button
            className="btn btn-gold"
            type="submit"
            disabled={mut.isPending}
          >
            {mut.isPending ? "Subscribing" : "Subscribe"}
          </button>
        </form>
      </div>
      <div className="thanks nlt" role="status">
        {msg}
      </div>
    </div>
  );
}

function useAnimated(deps: unknown[]) {
  const ref = useRef<HTMLDivElement>(null);
  const site = useSite();
  useLayoutEffect(() => {
    if (!ref.current) return;
    return initView(ref.current, {
      navigate: () => {},
      playing: site.playing,
      onPlay: site.onPlay,
      hash: "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site, ...deps]);
  return ref;
}

function Listing() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["public-insights"],
    queryFn: fetchInsights,
    staleTime: 60_000,
  });
  const [cat, setCat] = useState("All");
  const [fading, setFading] = useState(false);
  const ref = useAnimated([isLoading, items.length]);

  const cats = useMemo(
    () => [
      "All",
      ...Array.from(new Set(items.map((i) => i.category).filter(Boolean))),
    ],
    [items],
  );
  const featured = items[0];
  const rest = items
    .slice(1)
    .filter((i) => cat === "All" || i.category === cat);

  const pick = (c: string) => {
    if (c === cat) return;
    setFading(true);
    setTimeout(() => {
      setCat(c);
      setFading(false);
    }, 280);
  };

  return (
    <div ref={ref} id="insights" className="view on sector">
      <section className="inh">
        <div className="aurora" aria-hidden="true">
          <div className="kaleido k2" />
          <div className="blob b1" />
          <div className="blob b2" />
        </div>
        <canvas className="stars" id="insstars" aria-hidden="true" />
        <div className="inh-shade" />
        <div
          className="wrap center"
          style={{ position: "relative", zIndex: 3 }}
        >
          <span className="pill rv">Insights</span>
          <h1 className="sh1 c">
            <span className="ln">
              <span style={{ ["--d" as string]: ".15s" }}>
                Boardroom Bytes and
              </span>
            </span>
            <span className="ln">
              <span style={{ ["--d" as string]: ".27s" }}>
                <span className="shine">governance intelligence</span>
              </span>
            </span>
          </h1>
          <p
            className="sub rv"
            style={{ ["--d" as string]: ".5s", margin: "0 auto" }}
          >
            Analysis, commentary, and practical guidance on governance, risk,
            and compliance across African markets.
          </p>
          {items.length > 0 && (
            <div className="ticker rv" style={{ ["--d" as string]: ".6s" }}>
              <span className="tk-l">
                <i />
                Latest
              </span>
              <div className="tk-w">
                <div className="tk-r">
                  {[...items.slice(0, 6), ...items.slice(0, 6)].map((i, k) => (
                    <span key={k}>{i.title}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="insb">
        <div className="wrap">
          {isLoading ? (
            <p
              className="sub"
              style={{ textAlign: "center", margin: "60px auto" }}
            >
              Loading articles...
            </p>
          ) : !featured ? (
            <p
              className="sub"
              style={{ textAlign: "center", margin: "80px auto" }}
            >
              New articles are on the way. Check back soon.
            </p>
          ) : (
            <>
              <article className="feat rv">
                <Link to={`/insights/${featured.slug}`} className="feat-a">
                  <Cover item={featured} big />
                  <div className="feat-txt">
                    <span className="kicker">
                      Featured &#183; {featured.category}
                    </span>
                    <h2>{featured.title}</h2>
                    <p>{featured.excerpt}</p>
                    <span className="meta">
                      {featured.author ? `${featured.author} · ` : ""}
                      {fmtDate(featured.publishedAt)}
                    </span>
                    <span className="rd">
                      Read the article <span className="arr">&#8594;</span>
                    </span>
                  </div>
                </Link>
              </article>

              {items.length > 1 && (
                <>
                  <div className="fbar rv">
                    <h2 className="h2">
                      Latest <span className="shine">insights</span>
                    </h2>
                    <div className="chips2">
                      {cats.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={`chipf${c === cat ? " on" : ""}`}
                          onClick={() => pick(c)}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="agrid3" id="artGrid">
                    {rest.map((item, i) => (
                      <article
                        key={item._id}
                        className={`art rv tilt${fading ? " fade" : ""}`}
                        style={{ ["--d" as string]: `${(i % 6) * 0.08}s` }}
                      >
                        <Link to={`/insights/${item.slug}`}>
                          <Cover item={item} />
                          <div className="art-b">
                            <span className="art-k">{item.category}</span>
                            <h3>{item.title}</h3>
                            <p>{item.excerpt}</p>
                            <span className="meta">
                              {fmtDate(item.publishedAt)}
                            </span>
                          </div>
                        </Link>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
          <Newsletter />
        </div>
      </section>
    </div>
  );
}

function Article({ slug }: { slug: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-insight", slug],
    queryFn: () => fetchInsight(slug),
  });
  const ref = useAnimated([isLoading, slug]);

  return (
    <div ref={ref} id="insights" className="view on sector">
      <section className="shero ins-hero">
        <div className="aurora" aria-hidden="true">
          <div className="kaleido k2" />
          <div className="grid-bg" />
          <div className="blob b1" />
          <div className="blob b2" />
        </div>
        <div className="wrap ins-wrap">
          <Link className="back" to="/insights">
            <span>&#8592;</span> All insights
          </Link>
          {isLoading ? (
            <p className="sub">Loading...</p>
          ) : isError || !data ? (
            <>
              <h1 className="sh1">
                <span className="ln">
                  <span style={{ ["--d" as string]: ".15s" }}>
                    That article could not be found.
                  </span>
                </span>
              </h1>
              <p className="sub">It may have been unpublished or moved.</p>
            </>
          ) : (
            <>
              <span className="kicker">{data.category}</span>
              <h1 className="sh1 ins-title">
                <span className="ln">
                  <span style={{ ["--d" as string]: ".15s" }}>
                    {data.title}
                  </span>
                </span>
              </h1>
              <p className="meta ins-meta">
                {data.author ? `By ${data.author} · ` : ""}
                {new Date(data.publishedAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </>
          )}
        </div>
      </section>
      {data && (
        <section className="ins-body">
          <div className="wrap ins-wrap">
            {data.coverImage && (
              <img className="ins-cover" src={data.coverImage} alt="" />
            )}
            {/* Rich-text content, authored exclusively by Super Admin. */}
            <div
              className="ins-prose"
              dangerouslySetInnerHTML={{ __html: data.content ?? "" }}
            />
          </div>
        </section>
      )}
    </div>
  );
}

export default function InsightsView() {
  const { slug } = useParams();
  return slug ? <Article slug={slug} key={slug} /> : <Listing />;
}
