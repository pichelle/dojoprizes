"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import FeedbackButton from "./FeedbackButton";

const NAV_LINKS = [
  { href: "/requests", label: "Requests", icon: "/icons/nav-requests.png" },
  { href: "/catalog", label: "Prize Bin", icon: "/icons/nav-catalog.png" },
  { href: "/checkouts", label: "Checkouts", icon: "/icons/nav-checkouts.png" },
  { href: "/filament", label: "Filaments", icon: "/icons/nav-filaments.png" },
];

// Shared spacing between the four groups (primary nav / external tools /
// support+logout / signature) -- pulled out as a constant rather than
// repeated inline so the "more breathing room between sections" spacing
// stays consistent if it ever needs adjusting again.
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
  const className = `flex sm:flex-col items-center gap-3 sm:gap-1 px-3 sm:px-2 py-2 rounded-md sm:rounded-2xl text-sm sm:text-[10px] transition-colors text-center ${
    isActive
      ? "text-ink font-bold"
      : "text-ink-soft font-medium hover:bg-nav-hover hover:text-ink"
  }`;
  const style = isActive ? { background: "var(--color-nav-active)" } : undefined;
  const iconEl = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={icon} alt="" className="w-7 h-7 sm:w-6 sm:h-6 object-contain shrink-0" aria-hidden="true" />
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

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col items-center w-full sm:w-auto">
      <Link href="/requests" className="block shrink-0">
        <Image src="/ninja.png" alt="DojoPrizes" width={40} height={40} className="rounded-full" priority />
      </Link>

      <div className={GROUP_DIVIDER} />

      <nav className="flex flex-row sm:flex-col items-stretch gap-1.5 flex-wrap w-full">
        {NAV_LINKS.map((link) => (
          <NavItem key={link.href} {...link} isActive={pathname.startsWith(link.href)} />
        ))}
      </nav>

      <div className={GROUP_DIVIDER} />

      <nav className="flex flex-row sm:flex-col items-stretch gap-1.5 flex-wrap w-full">
        <NavItem href="https://makerworld.com/en" label="MakerWorld" icon="/makerworld-icon.png" external />
        <NavItem href="https://www.tinkercad.com/" label="Tinkercad" icon="/tinkercad-icon.png" external />
      </nav>

      <div className={GROUP_DIVIDER} />

      <div className="flex flex-row sm:flex-col items-stretch gap-1.5 flex-wrap w-full">
        <FeedbackButton className="flex sm:flex-col items-center gap-3 sm:gap-1 px-3 sm:px-2 py-2 rounded-md sm:rounded-2xl text-sm sm:text-[10px] text-ink-soft font-medium transition-colors hover:bg-nav-hover hover:text-ink text-center" />
        <form action="/api/logout" method="POST">
          <button
            type="submit"
            className="flex sm:flex-col items-center gap-3 sm:gap-1 px-3 sm:px-2 py-2 rounded-md sm:rounded-2xl text-sm sm:text-[10px] text-ink-soft font-medium transition-colors hover:bg-nav-hover hover:text-ink w-full text-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/nav-logout.png"
              alt=""
              className="w-7 h-7 sm:w-6 sm:h-6 object-contain shrink-0"
              aria-hidden="true"
            />
            Log out
          </button>
        </form>
      </div>
    </div>
  );
}
