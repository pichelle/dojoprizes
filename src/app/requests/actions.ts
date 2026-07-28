"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { resolveFranchiseTagIds } from "@/lib/franchiseTags";
import type { RequestSize, RequestStatus } from "@/lib/types";

function parseFranchiseTagNames(formData: FormData): string[] {
  return formData.getAll("franchise_tag_names").map(String).filter(Boolean);
}

export async function createRequest(formData: FormData) {
  const supabase = createServerClient();

  const prizeId = String(formData.get("prize_id") ?? "").trim() || null;
  const freeText = String(formData.get("free_text_prize") ?? "").trim() || null;
  const size = (String(formData.get("size") ?? "").trim() || null) as RequestSize | null;
  const colorFilamentId =
    String(formData.get("color_filament_id") ?? "").trim() || null;

  const { data: request, error } = await supabase
    .from("requests")
    .insert({
      student_name: String(formData.get("student_name") ?? "").trim(),
      prize_id: prizeId,
      free_text_prize: prizeId ? null : freeText,
      size,
      color_filament_id: colorFilamentId,
      links: String(formData.get("links") ?? "").trim() || null,
      date_requested:
        String(formData.get("date_requested") ?? "").trim() ||
        new Date().toISOString().slice(0, 10),
      status: "pending" as RequestStatus,
      notes: String(formData.get("notes") ?? "").trim() || null,
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
}

export async function deleteRequest(requestId: string) {
  const supabase = createServerClient();
  const { error } = await supabase.from("requests").delete().eq("id", requestId);
  if (error) throw new Error(error.message);
  revalidatePath("/requests");
}
