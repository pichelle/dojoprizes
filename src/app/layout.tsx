import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora" });

export const metadata: Metadata = {
  title: "DojoPrizes",
  description: "Internal prize catalog, request log, and inventory tracker",
};

const NAV_LINKS = [
  { href: "/catalog", label: "Prize catalog" },
  { href: "/requests", label: "Request log" },
  { href: "/checkouts", label: "Checkouts" },
  { href: "/filament", label: "Filament" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable}`}>
      <body className="antialiased bg-page text-ink min-h-screen">
        <div className="min-h-screen flex flex-col sm:flex-row">
          <aside className="sm:w-60 shrink-0 border-b sm:border-b-0 sm:border-r border-border-warm bg-card">
            <div className="sm:h-screen sm:sticky sm:top-0 flex flex-col p-6">
              <Link href="/catalog" className="block mb-8">
                <Image
                  src="/wordmark.png"
                  alt="DojoPrizes"
                  width={145}
                  height={42}
                  priority
                />
              </Link>
              <nav className="flex flex-row sm:flex-col gap-1 flex-wrap">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="px-3 py-2 rounded-md text-[15px] text-muted hover:text-ink border-l-2 border-transparent hover:border-clay transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <form action="/api/logout" method="POST" className="mt-auto pt-8">
                <button
                  type="submit"
                  className="text-sm text-muted hover:text-ink px-3"
                >
                  Log out
                </button>
              </form>
            </div>
          </aside>
          <main className="flex-1 min-w-0 bg-dot-grid">
            <div className="px-4 sm:px-10 py-8 max-w-5xl">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
