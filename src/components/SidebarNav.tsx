"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListTodo, Gift, ClipboardList, CheckSquare, Palette } from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Queue", icon: ListTodo, exact: true },
  { href: "/requests", label: "Requests", icon: ClipboardList },
  { href: "/catalog", label: "Prize Catalog", icon: Gift },
  { href: "/checkouts", label: "Checkouts", icon: CheckSquare },
  { href: "/filament", label: "Filaments", icon: Palette },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-row sm:flex-col items-center gap-1.5 flex-wrap">
      {NAV_LINKS.map((link) => {
        const isActive = link.exact
          ? pathname === link.href
          : pathname.startsWith(link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? "bg-page text-ink"
                : "text-[#6b6250] hover:bg-page hover:text-ink"
            }`}
          >
            <Icon size={17} strokeWidth={2} aria-hidden="true" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
