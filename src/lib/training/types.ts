import type { Equipment, ExerciseKind, SetType } from "@/lib/types";

export type ProgressionType = "DOUBLE_PROGRESSION" | "LINEAR" | "TOP_SET_BACKOFF" | "MANUAL";

export type RecommendationType = "INCREASE" | "KEEP" | "DECREASE" | "DELOAD" | "RECOVERY" | "MANUAL";

export type Confidence = "HIGH" | "MEDIUM" | "LOW";

export type PerformanceStatus = "EXCELLENT" | "SUCCESS" | "PARTIAL" | "FAILED" | "RECOVERY";

export type StrengthDirection = "TRENDING_UP" | "STABLE" | "TRENDING_DOWN";

export type InsightKind = "PROGRESS" | "PLATEAU" | "VOLUME" | "PR" | "CONSISTENCY" | "RECOVERY" | "WARNING";

export type GoalType = "ONE_RM" | "WEIGHT_REPS";

export type EffortScale = "rpe" | "rir";

export type EnergyLevel = "LOW" | "NORMAL" | "HIGH";
export type SleepLevel = "POOR" | "OK" | "GOOD";
export type SorenessLevel = "LOW" | "MODERATE" | "HIGH";

export interface LoggedSet {
  setType: SetType;
  weight: number;
  reps: number;
  completed: boolean;
  rpe?: number | null;
  rir?: number | null;
}

export interface LoggedSession {
  date: string;
  sets: LoggedSet[];
}

export interface TrainingConfig {
  exerciseId: string;
  progressionType: ProgressionType;
  minReps: number;
  maxReps: number;
  weightIncrement: number;
  targetRpe: number;
  topSetEnabled: boolean;
  backoffEnabled: boolean;
  backoffPercentage: number;
  backoffSets: number;
  backoffMinReps: number;
  backoffMaxReps: number;
  deloadPercentage: number;
  pendingDeload: boolean;
}

export interface ReadinessInput {
  energy: EnergyLevel;
  sleep: SleepLevel;
  soreness: SorenessLevel;
}

export interface ExerciseRecommendation {
  exerciseId: string;
  recommendedWeight: number | null;
  recommendedReps: number | null;
  recommendationType: RecommendationType;
  confidence: Confidence;
  reason: string;
  backoffWeight: number | null;
  backoffSets: number;
  backoffReps: number | null;
  status: "READY" | "NO_HISTORY" | "LOW_DATA";
  recoveryWeight: number | null;
  lastWeight: number | null;
  lastReps: number | null;
  lastRpe: number | null;
}

export interface TrainingGoal {
  id: string;
  exerciseId: string;
  goalType: GoalType;
  targetWeight: number | null;
  targetReps: number | null;
  targetEstimated1rm: number | null;
  targetDate: string | null;
  status: "active" | "done";
}

export interface TrainingInsight {
  title: string;
  description: string;
  type: InsightKind;
  exerciseId?: string;
  priority: number;
  createdAt: string;
}

export function defaultIncrement(equipment: Equipment) {
  if (equipment === "dumbbell") return 2;
  return 2.5;
}

export function defaultTrainingConfig(
  exerciseId: string,
  equipment: Equipment,
  kind: ExerciseKind,
  defaultReps: number,
): TrainingConfig {
  const reps = Math.max(1, defaultReps);
  const heavy = kind === "compound" && equipment !== "dumbbell" && equipment !== "cable";
  const progressionType: ProgressionType = equipment === "bodyweight" ? "DOUBLE_PROGRESSION" : heavy ? "TOP_SET_BACKOFF" : "DOUBLE_PROGRESSION";
  return {
    exerciseId,
    progressionType,
    minReps: heavy ? Math.max(3, reps - 1) : Math.max(6, reps - 2),
    maxReps: heavy ? reps : reps,
    weightIncrement: defaultIncrement(equipment),
    targetRpe: 8,
    topSetEnabled: progressionType === "TOP_SET_BACKOFF",
    backoffEnabled: progressionType === "TOP_SET_BACKOFF",
    backoffPercentage: 90,
    backoffSets: 2,
    backoffMinReps: Math.min(12, reps + 1),
    backoffMaxReps: Math.min(12, reps + 3),
    deloadPercentage: 10,
    pendingDeload: false,
  };
}
