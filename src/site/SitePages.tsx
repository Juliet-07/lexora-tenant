import { lazy, Suspense } from "react";
import { Navigate, useParams } from "react-router-dom";
import HtmlView from "./HtmlView";
import {
  advisoryViews,
  homeView,
  legacyAdvisorySlugs,
  legacyIndustrySlugs,
  profileViews,
  sectorViews,
  staticViews,
} from "./siteViews";

const ContactView = lazy(() => import("./ContactView"));
const InsightsView = lazy(() => import("./InsightsView"));

export const HomePage = () => <HtmlView view={homeView} />;

export const StaticPage = ({ name }: { name: keyof typeof staticViews }) => (
  <HtmlView key={name} view={staticViews[name]} />
);

export function SectorPage() {
  const { slug = "" } = useParams();
  const view = sectorViews[slug];
  if (!view) {
    const legacy = legacyIndustrySlugs[slug];
    return (
      <Navigate to={legacy ? `/industries/${legacy}` : "/industries"} replace />
    );
  }
  return <HtmlView key={view.id} view={view} />;
}

export function AdvisoryServicePage() {
  const { slug = "" } = useParams();
  const view = advisoryViews[slug];
  if (!view) {
    const legacy = legacyAdvisorySlugs[slug];
    return (
      <Navigate to={legacy ? `/advisory/${legacy}` : "/advisory"} replace />
    );
  }
  return <HtmlView key={view.id} view={view} />;
}

export function ProfilePage() {
  const { slug = "" } = useParams();
  const view = profileViews[slug];
  if (!view) return <Navigate to="/about" replace />;
  return <HtmlView key={view.id} view={view} />;
}

const Fallback = () => <div style={{ minHeight: "60vh" }} />;

export const InsightsPage = () => (
  <Suspense fallback={<Fallback />}>
    <InsightsView />
  </Suspense>
);

export const ContactPage = () => (
  <Suspense fallback={<Fallback />}>
    <ContactView />
  </Suspense>
);
