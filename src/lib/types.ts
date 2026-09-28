export type SetType = "warmup" | "normal" | "top" | "backoff" | "drop" | "amrap";

export type ExerciseCategory = "chest" | "back" | "leg" | "shoulder" | "arms";

export type Equipment = "barbell" | "dumbbell" | "cable" | "machine" | "bodyweight" | "other";

export type ExerciseKind = "compound" | "accessory";

export type Unit = "kg" | "lb";

export type ThemePreference = "dark" | "light" | "system";

export type RecordType = "e1rm" | "1rm" | "3rm" | "5rm" | "volume" | "heaviest";

export type ChromeMode = "default" | "session";

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  equipment: Equipment;
  kind: ExerciseKind;
  isCustom: boolean;
}

export interface RoutineExercise {
  id: string;
  exerciseId: string;
  orderIndex: number;
  defaultSets: number;
  defaultReps: number;
  restSeconds: number;
}

export interface Routine {
  id: string;
  name: string;
  exercises: RoutineExercise[];
}

export interface WorkoutSet {
  id: string;
  setNumber: number;
  setType: SetType;
  weight: number;
  reps: number;
  completed: boolean;
}

export interface SessionExercise {
  id: string;
  exerciseId: string;
  orderIndex: number;
  restSeconds: number;
  sets: WorkoutSet[];
}

export interface ActiveWorkout {
  id: string;
  routineId: string;
  routineName: string;
  startedAt: string;
  exercises: SessionExercise[];
}

export interface CompletedWorkout {
  id: string;
  routineId: string | null;
  routineName: string;
  date: string;
  startedAt: string;
  finishedAt: string;
  exercises: SessionExercise[];
}

export interface PersonalRecord {
  exerciseId: string;
  recordType: RecordType;
  value: number;
  weight: number | null;
  reps: number | null;
  date: string;
}

export interface RecentPr {
  exerciseId: string;
  weight: number;
  reps: number;
  e1rm: number;
  date: string;
}

export interface PrHit extends PersonalRecord {
  previous: number | null;
  setId?: string | null;
}

export interface BodyWeightEntry {
  id: string;
  weight: number;
  date: string;
}

export interface Profile {
  name: string;
  heightCm: number;
  unit: Unit;
  theme: ThemePreference;
  compoundRestSec: number;
  accessoryRestSec: number;
  weeklyGoal: number;
}

export interface PersistedState {
  profile: Profile;
  exercises: Exercise[];
  routines: Routine[];
  history: CompletedWorkout[];
  activeWorkout: ActiveWorkout | null;
  bodyWeights: BodyWeightEntry[];
}

export interface WorkoutStats {
  durationSec: number;
  exerciseCount: number;
  totalSets: number;
  volume: number;
}

export interface FinishResult {
  workout: CompletedWorkout;
  prs: PrHit[];
  stats: WorkoutStats;
}

export interface LoadRecommendation {
  weight: number;
  reps: number;
  reason: "progress" | "hold" | "deload";
  previousWeight: number;
  previousReps: number;
  failStreak: number;
}

export interface ExerciseSession {
  date: string;
  sets: WorkoutSet[];
  key: WorkoutSet;
}
