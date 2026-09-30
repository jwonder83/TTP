import type { Exercise } from "@/lib/types";

export const PROGRAM_ENGINE_VERSION = "1.0";

export type TrainingGoalId = "STRENGTH" | "HYPERTROPHY" | "POWERBUILDING" | "GENERAL";
export type ExperienceLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
export type ScheduleMode = "FIXED" | "FLEXIBLE";
export type TrainingMaxSource = "ACTUAL" | "ESTIMATED" | "MANUAL";
export type MovementPattern =
  | "HORIZONTAL_PUSH"
  | "VERTICAL_PUSH"
  | "HORIZONTAL_PULL"
  | "VERTICAL_PULL"
  | "SQUAT"
  | "HINGE"
  | "LUNGE"
  | "CARRY"
  | "ISOLATION";
export type ExercisePriority = "PRIMARY" | "SECONDARY" | "ACCESSORY" | "ISOLATION";
export type EquipmentChoice =
  | "BARBELL"
  | "DUMBBELLS"
  | "POWER_RACK"
  | "BENCH"
  | "CABLE"
  | "MACHINES"
  | "PULLUP_BAR"
  | "DIP_STATION"
  | "LEG_PRESS"
  | "SMITH"
  | "BODYWEIGHT";
export type AdaptiveAction =
  | "INCREASE"
  | "KEEP"
  | "REDUCE"
  | "REPEAT"
  | "DELOAD"
  | "CHANGE_REP_RANGE"
  | "CHANGE_VOLUME"
  | "NO_RECOMMENDATION";
export type RecoveryLabel = "READY" | "NORMAL" | "RECOVERY_NEEDED";
export type BlockKind = "BUILD" | "OVERLOAD" | "PEAK" | "DELOAD";
export type MuscleGroup = "CHEST" | "BACK" | "QUADS" | "HAMSTRINGS" | "SHOULDERS" | "BICEPS" | "TRICEPS" | "GLUTES";

export interface TrainingProfileInput {
  goal: TrainingGoalId;
  experience: ExperienceLevel;
  daysPerWeek: number;
  sessionMinutes: number;
  equipment: EquipmentChoice[];
  preferredExerciseIds: string[];
  avoidExerciseIds: string[];
  scheduleMode: ScheduleMode;
  durationWeeks?: number;
  variation?: number;
}

export interface StrengthBaseline {
  exerciseId: string;
  value: number;
  source: TrainingMaxSource;
}

export interface HistoryPoint {
  exerciseId: string;
  weight: number;
  reps: number;
  rpe?: number | null;
  completed: boolean;
  date: string;
}

export interface GeneratorInput {
  profile: TrainingProfileInput;
  exercises: Exercise[];
  baselines: StrengthBaseline[];
  history: HistoryPoint[];
  substitutionCounts?: Array<{ fromExerciseId: string; toExerciseId: string; count: number }>;
}

export interface GeneratedExercise {
  exerciseId: string;
  name: string;
  sets: number;
  minReps: number;
  maxReps: number;
  setType: "top" | "normal";
  targetRpe: number;
  percentage1rm: number | null;
  targetWeight: number | null;
  restSeconds: number;
  progressionType: "LINEAR" | "DOUBLE_PROGRESSION" | "TOP_SET_BACKOFF";
  priority: ExercisePriority;
  pattern: MovementPattern;
  muscle: MuscleGroup;
  startingNote: string | null;
}

export interface GeneratedDay {
  name: string;
  focus: string;
  scheduledDay: number | null;
  exercises: GeneratedExercise[];
  estimatedDuration: number;
}

export interface GeneratedWeek {
  weekNumber: number;
  block: BlockKind;
  days: GeneratedDay[];
}

export interface GeneratedProgram {
  name: string;
  goal: TrainingGoalId;
  durationWeeks: number;
  daysPerWeek: number;
  split: string;
  weeks: GeneratedWeek[];
  explanation: string[];
  algorithmVersion: string;
  plannedDays: number;
}

export interface AdaptiveInput {
  sessions: Array<{ weight: number; reps: number; rpe?: number | null; hitTarget: boolean }>;
  minReps: number;
  maxReps: number;
  increment: number;
  priority: ExercisePriority;
}

export interface AdaptiveResult {
  action: AdaptiveAction;
  nextWeight: number | null;
  nextSetsDelta: number;
  reason: string;
}

export interface VolumeWarning {
  muscle: MuscleGroup;
  sets: number;
  baselineMax: number;
}
