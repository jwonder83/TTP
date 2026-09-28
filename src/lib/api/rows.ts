import { estimate1RM } from "@/lib/calculations";
import { toDateKey } from "@/lib/format";
import type {
  ActiveWorkout,
  BodyWeightEntry,
  CompletedWorkout,
  Exercise,
  ExerciseCategory,
  Equipment,
  ExerciseKind,
  PersonalRecord,
  Profile,
  RecentPr,
  RecordType,
  Routine,
  SessionExercise,
  SetType,
  ThemePreference,
  Unit,
  WorkoutSet,
} from "@/lib/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SET_TYPES = new Set<SetType>(["warmup", "normal", "top", "backoff", "drop", "amrap"]);
const CATEGORIES = new Set<ExerciseCategory>(["chest", "back", "leg", "shoulder", "arms"]);
const EQUIPMENT = new Set<Equipment>(["barbell", "dumbbell", "cable", "machine", "bodyweight", "other"]);
const KINDS = new Set<ExerciseKind>(["compound", "accessory"]);
const RECORD_TYPES = new Set<RecordType>(["e1rm", "1rm", "3rm", "5rm", "volume", "heaviest"]);

export function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && UUID_RE.test(value));
}

export function num(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function asArray<T>(value: T[] | T | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export const WORKOUT_SELECT = `
  id,
  routine_id,
  name,
  status,
  started_at,
  finished_at,
  duration_seconds,
  total_volume,
  updated_at,
  workout_exercises (
    id,
    exercise_id,
    order_index,
    rest_seconds,
    workout_sets (
      id,
      set_number,
      set_type,
      weight,
      reps,
      completed,
      estimated_1rm
    )
  )
`;

export const PROGRESS_SELECT = `
  id,
  routine_id,
  name,
  status,
  started_at,
  finished_at,
  duration_seconds,
  total_volume,
  updated_at,
  workout_exercises!inner (
    id,
    exercise_id,
    order_index,
    rest_seconds,
    workout_sets (
      id,
      set_number,
      set_type,
      weight,
      reps,
      completed,
      estimated_1rm
    )
  )
`;

interface SetRow {
  id: string;
  set_number: number;
  set_type: string;
  weight: number | string;
  reps: number | string;
  completed: boolean;
  estimated_1rm: number | string | null;
}

interface SessionRow {
  id: string;
  exercise_id: string;
  order_index: number;
  rest_seconds: number | string;
  workout_sets: SetRow[] | SetRow | null;
}

export interface WorkoutRow {
  id: string;
  routine_id: string | null;
  name: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  duration_seconds: number | string | null;
  total_volume: number | string | null;
  updated_at?: string;
  workout_exercises: SessionRow[] | SessionRow | null;
}

function mapSet(row: SetRow): WorkoutSet {
  const setType = SET_TYPES.has(row.set_type as SetType) ? (row.set_type as SetType) : "normal";
  return {
    id: row.id,
    setNumber: num(row.set_number, 1),
    setType,
    weight: num(row.weight),
    reps: num(row.reps),
    completed: Boolean(row.completed),
  };
}

function mapSession(row: SessionRow): SessionExercise {
  const sets = asArray(row.workout_sets)
    .map(mapSet)
    .sort((a, b) => a.setNumber - b.setNumber);
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    orderIndex: num(row.order_index),
    restSeconds: num(row.rest_seconds, 90),
    sets,
  };
}

export function mapWorkout(row: WorkoutRow): CompletedWorkout {
  const started = new Date(row.started_at);
  return {
    id: row.id,
    routineId: row.routine_id,
    routineName: row.name,
    date: toDateKey(started),
    startedAt: row.started_at,
    finishedAt: row.finished_at ?? row.started_at,
    exercises: asArray(row.workout_exercises)
      .map(mapSession)
      .sort((a, b) => a.orderIndex - b.orderIndex),
  };
}

export function mapActive(row: WorkoutRow): ActiveWorkout {
  const workout = mapWorkout(row);
  return {
    id: workout.id,
    routineId: workout.routineId ?? "",
    routineName: workout.routineName,
    startedAt: workout.startedAt,
    exercises: workout.exercises,
  };
}

export function setPayload(workoutExerciseId: string, set: WorkoutSet) {
  const estimated = set.weight > 0 && set.reps > 0 ? Math.round(estimate1RM(set.weight, set.reps) * 100) / 100 : null;
  return {
    id: set.id,
    workout_exercise_id: workoutExerciseId,
    set_number: set.setNumber,
    set_type: set.setType,
    weight: set.weight,
    reps: set.reps,
    completed: set.completed,
    estimated_1rm: estimated,
    completed_at: set.completed ? new Date().toISOString() : null,
  };
}

export function mapExercise(row: {
  id: string;
  name: string;
  category: string;
  exercise_type: string;
  equipment: string;
  is_custom: boolean;
}): Exercise | null {
  if (!CATEGORIES.has(row.category as ExerciseCategory)) return null;
  if (!EQUIPMENT.has(row.equipment as Equipment)) return null;
  if (!KINDS.has(row.exercise_type as ExerciseKind)) return null;
  return {
    id: row.id,
    name: row.name,
    category: row.category as ExerciseCategory,
    equipment: row.equipment as Equipment,
    kind: row.exercise_type as ExerciseKind,
    isCustom: row.is_custom,
  };
}

export function mapProfile(profile: {
  name: string | null;
  height: number | string | null;
  unit: string | null;
} | null, settings: {
  unit: string | null;
  theme: string | null;
  compound_rest_seconds: number | null;
  accessory_rest_seconds: number | null;
  weekly_goal: number | null;
} | null): Profile {
  const unit: Unit = settings?.unit === "lb" || profile?.unit === "lb" ? "lb" : "kg";
  const theme: ThemePreference =
    settings?.theme === "light" || settings?.theme === "system" ? settings.theme : "dark";
  return {
    name: profile?.name?.trim() || "Athlete",
    heightCm: num(profile?.height),
    unit,
    theme,
    compoundRestSec: num(settings?.compound_rest_seconds, 180),
    accessoryRestSec: num(settings?.accessory_rest_seconds, 90),
    weeklyGoal: num(settings?.weekly_goal, 4),
  };
}

export function mapRoutine(row: {
  id: string;
  name: string;
  routine_exercises: Array<{
    id: string;
    exercise_id: string;
    order_index: number;
    default_sets: number;
    default_reps: number;
    rest_seconds: number;
  }> | null;
}): Routine {
  return {
    id: row.id,
    name: row.name,
    exercises: (row.routine_exercises ?? [])
      .map((item) => ({
        id: item.id,
        exerciseId: item.exercise_id,
        orderIndex: item.order_index,
        defaultSets: item.default_sets,
        defaultReps: item.default_reps,
        restSeconds: item.rest_seconds,
      }))
      .sort((a, b) => a.orderIndex - b.orderIndex),
  };
}

export function mapBodyWeight(row: { id: string; weight: number | string; recorded_at: string }): BodyWeightEntry {
  return { id: row.id, weight: num(row.weight), date: row.recorded_at.slice(0, 10) };
}

interface RecordRow {
  exercise_id: string;
  record_type: string;
  weight: number | string | null;
  reps: number | string | null;
  estimated_1rm: number | string | null;
  achieved_at: string;
}

export function mapRecord(row: RecordRow): PersonalRecord | null {
  if (!RECORD_TYPES.has(row.record_type as RecordType)) return null;
  const type = row.record_type as RecordType;
  const weight = row.weight == null ? null : num(row.weight);
  const reps = row.reps == null ? null : num(row.reps);
  const estimated = row.estimated_1rm == null ? null : num(row.estimated_1rm);
  const value = type === "e1rm" ? estimated ?? 0 : type === "volume" ? num(row.weight ?? estimated) : weight ?? 0;
  return {
    exerciseId: row.exercise_id,
    recordType: type,
    value,
    weight: type === "volume" ? null : weight,
    reps: type === "volume" ? null : reps,
    date: toDateKey(new Date(row.achieved_at)),
  };
}

export function bestRecords(rows: RecordRow[]) {
  const best = new Map<string, PersonalRecord>();
  for (const row of rows) {
    const record = mapRecord(row);
    if (!record || record.value <= 0) continue;
    const key = `${record.exerciseId}:${record.recordType}`;
    const previous = best.get(key);
    if (!previous || record.value > previous.value) best.set(key, record);
  }
  return [...best.values()];
}

export function latestSetPr(rows: RecordRow[]): RecentPr | null {
  const ranked = rows
    .filter((row) => row.record_type !== "volume" && row.weight != null && row.reps != null)
    .sort((a, b) => b.achieved_at.localeCompare(a.achieved_at));
  const newest = ranked[0];
  if (!newest) return null;
  const sibling = ranked.find(
    (row) => row.exercise_id === newest.exercise_id && row.achieved_at === newest.achieved_at && row.record_type === "e1rm",
  );
  const source = sibling ?? newest;
  const weight = num(source.weight);
  const reps = num(source.reps);
  return {
    exerciseId: source.exercise_id,
    weight,
    reps,
    e1rm: num(source.estimated_1rm, estimate1RM(weight, reps)),
    date: toDateKey(new Date(source.achieved_at)),
  };
}

export function mergeWorkouts(groups: CompletedWorkout[][]) {
  const map = new Map<string, CompletedWorkout>();
  for (const group of groups) {
    for (const workout of group) map.set(workout.id, workout);
  }
  return [...map.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt) || b.id.localeCompare(a.id));
}
