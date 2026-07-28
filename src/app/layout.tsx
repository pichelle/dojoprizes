import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Digital Prize Bin",
  description: "Internal prize catalog, request log, and inventory tracker",
};

const NAV_LINKS = [
  { href: "/catalog", label: "Prize Catalog" },
  { href: "/requests", label: "Request Log" },
  { href: "/checkouts", label: "Checkouts" },
  { href: "/filament", label: "Filament" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-neutral-50 text-neutral-900 min-h-screen">
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-neutral-200 bg-white">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
              <Link href="/catalog" className="font-semibold text-neutral-900">
                🎁 Digital Prize Bin
              </Link>
              <nav className="flex flex-wrap gap-1 sm:gap-2 text-sm">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="px-3 py-1.5 rounded-md text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <form action="/api/logout" method="POST" className="sm:ml-auto">
                <button
                  type="submit"
                  className="text-sm text-neutral-500 hover:text-neutral-900"
                >
                  Log out
                </button>
              </form>
            </div>
          </header>
          <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
