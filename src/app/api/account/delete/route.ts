import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const OWNED = [
  "training_recommendations",
  "workout_readiness",
  "exercise_notes",
  "workout_schedules",
  "training_goals",
  "exercise_training_config",
  "training_programs",
  "workouts",
  "routines",
  "personal_records",
  "body_weight_logs",
] as const;

export async function POST() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return NextResponse.json({ ok: false }, { status: 401 });
  for (const table of OWNED) {
    const removed = await supabase.from(table).delete().eq("user_id", data.user.id);
    if (removed.error) return NextResponse.json({ ok: false }, { status: 500 });
  }
  await supabase.from("exercises").delete().eq("user_id", data.user.id).eq("is_custom", true);
  return NextResponse.json({ ok: true, authUserRemoved: false });
}
