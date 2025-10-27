export function createPageUrl(pageName: string) {
  // Basic mapping for known page names used across the app.
  const map: Record<string, string> = {
    Home: "/",
    Index: "/",
    Dashboard: "/dashboard",
    RegisterMedia: "/register",
    VerifyMedia: "/verify",
    TrustGraph: "/trust-graph",
    DeveloperDocs: "/docs",
    FAQ: "/faq",
    MyDashboard: "/mydashboard",
  };

  return map[pageName] ?? `/${pageName.toLowerCase()}`;
}
