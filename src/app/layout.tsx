import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import SidebarNav from "@/components/SidebarNav";
import ToastHost from "@/components/ToastHost";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora" });

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
    <html lang="en" className={`${inter.variable} ${lora.variable}`}>
      <body className="antialiased bg-page text-ink min-h-screen">
        <div className="min-h-screen flex flex-col sm:flex-row">
          <aside className="sm:w-60 shrink-0 border-b sm:border-b-0 sm:border-r border-border-warm bg-card">
            <div className="sm:h-screen sm:sticky sm:top-0 flex flex-col p-6">
              <Link href="/" className="block mb-8 mx-auto">
                <Image
                  src="/ninja.png"
                  alt="DojoPrizes"
                  width={52}
                  height={52}
                  className="rounded-full"
                  priority
                />
              </Link>
              <SidebarNav />
              <div className="mt-auto pt-8 flex flex-col items-center gap-2">
                <form action="/api/logout" method="POST">
                  <button
                    type="submit"
                    className="text-sm text-muted hover:text-ink"
                  >
                    Log out
                  </button>
                </form>
                <span className="font-serif italic text-xs text-muted">
                  by sensei michelle
                </span>
              </div>
            </div>
          </aside>
          <main className="flex-1 min-w-0 bg-dot-grid">
            <div className="px-4 sm:px-10 py-8 max-w-5xl">{children}</div>
          </main>
        </div>
        <ToastHost />
      </body>
    </html>
  );
}
