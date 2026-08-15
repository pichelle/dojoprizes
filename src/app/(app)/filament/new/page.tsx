import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { createFilament } from "../actions";
import FilamentForm from "../FilamentForm";

// Always fetch fresh prize list rather than a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function NewFilamentPage() {
  const supabase = createServerClient();

  const { data: prizes } = await supabase
    .from("prizes")
    .select("id, name")
    .order("name");

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-ink">Add a filament color</h1>
        <Link
          href="/filament"
          className="text-sm text-ink border border-border-warm-strong rounded-md px-3 py-1.5 hover:bg-nav"
        >
          Back to filament
        </Link>
      </div>

      <div className="bg-card border border-border-warm rounded-xl p-6">
        <FilamentForm
          action={createFilament}
          allPrizes={prizes ?? []}
          submitLabel="Add filament"
        />
      </div>
    </div>
  );
}
