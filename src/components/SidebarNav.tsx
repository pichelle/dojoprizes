"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import FeedbackButton from "./FeedbackButton";
import { useProfiles } from "./ProfileContext";

// Desktop-only now (sm+) -- the floating vertical pill. Below sm, MobileNav
// (bottom tab bar + "More" sheet) takes over entirely; see AppShell.tsx.
export const NAV_LINKS = [
  { href: "/requests", label: "Requests", icon: "/icons/nav-requests.png" },
  { href: "/catalog", label: "Prize Bin", icon: "/icons/nav-catalog.png" },
  { href: "/checkouts", label: "Checkouts", icon: "/icons/nav-checkouts.png" },
  { href: "/filament", label: "Filaments", icon: "/icons/nav-filaments.png" },
];

const GROUP_DIVIDER = "h-px bg-border-warm my-4 sm:my-5 w-full";

function NavItem({
  href,
  label,
  icon,
  isActive,
  external,
}: {
  href: string;
  label: string;
  icon: string;
  isActive?: boolean;
  external?: boolean;
}) {
  const className = `flex flex-col items-center gap-1 px-2 py-2 rounded-2xl text-[10px] transition-colors text-center ${
    isActive
      ? "text-ink font-bold"
      : "text-ink-soft font-medium hover:bg-nav-hover hover:text-ink"
  }`;
  const style = isActive ? { background: "var(--color-nav-active)" } : undefined;
  const iconEl = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={icon} alt="" className="w-6 h-6 object-contain shrink-0" aria-hidden="true" />
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className} style={style}>
        {iconEl}
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className={className} style={style}>
      {iconEl}
      {label}
    </Link>
  );
}

function ActiveProfileButton() {
  const { activeProfile, switchProfile } = useProfiles();
  if (!activeProfile) return null;

  return (
    <button
      type="button"
      onClick={switchProfile}
      title="Switch profile"
      className="flex flex-col items-center gap-1 px-2 py-2 rounded-2xl text-[10px] text-ink-soft font-medium transition-colors hover:bg-nav-hover hover:text-ink text-center w-full"
    >
      {/* Square with rounded corners (not a circle) so it matches the
          other nav icons' shape, same w-6/h-6 sizing. */}
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
      {/* Just the first name, no "Sensei" prefix -- keeps this compact
          next to the other single-word nav labels. */}
      <span className="truncate">{activeProfile.name}</span>
    </button>
  );
}

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col items-center">
      <Link href="/requests" className="block shrink-0">
        <Image src="/ninja.png" alt="DojoPrizes" width={40} height={40} className="rounded-full" priority />
      </Link>

      <div className={GROUP_DIVIDER} />

      <nav className="flex flex-col items-stretch gap-1.5 w-full">
        {NAV_LINKS.map((link) => (
          <NavItem key={link.href} {...link} isActive={pathname.startsWith(link.href)} />
        ))}
      </nav>

      <div className={GROUP_DIVIDER} />

      <nav className="flex flex-col items-stretch gap-1.5 w-full">
        <NavItem href="https://makerworld.com/en" label="MakerWorld" icon="/makerworld-icon.png" external />
        <NavItem href="https://www.tinkercad.com/" label="Tinkercad" icon="/tinkercad-icon.png" external />
      </nav>

      <div className={GROUP_DIVIDER} />

      <div className="flex flex-col items-stretch gap-1.5 w-full">
        <ActiveProfileButton />
        <FeedbackButton className="flex flex-col items-center gap-1 px-2 py-2 rounded-2xl text-[10px] text-ink-soft font-medium transition-colors hover:bg-nav-hover hover:text-ink text-center" />
        <form action="/api/logout" method="POST">
          <button
            type="submit"
            className="flex flex-col items-center gap-1 px-2 py-2 rounded-2xl text-[10px] text-ink-soft font-medium transition-colors hover:bg-nav-hover hover:text-ink w-full text-center"
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
      </div>
    </div>
  );
}
