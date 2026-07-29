import type { Metadata } from "next";
import { Figtree, Space_Grotesk } from "next/font/google";
import "./globals.css";
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
        {children}
        <ToastHost />
      </body>
    </html>
  );
}
