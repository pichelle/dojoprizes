import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import RequestForm from "../RequestForm";
import { updateRequest, deleteRequest } from "../actions";
import ActionButton from "@/components/ActionButton";

export const dynamic = "force-dynamic";

export default async function EditRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: request } = await supabase
    .from("requests")
    .select("*")
    .eq("id", id)
    .single();

  if (!request) notFound();

  const { data: prizes } = await supabase
    .from("prizes")
    .select("id, name")
    .order("name");

  const { data: filaments } = await supabase
    .from("filaments")
    .select("id, color_name, swatch_hex")
    .order("color_name");

  const { data: franchiseTags } = await supabase
    .from("franchise_tags")
    .select("id, name")
    .order("name");

  const { data: tagLinks } = await supabase
    .from("request_franchise_tags")
    .select("tag:franchise_tags(name)")
    .eq("request_id", id);

  const initialFranchiseTags = (
    (tagLinks as { tag: { name: string } | null }[] | null) ?? []
  )
    .map((l) => l.tag?.name)
    .filter((n): n is string => !!n);

  const { data: filamentLinks } = await supabase
    .from("request_filaments")
    .select("filament_id")
    .eq("request_id", id);

  const initialColorFilamentIds = (
    (filamentLinks as { filament_id: string }[] | null) ?? []
  ).map((l) => l.filament_id);

  const boundUpdate = updateRequest.bind(null, id);
  const boundDelete = deleteRequest.bind(null, id);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-ink">Edit request</h1>
        <Link
          href="/requests"
          className="text-sm text-ink border border-border-warm-strong rounded-md px-3 py-1.5 hover:bg-nav-hover"
        >
          Back to requests
        </Link>
      </div>

      <div className="bg-card border border-border-warm rounded-xl p-6">
        <RequestForm
          action={boundUpdate}
          initial={request}
          initialFranchiseTags={initialFranchiseTags}
          initialColorFilamentIds={initialColorFilamentIds}
          prizes={prizes ?? []}
          filaments={filaments ?? []}
          allFranchiseTags={franchiseTags ?? []}
          submitLabel="Save changes"
        />
      </div>

      <ActionButton
        action={boundDelete}
        toastMessage="Request deleted"
        confirmMessage={`Delete ${request.student_name}'s request? This can't be undone.`}
        className="text-sm text-rust hover:underline"
      >
        Delete this request
      </ActionButton>
    </div>
  );
}
