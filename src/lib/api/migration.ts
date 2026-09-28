import { analyzeHistory, estimate1RM } from "@/lib/calculations";
import { isUniqueViolation } from "@/lib/api/errors";
import { insertCustomExercise, fetchExercises } from "@/lib/api/exercises";
import { saveBodyWeight } from "@/lib/api/bodyWeight";
import { saveProfile } from "@/lib/api/profiles";
import { fetchRoutines, saveRoutine } from "@/lib/api/routines";
import { isUuid } from "@/lib/api/rows";
import { fetchWorkoutIdentity, persistActiveWorkout } from "@/lib/api/workouts";
import { uuid } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { CompletedWorkout, Exercise, PersistedState, SessionExercise, WorkoutSet } from "@/lib/types";

const ALIASES: Record<string, string> = {
  "dumbbell press": "dumbbell bench press",
  "cable row": "seated cable row",
};

const SEED_ROUTINES = new Set(["routine-push", "routine-pull", "routine-leg"]);

export function hasUserLocalData(state: PersistedState) {
  const custom = state.exercises.some((exercise) => exercise.isCustom);
  const extraRoutines = state.routines.some((routine) => !SEED_ROUTINES.has(routine.id));
  const realWorkouts = state.history.some((workout) => !workout.id.startsWith("hist-"));
  const realWeights = state.bodyWeights.some((entry) => !/^bw-\d+$/.test(entry.id));
  const profileChanged =
    state.profile.name !== "Alex" ||
    state.profile.unit !== "kg" ||
    state.profile.theme !== "dark" ||
    state.profile.heightCm !== 178 ||
    state.profile.weeklyGoal !== 4 ||
    state.profile.compoundRestSec !== 180 ||
    state.profile.accessoryRestSec !== 90;
  return custom || extraRoutines || realWorkouts || realWeights || Boolean(state.activeWorkout) || profileChanged;
}

function canonicalName(name: string) {
  const key = name.trim().toLowerCase();
  return ALIASES[key] ?? key;
}

function findByName(exercises: Exercise[], name: string) {
  const target = canonicalName(name);
  return exercises.find((exercise) => exercise.name.trim().toLowerCase() === target) ?? null;
}

function cloneSet(set: WorkoutSet): WorkoutSet {
  return { ...set, id: uuid() };
}

function cloneSession(session: SessionExercise, exerciseId: string, orderIndex: number): SessionExercise | null {
  if (!isUuid(exerciseId)) return null;
  return {
    id: uuid(),
    exerciseId,
    orderIndex,
    restSeconds: session.restSeconds,
    sets: session.sets.map(cloneSet),
  };
}

export async function importLocalState(userId: string, local: PersistedState) {
  await saveProfile(userId, local.profile);
  let exercises = await fetchExercises();
  const idMap = new Map<string, string>();

  for (const exercise of local.exercises) {
    const existing = findByName(exercises, exercise.name);
    if (existing) {
      idMap.set(exercise.id, existing.id);
      continue;
    }
    if (!exercise.isCustom) continue;
    const created: Exercise = { ...exercise, id: uuid(), isCustom: true, name: exercise.name.trim() };
    await insertCustomExercise(userId, created);
    exercises = [...exercises, created];
    idMap.set(exercise.id, created.id);
  }

  const routines = await fetchRoutines();
  const routineNames = new Set(routines.map((routine: { name: string }) => routine.name.trim().toLowerCase()));
  for (const routine of local.routines) {
    if (routineNames.has(routine.name.trim().toLowerCase())) continue;
    const exercisesForRoutine = routine.exercises.flatMap((item, index) => {
      const exerciseId = idMap.get(item.exerciseId);
      if (!exerciseId) return [];
      return [{ ...item, id: uuid(), exerciseId, orderIndex: index }];
    });
    if (exercisesForRoutine.length === 0) continue;
    await saveRoutine(userId, { id: uuid(), name: routine.name, exercises: exercisesForRoutine });
    routineNames.add(routine.name.trim().toLowerCase());
  }

  const identities = await fetchWorkoutIdentity();
  const imported: CompletedWorkout[] = [];
  for (const workout of local.history) {
    if (workout.id.startsWith("hist-")) continue;
    if (identities.has(`${workout.routineName}|${workout.startedAt}`)) continue;
    const sessions = workout.exercises.flatMap((session, index) => {
      const exerciseId = idMap.get(session.exerciseId);
      if (!exerciseId) return [];
      const cloned = cloneSession(session, exerciseId, index);
      return cloned ? [cloned] : [];
    });
    if (sessions.length === 0) continue;
    const copy: CompletedWorkout = {
      ...workout,
      id: uuid(),
      routineId: null,
      exercises: sessions,
    };
    const supabase = createClient();
    const statsVolume = copy.exercises.reduce(
      (sum, exercise) => sum + exercise.sets.filter((set) => set.completed).reduce((inner, set) => inner + set.weight * set.reps, 0),
      0,
    );
    const inserted = await supabase.from("workouts").insert({
      id: copy.id,
      user_id: userId,
      routine_id: null,
      name: copy.routineName,
      status: "completed",
      started_at: copy.startedAt,
      finished_at: copy.finishedAt,
      duration_seconds: Math.max(0, Math.round((new Date(copy.finishedAt).getTime() - new Date(copy.startedAt).getTime()) / 1000)),
      total_volume: Math.round(statsVolume * 100) / 100,
    });
    if (inserted.error) throw inserted.error;
    if (copy.exercises.length > 0) {
      const exerciseRows = await supabase.from("workout_exercises").insert(
        copy.exercises.map((session) => ({
          id: session.id,
          workout_id: copy.id,
          exercise_id: session.exerciseId,
          order_index: session.orderIndex,
          rest_seconds: session.restSeconds,
        })),
      );
      if (exerciseRows.error) throw exerciseRows.error;
      const sets = copy.exercises.flatMap((session) =>
        session.sets.map((set) => ({
          id: set.id,
          workout_exercise_id: session.id,
          set_number: set.setNumber,
          set_type: set.setType,
          weight: set.weight,
          reps: set.reps,
          completed: set.completed,
          estimated_1rm: set.weight > 0 && set.reps > 0 ? Math.round((set.reps === 1 ? set.weight : set.weight * (1 + set.reps / 30)) * 100) / 100 : null,
          completed_at: set.completed ? copy.finishedAt : null,
        })),
      );
      if (sets.length > 0) {
        const setRows = await supabase.from("workout_sets").insert(sets);
        if (setRows.error) throw setRows.error;
      }
    }
    imported.push(copy);
    identities.add(`${copy.routineName}|${copy.startedAt}`);
  }

  if (local.activeWorkout && !identities.has(`${local.activeWorkout.routineName}|${local.activeWorkout.startedAt}`)) {
    const sessions = local.activeWorkout.exercises.flatMap((session, index) => {
      const exerciseId = idMap.get(session.exerciseId);
      if (!exerciseId) return [];
      const cloned = cloneSession(session, exerciseId, index);
      return cloned ? [cloned] : [];
    });
    if (sessions.length > 0) {
      await persistActiveWorkout(userId, {
        id: uuid(),
        routineId: "",
        routineName: local.activeWorkout.routineName,
        startedAt: local.activeWorkout.startedAt,
        exercises: sessions,
      });
    }
  }

  for (const entry of local.bodyWeights) {
    if (/^bw-\d+$/.test(entry.id)) continue;
    await saveBodyWeight(userId, entry.weight, entry.date);
  }

  if (imported.length > 0) {
    const { records } = analyzeHistory(imported);
    const supabase = createClient();
    for (const record of records) {
      const inserted = await supabase.from("personal_records").insert({
        user_id: userId,
        exercise_id: record.exerciseId,
        record_type: record.recordType,
        weight: record.recordType === "volume" ? record.value : record.weight,
        reps: record.reps,
        estimated_1rm:
          record.recordType === "e1rm"
            ? record.value
            : record.weight && record.reps
              ? Math.round(estimate1RM(record.weight, record.reps) * 100) / 100
              : null,
        achieved_at: new Date(`${record.date}T12:00:00`).toISOString(),
      });
      if (inserted.error && !isUniqueViolation(inserted.error)) throw inserted.error;
    }
  }
}
