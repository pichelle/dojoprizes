import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "DojoPrizes",
  description: "Internal prize catalog, request log, and inventory tracker",
};

const NAV_LINKS = [
  { href: "/catalog", label: "Prize Catalog", icon: "🎁" },
  { href: "/requests", label: "Request Log", icon: "📝" },
  { href: "/checkouts", label: "Checkouts", icon: "✅" },
  { href: "/filament", label: "Filament", icon: "🧵" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-neutral-50 text-neutral-900 min-h-screen">
        <div className="min-h-screen flex flex-col sm:flex-row">
          <aside className="sm:w-56 shrink-0 border-b sm:border-b-0 sm:border-r border-neutral-200 bg-white">
            <div className="sm:h-screen sm:sticky sm:top-0 flex flex-col p-4">
              <Link href="/catalog" className="font-semibold text-neutral-900 px-2 py-2">
                🥋 DojoPrizes
              </Link>
              <nav className="mt-4 flex flex-row sm:flex-col gap-1 flex-wrap">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="px-3 py-2 rounded-md text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 flex items-center gap-2"
                  >
                    <span>{link.icon}</span>
                    {link.label}
                  </Link>
                ))}
              </nav>
              <form action="/api/logout" method="POST" className="mt-auto pt-4 sm:pt-8">
                <button
                  type="submit"
                  className="text-sm text-neutral-500 hover:text-neutral-900 px-2"
                >
                  Log out
                </button>
              </form>
            </div>
          </aside>
          <main className="flex-1 min-w-0 px-4 sm:px-8 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
