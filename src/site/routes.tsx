import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";

// Public marketing site (see ./SiteLayout and ./views). The whole site is
// code-split so signed-in users never download it.
const SiteLayout = lazy(() => import("./SiteLayout"));
const page = <K extends string>(name: K) =>
  lazy(() =>
    import("./SitePages").then((m) => ({
      default: (m as unknown as Record<K, React.ComponentType<any>>)[name],
    })),
  );
const HomePage = page("HomePage");
const StaticPage = page("StaticPage");
const SectorPage = page("SectorPage");
const AdvisoryServicePage = page("AdvisoryServicePage");
const ProfilePage = page("ProfilePage");
const InsightsPage = page("InsightsPage");
const ContactPage = page("ContactPage");

const Splash = () => (
  <div style={{ minHeight: "100vh", background: "#0E1A33" }} />
);

export const siteRoutes = (
  <Route
    element={
      <Suspense fallback={<Splash />}>
        <SiteLayout />
      </Suspense>
    }
  >
    <Route path="/" element={<HomePage />} />
    <Route path="/platform" element={<StaticPage name="platform" />} />
    <Route path="/pricing" element={<StaticPage name="pricing" />} />
    <Route path="/industries" element={<StaticPage name="industries" />} />
    <Route path="/industries/:slug" element={<SectorPage />} />
    <Route path="/advisory" element={<StaticPage name="advisory" />} />
    <Route path="/advisory/:slug" element={<AdvisoryServicePage />} />
    <Route path="/insights" element={<InsightsPage />} />
    <Route path="/insights/:slug" element={<InsightsPage />} />
    <Route path="/events" element={<StaticPage name="events" />} />
    <Route path="/about" element={<StaticPage name="about" />} />
    <Route path="/about/:slug" element={<ProfilePage />} />
    <Route path="/contact" element={<ContactPage />} />
  </Route>
);
