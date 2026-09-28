import { isUuid, mapRoutine } from "@/lib/api/rows";
import { uuid } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { Routine } from "@/lib/types";

const SELECT = `
  id,
  name,
  routine_exercises (
    id,
    exercise_id,
    order_index,
    default_sets,
    default_reps,
    rest_seconds
  )
`;

export async function fetchRoutines() {
  const { data, error } = await createClient().from("routines").select(SELECT).order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRoutine);
}

export async function saveRoutine(userId: string, routine: Routine): Promise<Routine> {
  const supabase = createClient();
  const id = isUuid(routine.id) ? routine.id : uuid();
  const existing = await supabase.from("routines").select("id").eq("id", id).maybeSingle();
  if (existing.error) throw existing.error;

  if (existing.data) {
    const updated = await supabase.from("routines").update({ name: routine.name }).eq("id", id);
    if (updated.error) throw updated.error;
    const removed = await supabase.from("routine_exercises").delete().eq("routine_id", id);
    if (removed.error) throw removed.error;
  } else {
    const inserted = await supabase.from("routines").insert({ id, user_id: userId, name: routine.name });
    if (inserted.error) throw inserted.error;
  }

  if (routine.exercises.length > 0) {
    const rows = routine.exercises.map((item, index) => ({
      id: isUuid(item.id) ? item.id : uuid(),
      routine_id: id,
      exercise_id: item.exerciseId,
      order_index: index,
      default_sets: item.defaultSets,
      default_reps: item.defaultReps,
      rest_seconds: item.restSeconds,
    }));
    const inserted = await supabase.from("routine_exercises").insert(rows);
    if (inserted.error) throw inserted.error;
  }

  const { data, error } = await supabase.from("routines").select(SELECT).eq("id", id).single();
  if (error) throw error;
  return mapRoutine(data);
}

export async function deleteRoutine(routineId: string) {
  const { error } = await createClient().from("routines").delete().eq("id", routineId);
  if (error) throw error;
}
