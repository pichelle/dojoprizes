import type { Metadata } from "next";
import { Figtree, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import SidebarNav from "@/components/SidebarNav";
import ToastHost from "@/components/ToastHost";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "DojoPrizes",
  description: "Internal prize catalog, request log, and inventory tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${figtree.variable} ${spaceGrotesk.variable}`}>
      <body className="antialiased bg-page text-ink min-h-screen">
        <div className="min-h-screen flex flex-col sm:flex-row bg-dot-grid">
          <aside className="sm:w-60 shrink-0 self-start sm:h-[calc(100vh-2rem)] border-b sm:border-b-0 border-border-warm bg-card sm:m-4 sm:rounded-xl sm:border sm:sticky sm:top-4">
            <div className="flex flex-col items-center h-full p-5">
              <Link href="/" className="block">
                <Image
                  src="/ninja.png"
                  alt="DojoPrizes"
                  width={44}
                  height={44}
                  className="rounded-full"
                  priority
                />
              </Link>
              <div className="flex-1 flex flex-col justify-center w-full">
                <SidebarNav />
              </div>
              <div className="flex flex-col items-center gap-2">
                <form action="/api/logout" method="POST">
                  <button
                    type="submit"
                    className="text-sm text-muted hover:text-ink"
                  >
                    Log out
                  </button>
                </form>
                <Image
                  src="/signature.png"
                  alt="by sensei michelle"
                  width={140}
                  height={22}
                />
              </div>
            </div>
          </aside>
          <main className="flex-1 min-w-0">
            <div className="page-fade-in px-6 sm:px-16 py-10 sm:py-12 max-w-5xl">{children}</div>
          </main>
        </div>
        <ToastHost />
      </body>
    </html>
  );
}
