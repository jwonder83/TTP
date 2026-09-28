import { estimate1RM, workoutStats, workoutVolume } from "@/lib/calculations";
import { isUniqueViolation } from "@/lib/api/errors";
import {
  isUuid,
  mapActive,
  mapWorkout,
  mergeWorkouts,
  PROGRESS_SELECT,
  setPayload,
  WORKOUT_SELECT,
  type WorkoutRow,
} from "@/lib/api/rows";
import { parseDateKey } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { ActiveWorkout, CompletedWorkout, PrHit, SessionExercise, WorkoutSet } from "@/lib/types";

const PAGE_SIZE = 20;

function client() {
  return createClient();
}

async function rows(query: PromiseLike<{ data: WorkoutRow[] | null; error: { message: string } | null }>) {
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapWorkout);
}

export async function fetchCompletedPage(offset: number) {
  const { data, error } = await client()
    .from("workouts")
    .select(WORKOUT_SELECT)
    .eq("status", "completed")
    .order("started_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);
  if (error) throw error;
  const workouts = ((data ?? []) as WorkoutRow[]).map(mapWorkout);
  return { workouts, hasMore: workouts.length === PAGE_SIZE };
}

export async function fetchCompletedBetween(startIso: string, endIso: string) {
  return rows(
    client()
      .from("workouts")
      .select(WORKOUT_SELECT)
      .eq("status", "completed")
      .gte("started_at", startIso)
      .lt("started_at", endIso)
      .order("started_at", { ascending: false }),
  );
}

export function monthRange(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export function rangeFromDateKey(startKey: string, endKeyInclusive: string) {
  const start = parseDateKey(startKey);
  const end = parseDateKey(endKeyInclusive);
  end.setDate(end.getDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export async function fetchActiveWorkout() {
  const { data, error } = await client().from("workouts").select(WORKOUT_SELECT).eq("status", "active").maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as WorkoutRow;
  return { workout: mapActive(row), updatedAt: row.updated_at ?? row.started_at };
}

export async function fetchExerciseWorkouts(exerciseId: string, sinceIso: string) {
  const { data, error } = await client()
    .from("workouts")
    .select(PROGRESS_SELECT)
    .eq("status", "completed")
    .eq("workout_exercises.exercise_id", exerciseId)
    .gte("started_at", sinceIso)
    .order("started_at", { ascending: true })
    .limit(1000);
  if (error) throw error;
  return ((data ?? []) as WorkoutRow[]).map(mapWorkout);
}

export async function persistActiveWorkout(userId: string, workout: ActiveWorkout) {
  const supabase = client();
  const saved = await supabase.from("workouts").upsert({
    id: workout.id,
    user_id: userId,
    routine_id: isUuid(workout.routineId) ? workout.routineId : null,
    name: workout.routineName,
    status: "active",
    started_at: workout.startedAt,
  });
  if (saved.error) throw saved.error;

  if (workout.exercises.length === 0) return;
  const exercises = workout.exercises.map((exercise) => ({
    id: exercise.id,
    workout_id: workout.id,
    exercise_id: exercise.exerciseId,
    order_index: exercise.orderIndex,
    rest_seconds: exercise.restSeconds,
  }));
  const exerciseResult = await supabase.from("workout_exercises").upsert(exercises);
  if (exerciseResult.error) throw exerciseResult.error;

  const sets = workout.exercises.flatMap((exercise) => exercise.sets.map((set) => setPayload(exercise.id, set)));
  if (sets.length > 0) {
    const setResult = await supabase.from("workout_sets").upsert(sets);
    if (setResult.error) throw setResult.error;
  }
}

export async function upsertSets(items: Array<{ workoutExerciseId: string; set: WorkoutSet }>) {
  if (items.length === 0) return;
  const { error } = await client().from("workout_sets").upsert(items.map((item) => setPayload(item.workoutExerciseId, item.set)));
  if (error) throw error;
}

export async function insertSession(workoutId: string, session: SessionExercise) {
  const supabase = client();
  const exerciseResult = await supabase.from("workout_exercises").insert({
    id: session.id,
    workout_id: workoutId,
    exercise_id: session.exerciseId,
    order_index: session.orderIndex,
    rest_seconds: session.restSeconds,
  });
  if (exerciseResult.error) throw exerciseResult.error;
  if (session.sets.length === 0) return;
  const setResult = await supabase.from("workout_sets").insert(session.sets.map((set) => setPayload(session.id, set)));
  if (setResult.error) throw setResult.error;
}

export async function deleteSession(sessionId: string) {
  const { error } = await client().from("workout_exercises").delete().eq("id", sessionId);
  if (error) throw error;
}

export async function insertSet(workoutExerciseId: string, set: WorkoutSet) {
  const { error } = await client().from("workout_sets").insert(setPayload(workoutExerciseId, set));
  if (error) throw error;
}

export async function deleteSet(setId: string) {
  const { error } = await client().from("workout_sets").delete().eq("id", setId);
  if (error) throw error;
}

export async function completeWorkout(userId: string, workout: CompletedWorkout) {
  const stats = workoutStats(workout);
  const { data, error } = await client()
    .from("workouts")
    .update({
      status: "completed",
      finished_at: workout.finishedAt,
      duration_seconds: stats.durationSec,
      total_volume: Math.round(workoutVolume(workout) * 100) / 100,
      name: workout.routineName,
    })
    .eq("id", workout.id)
    .eq("user_id", userId)
    .eq("status", "active")
    .select("id");
  if (error) throw error;
  if ((data ?? []).length > 0) return { alreadyFinished: false, stats };
  const existing = await client().from("workouts").select("status").eq("id", workout.id).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.status === "completed") return { alreadyFinished: true, stats };
  throw new Error("Could not finish workout");
}

export async function insertPrs(userId: string, workout: CompletedWorkout, hits: PrHit[]) {
  const supabase = client();
  for (const hit of hits) {
    const estimated =
      hit.recordType === "e1rm"
        ? hit.value
        : hit.weight && hit.reps
          ? Math.round(estimate1RM(hit.weight, hit.reps) * 100) / 100
          : null;
    const { error } = await supabase.from("personal_records").insert({
      user_id: userId,
      exercise_id: hit.exerciseId,
      record_type: hit.recordType,
      weight: hit.recordType === "volume" ? hit.value : hit.weight,
      reps: hit.reps,
      estimated_1rm: estimated,
      workout_id: isUuid(workout.id) ? workout.id : null,
      workout_set_id: isUuid(hit.setId) ? hit.setId : null,
      achieved_at: workout.finishedAt,
    });
    if (error && !isUniqueViolation(error)) throw error;
  }
}

export async function cancelWorkout(workoutId: string) {
  const { error } = await client()
    .from("workouts")
    .update({ status: "cancelled", finished_at: new Date().toISOString() })
    .eq("id", workoutId)
    .eq("status", "active");
  if (error) throw error;
}

export async function fetchWorkoutIdentity(limit = 200) {
  const { data, error } = await client()
    .from("workouts")
    .select("name, started_at")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return new Set(((data ?? []) as Array<{ name: string; started_at: string }>).map((row) => `${row.name}|${row.started_at}`));
}

export function combineHistory(page: CompletedWorkout[], extra: CompletedWorkout[]) {
  return mergeWorkouts([page, extra]);
}
