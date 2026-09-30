import type { Exercise, PersonalRecord } from "@/lib/types";
import { APP_VERSION, SCHEMA_VERSION } from "@/lib/offline/model";

export interface ExportSetRow {
  date: string;
  workout: string;
  exercise: string;
  set: number;
  setType: string;
  weight: number;
  reps: number;
  rpe: number | null;
  estimated1rm: number | null;
  volume: number;
}

export function rowsFromHistory(
  workouts: Array<{ date: string; routineName: string; exercises: Array<{ exerciseId: string; sets: Array<{ setNumber: number; setType: string; weight: number; reps: number; completed: boolean; rpe?: number | null }> }> }>,
  exercises: Exercise[],
): ExportSetRow[] {
  const names = new Map(exercises.map((exercise) => [exercise.id, exercise.name]));
  const rows: ExportSetRow[] = [];
  for (const workout of workouts) {
    for (const session of workout.exercises) {
      for (const set of session.sets) {
        if (!set.completed) continue;
        const volume = set.weight > 0 && set.reps > 0 ? set.weight * set.reps : 0;
        const estimated = set.weight > 0 && set.reps > 0 && set.reps <= 10 ? Math.round(set.weight * (1 + set.reps / 30) * 100) / 100 : null;
        rows.push({
          date: workout.date,
          workout: workout.routineName,
          exercise: names.get(session.exerciseId) ?? session.exerciseId,
          set: set.setNumber,
          setType: set.setType,
          weight: set.weight,
          reps: set.reps,
          rpe: set.rpe ?? null,
          estimated1rm: estimated,
          volume,
        });
      }
    }
  }
  return rows;
}

function cell(value: string | number | null) {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function toCsv(rows: ExportSetRow[]) {
  const header = ["date", "workout", "exercise", "set", "set_type", "weight", "reps", "rpe", "estimated_1rm", "volume"];
  const lines = rows.map((row) =>
    [row.date, row.workout, row.exercise, row.set, row.setType, row.weight, row.reps, row.rpe, row.estimated1rm, row.volume].map(cell).join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

export function backupDocument(input: {
  workouts: unknown;
  bodyWeights: unknown;
  records: PersonalRecord[];
  routines: unknown;
  programs: unknown;
}) {
  return {
    schemaVersion: SCHEMA_VERSION,
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    workouts: input.workouts,
    bodyWeights: input.bodyWeights,
    records: input.records,
    routines: input.routines,
    programs: input.programs,
  };
}
