import Link from "next/link";
import Image from "next/image";
import SidebarNav from "@/components/SidebarNav";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex flex-col sm:flex-row bg-page">
      <aside className="sm:w-60 shrink-0 self-start sm:h-screen border-b sm:border-b-0 sm:border-r border-border-warm bg-nav sm:sticky sm:top-0">
        <div className="flex flex-col items-center h-full px-5 py-8">
          <Link href="/requests" className="block">
            <Image
              src="/ninja.png"
              alt="DojoPrizes"
              width={44}
              height={44}
              className="rounded-full"
              priority
            />
          </Link>
          <div className="w-full mt-4">
            <SidebarNav />
            <div className="h-px bg-border-warm my-3" />
            <nav className="flex flex-col gap-1.5 w-full">
              <a
                href="https://makerworld.com/en"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-ink-soft font-medium hover:bg-nav-hover hover:text-ink"
              >
                <Image src="/makerworld-icon.png" alt="" width={20} height={20} aria-hidden="true" className="shrink-0" />
                MakerWorld
              </a>
              <a
                href="https://www.tinkercad.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-ink-soft font-medium hover:bg-nav-hover hover:text-ink"
              >
                <Image src="/tinkercad-icon.png" alt="" width={20} height={20} aria-hidden="true" className="shrink-0" />
                Tinkercad
              </a>
            </nav>
          </div>
          <div className="mt-auto w-full flex flex-col items-center gap-3">
            <div className="flex flex-col items-start gap-2 w-full">
              <a
                href="mailto:michelleepak@gmail.com?subject=DojoPrizes%20bug%2Ffeature"
                className="flex items-center gap-2 text-sm text-muted hover:text-ink"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icons/nav-feedback.png"
                  alt=""
                  className="w-5 h-5 object-contain shrink-0"
                  aria-hidden="true"
                />
                Report a bug / feature
              </a>
              <form action="/api/logout" method="POST">
                <button
                  type="submit"
                  className="text-sm text-muted hover:text-ink"
                >
                  Log out
                </button>
              </form>
            </div>
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
        <div className="page-fade-in px-6 sm:px-16 py-10 sm:py-12 max-w-none">{children}</div>
      </main>
    </div>
  );
}
