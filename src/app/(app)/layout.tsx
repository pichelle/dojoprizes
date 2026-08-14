import SidebarNav from "@/components/SidebarNav";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex flex-col sm:block bg-page">
      {/* Mobile: a normal in-flow top bar, unchanged from before. */}
      {/* Desktop (sm+): floating, vertically-centered pill -- fixed and
          taken out of flow, so `main` gets explicit left padding below
          to keep content clear of it rather than relying on flex to
          share the space automatically. */}
      <aside
        className="w-full border-b border-border-warm bg-nav
                   sm:w-auto sm:border sm:border-border-warm sm:rounded-[26px] sm:shadow-sm
                   sm:fixed sm:top-1/2 sm:-translate-y-1/2 sm:left-5 sm:z-40"
      >
        <div className="px-5 py-6 sm:px-3 sm:py-5">
          <SidebarNav />
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="page-fade-in px-6 sm:pl-40 sm:pr-16 py-10 sm:py-12 max-w-none">
          {children}
        </div>
      </main>
    </div>
  );
}
