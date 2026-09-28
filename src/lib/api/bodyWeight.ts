import { mapBodyWeight } from "@/lib/api/rows";
import { createClient } from "@/lib/supabase/client";

export async function fetchBodyWeights() {
  const { data, error } = await createClient()
    .from("body_weight_logs")
    .select("id, weight, recorded_at")
    .order("recorded_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapBodyWeight);
}

export async function saveBodyWeight(userId: string, weight: number, recordedAt: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("body_weight_logs")
    .upsert({ user_id: userId, weight, recorded_at: recordedAt }, { onConflict: "user_id,recorded_at" })
    .select("id, weight, recorded_at")
    .single();
  if (error) throw error;
  await supabase.from("profiles").update({ current_weight: weight }).eq("user_id", userId);
  return mapBodyWeight(data);
}
