"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { resolveFranchiseTagIds } from "@/lib/franchiseTags";
import { NONE_VALUE } from "@/components/Select";
import type { RequestSize, RequestStatus } from "@/lib/types";

function parseFranchiseTagNames(formData: FormData): string[] {
  return formData.getAll("franchise_tag_names").map(String).filter(Boolean);
}

function fromFormSelect(formData: FormData, key: string): string | null {
  const raw = String(formData.get(key) ?? "").trim();
  return raw && raw !== NONE_VALUE ? raw : null;
}

async function syncRequestFranchiseTagLinks(
  supabase: ReturnType<typeof createServerClient>,
  requestId: string,
  tagIds: string[],
) {
  const { error: deleteError } = await supabase
    .from("request_franchise_tags")
    .delete()
    .eq("request_id", requestId);
  if (deleteError) throw new Error(deleteError.message);

  if (tagIds.length > 0) {
    const { error: linkError } = await supabase
      .from("request_franchise_tags")
      .insert(tagIds.map((tag_id) => ({ request_id: requestId, tag_id })));
    if (linkError) throw new Error(linkError.message);
  }
}

function requestFieldsFromForm(formData: FormData) {
  const prizeId = fromFormSelect(formData, "prize_id");
  const freeText = String(formData.get("free_text_prize") ?? "").trim() || null;

  return {
    student_name: String(formData.get("student_name") ?? "").trim(),
    requested_by: String(formData.get("requested_by") ?? "").trim() || null,
    prize_id: prizeId,
    free_text_prize: prizeId ? null : freeText,
    size: fromFormSelect(formData, "size") as RequestSize | null,
    color_filament_id: fromFormSelect(formData, "color_filament_id"),
    links: String(formData.get("makerworld_link") ?? "").trim() || null,
    is_print_club: formData.get("is_print_club") === "on",
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

export async function createRequest(formData: FormData) {
  const supabase = createServerClient();

  const { data: request, error } = await supabase
    .from("requests")
    .insert({
      ...requestFieldsFromForm(formData),
      date_requested:
        String(formData.get("date_requested") ?? "").trim() ||
        new Date().toISOString().slice(0, 10),
      status: "pending" as RequestStatus,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  if (request) {
    const tagIds = await resolveFranchiseTagIds(
      supabase,
      parseFranchiseTagNames(formData),
    );
    if (tagIds.length > 0) {
      const { error: linkError } = await supabase
        .from("request_franchise_tags")
        .insert(tagIds.map((tag_id) => ({ request_id: request.id, tag_id })));
      if (linkError) throw new Error(linkError.message);
    }
  }

  revalidatePath("/requests");
  revalidatePath("/");
  redirect("/requests");
}

export async function updateRequest(requestId: string, formData: FormData) {
  const supabase = createServerClient();

  const { error } = await supabase
    .from("requests")
    .update(requestFieldsFromForm(formData))
    .eq("id", requestId);

  if (error) throw new Error(error.message);

  const tagIds = await resolveFranchiseTagIds(
    supabase,
    parseFranchiseTagNames(formData),
  );
  await syncRequestFranchiseTagLinks(supabase, requestId, tagIds);

  revalidatePath("/requests");
  revalidatePath("/");
  redirect("/requests");
}

export async function updateRequestStatus(
  requestId: string,
  status: RequestStatus,
) {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("requests")
    .update({ status })
    .eq("id", requestId);
  if (error) throw new Error(error.message);
  revalidatePath("/requests");
  revalidatePath("/");
}

export async function deleteRequest(requestId: string) {
  const supabase = createServerClient();
  const { error } = await supabase.from("requests").delete().eq("id", requestId);
  if (error) throw new Error(error.message);
  revalidatePath("/requests");
  revalidatePath("/");
}
