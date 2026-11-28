import { MouseEvent, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { initView } from "./fx/view";
import { useSite } from "./SiteLayout";
import { prefersReducedMotion } from "./fx/core";
import type { SiteView } from "./siteViews";

// The marketing pages are authored HTML (ported from the PO's reference site)
// stored in ./views. They are static, trusted content shipped with the app, so
// they are injected as markup; initView() then attaches the animations.
const loaders = import.meta.glob("./views/*.html", {
  query: "?raw",
  import: "default",
}) as Record<string, () => Promise<string>>;

export function useLinkInterceptor() {
  const navigate = useNavigate();
  return (e: MouseEvent<HTMLElement>) => {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as HTMLElement).closest("a");
    if (!a) return;
    const href = a.getAttribute("href");
    if (!href || a.hasAttribute("download") || a.target === "_blank") return;
    if (href.startsWith("#")) {
      e.preventDefault();
      document
        .getElementById(href.slice(1))
        ?.scrollIntoView({
          behavior: prefersReducedMotion() ? "auto" : "smooth",
        });
      return;
    }
    if (href.startsWith("/") && !href.startsWith("//")) {
      e.preventDefault();
      navigate(href);
    }
  };
}

export default function HtmlView({ view }: { view: SiteView }) {
  const ref = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState<string | null>(null);
  const { hash } = useLocation();
  const navigate = useNavigate();
  const site = useSite();
  const onClick = useLinkInterceptor();

  useLayoutEffect(() => {
    let alive = true;
    const load = loaders[`./views/${view.file}.html`];
    if (load) {
      load().then((h) => {
        if (alive) setHtml(h);
      });
    }
    return () => {
      alive = false;
    };
  }, [view.file]);

  useLayoutEffect(() => {
    if (html === null || !ref.current) return;
    const stop = initView(ref.current, {
      navigate,
      playing: site.playing,
      onPlay: site.onPlay,
      hash: hash.slice(1),
    });
    // deep links such as /platform#modules
    let t: number | undefined;
    const id = hash.slice(1);
    if (id && !id.startsWith("ind-")) {
      t = window.setTimeout(() => {
        document
          .getElementById(id)
          ?.scrollIntoView({
            behavior: prefersReducedMotion() ? "auto" : "smooth",
          });
      }, 80);
    }
    return () => {
      clearTimeout(t);
      stop();
    };
    // run once per loaded page; hash changes within the page are handled by
    // the link interceptor / explorer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html]);

  return (
    <div
      ref={ref}
      id={view.id}
      className={`view on ${view.classes ?? ""}`}
      onClick={onClick}
      dangerouslySetInnerHTML={{ __html: html ?? "" }}
    />
  );
}
