import Image from "next/image";
import PasswordField from "./PasswordField";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = params.next ?? "/";
  const hasError = params.error === "1";

  return (
    <div className="min-h-screen flex items-center justify-center bg-page bg-dot-grid px-4">
      <div className="w-full max-w-sm bg-card border border-border-warm rounded-xl p-8">
        <Image src="/wordmark.png" alt="DojoPrizes" width={160} height={46} priority />
        <p className="mt-3 text-sm text-muted">
          Hey there! Enter the password to get in.
        </p>

        <form action="/api/login" method="POST" className="mt-6 space-y-4">
          <input type="hidden" name="next" value={next} />
          <PasswordField />

          {hasError && (
            <p className="text-sm text-rust">
              That password isn&apos;t right. Try again.
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-md bg-ink text-page text-sm font-medium py-2 hover:opacity-90"
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}
