"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import FeedbackButton from "./FeedbackButton";
import BottomSheet from "./BottomSheet";
import { useProfiles } from "./ProfileContext";
import { NAV_LINKS } from "./SidebarNav";

// Bottom tab bar for the 4 main sections (equally-weighted, frequently
// switched between -- see the mobile nav discussion) plus a "More" tab
// that opens a bottom sheet for everything used rarely in a session
// (external tools, profile switch, feedback, log out). Sized "roomy" --
// bigger touch targets than the desktop pill nav's icons, since these are
// tapped with a thumb, not clicked with a mouse.
export default function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const { activeProfile, switchProfile } = useProfiles();

  return (
    <>
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-30 flex bg-nav border-t border-border-warm pb-[env(safe-area-inset-bottom)]"
        aria-label="Main"
      >
        {NAV_LINKS.map((link) => {
          const isActive = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex-1 flex flex-col items-center gap-1 pt-2 pb-1.5 mx-1 my-1 rounded-2xl text-[11px] transition-colors ${
                isActive ? "text-ink font-bold" : "text-ink-soft font-medium"
              }`}
              style={isActive ? { background: "var(--color-nav-active)" } : undefined}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={link.icon} alt="" className="w-7 h-7 object-contain shrink-0" aria-hidden="true" />
              {link.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-label="More"
          className="flex-1 flex flex-col items-center gap-1 pt-2 pb-1.5 mx-1 my-1 rounded-2xl text-[11px] text-ink-soft font-medium"
        >
          <span className="w-7 h-7 flex items-center justify-center shrink-0 text-lg leading-none">&#8943;</span>
          More
        </button>
      </nav>

      <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <a
          href="https://makerworld.com/en"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-2 py-2.5 rounded-md text-sm text-ink-soft font-medium hover:bg-nav-hover hover:text-ink"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/makerworld-icon.png" alt="" className="w-6 h-6 object-contain shrink-0" aria-hidden="true" />
          MakerWorld
        </a>
        <a
          href="https://www.tinkercad.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-2 py-2.5 rounded-md text-sm text-ink-soft font-medium hover:bg-nav-hover hover:text-ink"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/tinkercad-icon.png" alt="" className="w-6 h-6 object-contain shrink-0" aria-hidden="true" />
          Tinkercad
        </a>

        <div className="h-px bg-border-warm my-2" />

        {activeProfile && (
          <button
            type="button"
            onClick={() => {
              setMoreOpen(false);
              switchProfile();
            }}
            className="flex items-center gap-3 px-2 py-2.5 rounded-md text-sm text-ink-soft font-medium hover:bg-nav-hover hover:text-ink w-full text-left"
          >
            <span
              className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
              style={{ background: activeProfile.color_hex }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeProfile.avatar_url ?? "/ninja.png"}
                alt=""
                aria-hidden="true"
                className="max-w-[70%] max-h-[70%] object-contain"
              />
            </span>
            Switch profile ({activeProfile.name})
          </button>
        )}
        <FeedbackButton className="flex items-center gap-3 px-2 py-2.5 rounded-md text-sm text-ink-soft font-medium hover:bg-nav-hover hover:text-ink w-full text-left" />
        <form action="/api/logout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-3 px-2 py-2.5 rounded-md text-sm text-ink-soft font-medium hover:bg-nav-hover hover:text-ink w-full text-left"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/nav-logout.png"
              alt=""
              className="w-6 h-6 object-contain shrink-0"
              aria-hidden="true"
            />
            Log out
          </button>
        </form>
      </BottomSheet>
    </>
  );
}
