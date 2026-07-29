"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListTodo, Gift, ClipboardList, CheckSquare, Palette } from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Prizes in queue", icon: ListTodo, exact: true },
  { href: "/catalog", label: "Prize catalog", icon: Gift },
  { href: "/requests", label: "Request log", icon: ClipboardList },
  { href: "/checkouts", label: "Checkouts", icon: CheckSquare },
  { href: "/filament", label: "Filament", icon: Palette },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-row sm:flex-col gap-1 flex-wrap">
      {NAV_LINKS.map((link) => {
        const isActive = link.exact
          ? pathname === link.href
          : pathname.startsWith(link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md text-[13px] font-medium transition-colors ${
              isActive
                ? "bg-page text-ink"
                : "text-[#6b6250] hover:bg-page hover:text-ink"
            }`}
          >
            <Icon size={16} strokeWidth={2} aria-hidden="true" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
