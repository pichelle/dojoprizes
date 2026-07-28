import { createServerClient } from "@/lib/supabase/server";

// Resolves a list of typed tag names to franchise_tags row ids, creating
// any that don't already exist yet (case-insensitive match on name so
// "Pokemon" and "pokemon" resolve to the same tag).
export async function resolveFranchiseTagIds(
  supabase: ReturnType<typeof createServerClient>,
  tagNames: string[],
): Promise<string[]> {
  const ids: string[] = [];

  for (const raw of tagNames) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const { data: existing } = await supabase
      .from("franchise_tags")
      .select("id")
      .ilike("name", trimmed)
      .maybeSingle();

    if (existing) {
      ids.push(existing.id);
      continue;
    }

    const { data: created, error } = await supabase
      .from("franchise_tags")
      .insert({ name: trimmed })
      .select("id")
      .single();

    if (error) {
      // Likely a race with another insert of the same name -- look it up
      // again rather than failing the whole save.
      const { data: retry } = await supabase
        .from("franchise_tags")
        .select("id")
        .ilike("name", trimmed)
        .maybeSingle();
      if (retry) {
        ids.push(retry.id);
        continue;
      }
      throw new Error(error.message);
    }

    if (created) ids.push(created.id);
  }

  return ids;
}
