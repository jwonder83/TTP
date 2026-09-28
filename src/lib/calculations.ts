import type {
  CompletedWorkout,
  ExerciseSession,
  PersonalRecord,
  PrHit,
  RecentPr,
  RecordType,
  SessionExercise,
  WorkoutSet,
  WorkoutStats,
} from "@/lib/types";

/** Epley: weight × (1 + reps / 30). A single is the load itself. */
export function estimate1RM(weight: number, reps: number) {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export function setVolume(set: WorkoutSet) {
  if (!set.completed || set.reps <= 0 || set.weight <= 0) return 0;
  return set.weight * set.reps;
}

export function exerciseVolume(exercise: SessionExercise) {
  return exercise.sets.reduce((sum, set) => sum + setVolume(set), 0);
}

export function workoutVolume(workout: { exercises: SessionExercise[] }) {
  return workout.exercises.reduce((sum, exercise) => sum + exerciseVolume(exercise), 0);
}

export function workoutStats(workout: {
  startedAt: string;
  finishedAt: string;
  exercises: SessionExercise[];
}): WorkoutStats {
  const durationSec = Math.max(
    0,
    Math.round((new Date(workout.finishedAt).getTime() - new Date(workout.startedAt).getTime()) / 1000),
  );
  const completed = workout.exercises.flatMap((exercise) => exercise.sets).filter((set) => set.completed);
  return {
    durationSec,
    exerciseCount: workout.exercises.length,
    totalSets: completed.length,
    volume: workoutVolume(workout),
  };
}

export function workingSets(sets: WorkoutSet[]) {
  return sets.filter((set) => set.completed && set.reps > 0 && set.weight > 0 && set.setType !== "warmup");
}

/** Prefer the top set so back-off volume does not hide a missed top set. */
export function getKeySet(sets: WorkoutSet[]) {
  const working = workingSets(sets);
  const tops = working.filter((set) => set.setType === "top");
  const pool = tops.length > 0 ? tops : working;
  if (pool.length === 0) return null;
  return pool.reduce((best, set) =>
    estimate1RM(set.weight, set.reps) > estimate1RM(best.weight, best.reps) ? set : best,
  );
}

export function bestEstimated1RM(sets: WorkoutSet[]) {
  const key = getKeySet(sets);
  return key ? estimate1RM(key.weight, key.reps) : 0;
}

export function sortHistory(history: CompletedWorkout[]) {
  return [...history].sort((a, b) => a.date.localeCompare(b.date) || a.startedAt.localeCompare(b.startedAt));
}

export function sessionsForExercise(history: CompletedWorkout[], exerciseId: string): ExerciseSession[] {
  return sortHistory(history)
    .map((workout) => {
      const exercise = workout.exercises.find((item) => item.exerciseId === exerciseId);
      if (!exercise) return null;
      const key = getKeySet(exercise.sets);
      if (!key) return null;
      return {
        date: workout.date,
        sets: exercise.sets.filter((set) => set.completed),
        key,
      };
    })
    .filter((session): session is ExerciseSession => session !== null)
    .reverse();
}

function recordKey(exerciseId: string, recordType: RecordType) {
  return `${exerciseId}:${recordType}`;
}

export function analyzeHistory(history: CompletedWorkout[]): {
  records: PersonalRecord[];
  latestSetPr: RecentPr | null;
} {
  const best = new Map<string, PersonalRecord>();
  let latestSetPr: RecentPr | null = null;

  const consider = (
    exerciseId: string,
    recordType: RecordType,
    value: number,
    weight: number | null,
    reps: number | null,
    date: string,
    setPr: { weight: number; reps: number; e1rm: number } | null,
  ) => {
    if (value <= 0) return;
    const key = recordKey(exerciseId, recordType);
    const previous = best.get(key);
    if (!previous || value > previous.value + 0.05) {
      best.set(key, { exerciseId, recordType, value, weight, reps, date });
      if (setPr) latestSetPr = { exerciseId, ...setPr, date };
    }
  };

  for (const workout of sortHistory(history)) {
    for (const exercise of workout.exercises) {
      const completed = exercise.sets.filter((set) => set.completed && set.reps > 0);
      if (completed.length === 0) continue;

      const volume = completed.reduce((sum, set) => sum + (set.weight > 0 ? set.weight * set.reps : 0), 0);
      consider(exercise.exerciseId, "volume", volume, null, null, workout.date, null);

      const working = workingSets(exercise.sets);
      if (working.length === 0) continue;

      const bestSet = working.reduce((top, set) =>
        estimate1RM(set.weight, set.reps) > estimate1RM(top.weight, top.reps) ? set : top,
      );
      const e1rm = estimate1RM(bestSet.weight, bestSet.reps);
      consider(exercise.exerciseId, "e1rm", e1rm, bestSet.weight, bestSet.reps, workout.date, {
        weight: bestSet.weight,
        reps: bestSet.reps,
        e1rm,
      });

      for (const target of [1, 3, 5] as const) {
        const candidates = working.filter((set) => (target === 1 ? set.reps === 1 : set.reps >= target));
        if (candidates.length === 0) continue;
        const heaviest = candidates.reduce((top, set) => (set.weight > top.weight ? set : top));
        consider(
          exercise.exerciseId,
          `${target}rm`,
          heaviest.weight,
          heaviest.weight,
          target,
          workout.date,
          null,
        );
      }
    }
  }

  return { records: [...best.values()], latestSetPr };
}

export function newPrHits(history: CompletedWorkout[], workout: CompletedWorkout): PrHit[] {
  const before = analyzeHistory(history).records;
  const after = analyzeHistory([...history, workout]).records;
  return after
    .filter((record) => {
      const previous = before.find(
        (item) => item.exerciseId === record.exerciseId && item.recordType === record.recordType,
      );
      return !previous || record.value > previous.value + 0.05;
    })
    .map((record) => ({
      ...record,
      previous:
        before.find((item) => item.exerciseId === record.exerciseId && item.recordType === record.recordType)
          ?.value ?? null,
    }));
}

export function recordValue(records: PersonalRecord[], exerciseId: string, recordType: RecordType) {
  return records.find((record) => record.exerciseId === exerciseId && record.recordType === recordType) ?? null;
}

export function isLiveE1rmPr(records: PersonalRecord[], exerciseId: string, sets: WorkoutSet[]) {
  const current = bestEstimated1RM(sets);
  if (current <= 0) return false;
  const previous = recordValue(records, exerciseId, "e1rm");
  return !previous || current > previous.value + 0.05;
}

function pushHit(
  hits: PrHit[],
  records: PersonalRecord[],
  exerciseId: string,
  recordType: RecordType,
  value: number,
  weight: number | null,
  reps: number | null,
  date: string,
  setId: string | null,
) {
  if (value <= 0) return;
  const previous = recordValue(records, exerciseId, recordType);
  if (previous && value <= previous.value + 0.05) return;
  hits.push({
    exerciseId,
    recordType,
    value,
    weight,
    reps,
    date,
    previous: previous?.value ?? null,
    setId,
  });
}

/** Compare one finished workout with stored records. Does not require the full history. */
export function prHitsAgainstRecords(records: PersonalRecord[], workout: CompletedWorkout): PrHit[] {
  const hits: PrHit[] = [];
  for (const exercise of workout.exercises) {
    const completed = exercise.sets.filter((set) => set.completed && set.reps > 0);
    if (completed.length === 0) continue;
    const volume = completed.reduce((sum, set) => sum + (set.weight > 0 ? set.weight * set.reps : 0), 0);
    pushHit(hits, records, exercise.exerciseId, "volume", volume, null, null, workout.date, null);

    const working = workingSets(exercise.sets);
    if (working.length === 0) continue;
    const bestSet = working.reduce((top, set) =>
      estimate1RM(set.weight, set.reps) > estimate1RM(top.weight, top.reps) ? set : top,
    );
    const heaviest = working.reduce((top, set) => (set.weight > top.weight ? set : top));
    pushHit(
      hits,
      records,
      exercise.exerciseId,
      "e1rm",
      estimate1RM(bestSet.weight, bestSet.reps),
      bestSet.weight,
      bestSet.reps,
      workout.date,
      bestSet.id,
    );
    pushHit(hits, records, exercise.exerciseId, "heaviest", heaviest.weight, heaviest.weight, heaviest.reps, workout.date, heaviest.id);

    for (const target of [1, 3, 5] as const) {
      const candidates = working.filter((set) => (target === 1 ? set.reps === 1 : set.reps >= target));
      if (candidates.length === 0) continue;
      const top = candidates.reduce((best, set) => (set.weight > best.weight ? set : best));
      pushHit(hits, records, exercise.exerciseId, `${target}rm`, top.weight, top.weight, target, workout.date, top.id);
    }
  }
  return hits;
}
