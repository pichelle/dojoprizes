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
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm bg-white border border-neutral-200 rounded-xl shadow-sm p-8">
        <h1 className="text-xl font-semibold text-neutral-900">🥋 DojoPrizes</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Staff access only. Enter the shared password to continue.
        </p>

        <form action="/api/login" method="POST" className="mt-6 space-y-4">
          <input type="hidden" name="next" value={next} />
          <PasswordField />

          {hasError && (
            <p className="text-sm text-red-600">
              That password isn&apos;t right. Try again.
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-md bg-neutral-900 text-white text-sm font-medium py-2 hover:bg-neutral-800"
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}
