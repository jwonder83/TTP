import { completeWorkout, deleteSession, insertSession, persistActiveWorkout, updateSessionExercise, upsertSets } from "@/lib/api/workouts";
import { clearPendingFinish, deleteQueueItem, loadPendingFinish, readQueue, savePendingFinish, writeQueueItem } from "@/lib/offline/db";
import { markRetry, type QueueItem, type SyncStatus } from "@/lib/offline/model";
import type { ActiveWorkout, CompletedWorkout, SessionExercise, WorkoutSet } from "@/lib/types";

async function applyItem(userId: string, item: QueueItem) {
  if (item.type === "SET_UPSERT") {
    const payload = item.payload as { workoutExerciseId: string; set: WorkoutSet };
    await upsertSets([{ workoutExerciseId: payload.workoutExerciseId, set: payload.set }]);
    return;
  }
  if (item.type === "SESSION_INSERT") {
    const payload = item.payload as { workoutId: string; session: SessionExercise };
    await insertSession(payload.workoutId, payload.session);
    return;
  }
  if (item.type === "SESSION_DELETE") {
    const payload = item.payload as { sessionId: string };
    await deleteSession(payload.sessionId);
    return;
  }
  if (item.type === "EXERCISE_REPLACE") {
    const payload = item.payload as { sessionId: string; exerciseId: string };
    await updateSessionExercise(payload.sessionId, payload.exerciseId);
    return;
  }
  if (item.type === "WORKOUT_PERSIST") {
    const payload = item.payload as { workout: ActiveWorkout };
    await persistActiveWorkout(userId, payload.workout);
    return;
  }
  if (item.type === "WORKOUT_FINISH") {
    const payload = item.payload as { workout: CompletedWorkout };
    const stored = (await loadPendingFinish(payload.workout.id)) ?? payload.workout;
    try {
      await persistActiveWorkout(userId, {
        id: stored.id,
        routineId: stored.routineId ?? "",
        routineName: stored.routineName,
        startedAt: stored.startedAt,
        exercises: stored.exercises,
        programId: stored.programId,
        programDayId: stored.programDayId,
      });
    } catch {
      // The workout row may already exist. Finish remains idempotent.
    }
    await completeWorkout(userId, stored);
    await clearPendingFinish(stored.id);
  }
}

export async function runSync(userId: string): Promise<SyncStatus> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "OFFLINE";
  const items = await readQueue();
  if (items.length === 0) return "SYNCED";
  for (const item of items) {
    try {
      await applyItem(userId, item);
      await deleteQueueItem(item.id);
    } catch {
      const next = markRetry(item);
      if (!next) await deleteQueueItem(item.id);
      else await writeQueueItem(next);
      return "ERROR";
    }
  }
  return "SYNCED";
}

export async function rememberFinish(workout: CompletedWorkout) {
  await savePendingFinish(workout);
}
