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
        <h1 className="text-xl font-semibold text-neutral-900">
          Digital Prize Bin
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Staff access only. Enter the shared password to continue.
        </p>

        <form action="/api/login" method="POST" className="mt-6 space-y-4">
          <input type="hidden" name="next" value={next} />
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-neutral-700"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoFocus
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

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
