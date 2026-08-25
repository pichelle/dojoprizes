"use client";

import SidebarNav from "@/components/SidebarNav";
import MobileNav from "@/components/MobileNav";
import ProfilePicker from "@/components/ProfilePicker";
import { useProfiles } from "@/components/ProfileContext";

// Decides between three states: still reading localStorage (render
// nothing for a tick), no profile picked yet (full-screen picker, no nav
// at all -- same treatment as /login, since nothing in the nav is usable
// before a profile's chosen), or picked (the real app shell).
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { activeProfile } = useProfiles();

  if (activeProfile === undefined) return null;

  if (activeProfile === null) return <ProfilePicker />;

  return (
    <div className="min-h-screen flex flex-col sm:block bg-page">
      {/* Mobile (below sm): a fixed bottom tab bar (MobileNav) instead --
          the desktop pill nav was never meant to reflow into a top bar,
          it just used to get squeezed into one. Desktop (sm+): floating,
          vertically-centered pill -- fixed and taken out of flow, so
          `main` gets explicit left padding below to keep content clear
          of it rather than relying on flex to share the space
          automatically. */}
      <aside
        className="hidden sm:block sm:w-auto sm:border sm:border-border-warm sm:rounded-[26px] sm:shadow-sm
                   sm:fixed sm:top-1/2 sm:-translate-y-1/2 sm:left-5 sm:z-40 sm:bg-nav"
      >
        <div className="px-5 py-6 sm:px-3 sm:py-5">
          <SidebarNav />
        </div>
      </aside>
      <MobileNav />
      <main className="flex-1 min-w-0">
        {/* pb-24 clears the fixed bottom tab bar on mobile; sm:pb-0 once
            the bar is gone again at sm+. */}
        <div className="page-fade-in px-6 sm:pl-40 sm:pr-16 py-10 sm:py-12 pb-24 sm:pb-12 max-w-none">
          {children}
        </div>
      </main>
    </div>
  );
}
