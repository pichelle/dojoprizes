"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { resolveFranchiseTagIds } from "@/lib/franchiseTags";
import { NONE_VALUE } from "@/lib/constants";
import type { RequestSize, RequestStatus } from "@/lib/types";

export type RequestFormState = { error: string | null; success?: boolean };

function parseFranchiseTagNames(formData: FormData): string[] {
  return formData.getAll("franchise_tag_names").map(String).filter(Boolean);
}

function parseColorFilamentIds(formData: FormData): string[] {
  return formData.getAll("color_filament_ids").map(String).filter(Boolean);
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

async function syncRequestFilamentLinks(
  supabase: ReturnType<typeof createServerClient>,
  requestId: string,
  filamentIds: string[],
) {
  const { error: deleteError } = await supabase
    .from("request_filaments")
    .delete()
    .eq("request_id", requestId);
  if (deleteError) throw new Error(deleteError.message);

  if (filamentIds.length > 0) {
    const { error: linkError } = await supabase
      .from("request_filaments")
      .insert(filamentIds.map((filament_id) => ({ request_id: requestId, filament_id })));
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
    links: String(formData.get("makerworld_link") ?? "").trim() || null,
    is_print_club: formData.get("is_print_club") === "on",
    notes: String(formData.get("notes") ?? "").trim() || null,
    photo_url: String(formData.get("photo_url") ?? "").trim() || null,
  };
}

// Core logic shared by the redirecting (dedicated page) and non-redirecting
// (side peek) variants below. Never throws -- DB errors are caught and
// returned as form state instead of crashing the page.

async function performCreateRequest(formData: FormData): Promise<RequestFormState> {
  const supabase = createServerClient();
  try {
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

    if (error) return { error: error.message };

    if (request) {
      const tagIds = await resolveFranchiseTagIds(
        supabase,
        parseFranchiseTagNames(formData),
      );
      if (tagIds.length > 0) {
        const { error: linkError } = await supabase
          .from("request_franchise_tags")
          .insert(tagIds.map((tag_id) => ({ request_id: request.id, tag_id })));
        if (linkError) return { error: linkError.message };
      }

      const filamentIds = parseColorFilamentIds(formData);
      if (filamentIds.length > 0) {
        const { error: filamentLinkError } = await supabase
          .from("request_filaments")
          .insert(filamentIds.map((filament_id) => ({ request_id: request.id, filament_id })));
        if (filamentLinkError) return { error: filamentLinkError.message };
      }
    }

    revalidatePath("/requests");
    revalidatePath("/");
    return { error: null, success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Something went wrong. Please try again.",
    };
  }
}

async function performUpdateRequest(
  requestId: string,
  formData: FormData,
): Promise<RequestFormState> {
  const supabase = createServerClient();
  try {
    const { error } = await supabase
      .from("requests")
      .update(requestFieldsFromForm(formData))
      .eq("id", requestId);

    if (error) return { error: error.message };

    const tagIds = await resolveFranchiseTagIds(
      supabase,
      parseFranchiseTagNames(formData),
    );
    await syncRequestFranchiseTagLinks(supabase, requestId, tagIds);
    await syncRequestFilamentLinks(supabase, requestId, parseColorFilamentIds(formData));

    revalidatePath("/requests");
    revalidatePath("/");
    return { error: null, success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Something went wrong. Please try again.",
    };
  }
}

// Dedicated-page variants: redirect back to /requests on success.

export async function createRequest(
  _prevState: RequestFormState | null,
  formData: FormData,
): Promise<RequestFormState> {
  const result = await performCreateRequest(formData);
  if (result.error) return result;
  redirect("/requests");
}

export async function updateRequest(
  requestId: string,
  _prevState: RequestFormState | null,
  formData: FormData,
): Promise<RequestFormState> {
  const result = await performUpdateRequest(requestId, formData);
  if (result.error) return result;
  redirect("/requests");
}

// Side-peek variant: no redirect, since the user never leaves /requests.
export async function updateRequestInline(
  requestId: string,
  _prevState: RequestFormState | null,
  formData: FormData,
): Promise<RequestFormState> {
  return performUpdateRequest(requestId, formData);
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
