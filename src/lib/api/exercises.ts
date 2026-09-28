import { mapExercise } from "@/lib/api/rows";
import { createClient } from "@/lib/supabase/client";
import type { Exercise } from "@/lib/types";

export async function fetchExercises() {
  const { data, error } = await createClient().from("exercises").select("id, name, category, exercise_type, equipment, is_custom").order("name");
  if (error) throw error;
  return ((data ?? []) as Array<{
    id: string;
    name: string;
    category: string;
    exercise_type: string;
    equipment: string;
    is_custom: boolean;
  }>)
    .map(mapExercise)
    .filter((exercise): exercise is Exercise => exercise !== null);
}

export async function insertCustomExercise(userId: string, exercise: Exercise) {
  const { error } = await createClient().from("exercises").insert({
    id: exercise.id,
    user_id: userId,
    name: exercise.name.trim(),
    category: exercise.category,
    exercise_type: exercise.kind,
    equipment: exercise.equipment,
    default_rest_seconds: exercise.kind === "compound" ? 180 : 90,
    is_custom: true,
  });
  if (error) throw error;
  return exercise;
}
