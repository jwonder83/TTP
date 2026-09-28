import { bestRecords, latestSetPr } from "@/lib/api/rows";
import { createClient } from "@/lib/supabase/client";

export async function fetchRecords() {
  const { data, error } = await createClient()
    .from("personal_records")
    .select("exercise_id, record_type, weight, reps, estimated_1rm, achieved_at")
    .order("achieved_at", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  return { records: bestRecords(rows), latestSetPr: latestSetPr(rows) };
}
