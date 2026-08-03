"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/requests", label: "Requests", icon: "/icons/nav-requests.png" },
  { href: "/catalog", label: "Prize Catalog", icon: "/icons/nav-catalog.png" },
  { href: "/checkouts", label: "Checkouts", icon: "/icons/nav-checkouts.png" },
  { href: "/filament", label: "Filaments", icon: "/icons/nav-filaments.png" },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-row sm:flex-col items-stretch gap-1.5 flex-wrap w-full">
      {NAV_LINKS.map((link) => {
        const isActive = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? "bg-page text-ink"
                : "text-[#6b6250] hover:bg-page hover:text-ink"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={link.icon}
              alt=""
              className="w-7 h-7 object-contain shrink-0"
              aria-hidden="true"
            />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
