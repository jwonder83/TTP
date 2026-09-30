import type { ExercisePriority, ExperienceLevel, MuscleGroup, TrainingGoalId } from "@/lib/programming/types";

export const SESSION_OVERSHOOT_MINUTES = 12;
export const MAX_WEEKLY_STEP_PERCENT = 0.05;
export const HARD_STEP_PERCENT = 0.1;
export const DELOAD_VOLUME_FACTOR = 0.6;
export const DELOAD_INTENSITY_FACTOR = 0.9;
export const APPROPRIATE_RPE = 8.5;
export const HIGH_RPE = 9.5;
export const FAIL_STREAK_FOR_REDUCE = 3;

export function durationWeeksFor(experience: ExperienceLevel, override?: number) {
  if (override && [4, 6, 8, 12].includes(override)) return override;
  if (experience === "BEGINNER") return 6;
  return 8;
}

export function maxExercisesFor(minutes: number) {
  if (minutes <= 30) return 4;
  if (minutes <= 45) return 5;
  if (minutes <= 60) return 6;
  if (minutes <= 75) return 7;
  return 8;
}

export function volumeBand(goal: TrainingGoalId, experience: ExperienceLevel): Record<MuscleGroup, { min: number; max: number }> {
  const base: Record<MuscleGroup, { min: number; max: number }> = {
    CHEST: { min: 8, max: 12 },
    BACK: { min: 8, max: 14 },
    QUADS: { min: 6, max: 10 },
    HAMSTRINGS: { min: 4, max: 8 },
    SHOULDERS: { min: 6, max: 10 },
    BICEPS: { min: 4, max: 8 },
    TRICEPS: { min: 4, max: 8 },
    GLUTES: { min: 4, max: 8 },
  };
  const experienceLift = experience === "BEGINNER" ? 0 : experience === "INTERMEDIATE" ? 2 : 4;
  const goalLift = goal === "HYPERTROPHY" || goal === "POWERBUILDING" ? 2 : 0;
  const lifted = {} as Record<MuscleGroup, { min: number; max: number }>;
  for (const muscle of Object.keys(base) as MuscleGroup[]) {
    lifted[muscle] = {
      min: base[muscle].min,
      max: base[muscle].max + experienceLift + goalLift,
    };
  }
  return lifted;
}

export function maxStepKg(priority: ExercisePriority, current: number) {
  const absolute = priority === "PRIMARY" ? 5 : priority === "SECONDARY" ? 2.5 : 2.5;
  const percentCap = current > 0 ? current * HARD_STEP_PERCENT : absolute;
  return Math.min(absolute, Math.max(current > 0 ? current * MAX_WEEKLY_STEP_PERCENT : absolute, 0), percentCap);
}

export function restFor(priority: ExercisePriority, goal: TrainingGoalId) {
  if (priority === "PRIMARY") return goal === "HYPERTROPHY" ? 150 : 180;
  if (priority === "SECONDARY") return goal === "STRENGTH" ? 150 : 120;
  return 90;
}

export function prescription(goal: TrainingGoalId, priority: ExercisePriority) {
  if (goal === "STRENGTH" && priority === "PRIMARY") {
    return { sets: 4, minReps: 3, maxReps: 5, setType: "top" as const, targetRpe: 8, progressionType: "TOP_SET_BACKOFF" as const, percentage: 82.5 };
  }
  if (goal === "STRENGTH") {
    return { sets: 3, minReps: 5, maxReps: 8, setType: "normal" as const, targetRpe: 8, progressionType: "LINEAR" as const, percentage: 75 };
  }
  if (goal === "POWERBUILDING" && priority === "PRIMARY") {
    return { sets: 4, minReps: 3, maxReps: 5, setType: "top" as const, targetRpe: 8, progressionType: "TOP_SET_BACKOFF" as const, percentage: 80 };
  }
  if (goal === "POWERBUILDING" && (priority === "ACCESSORY" || priority === "ISOLATION")) {
    return { sets: 3, minReps: 8, maxReps: 12, setType: "normal" as const, targetRpe: 8, progressionType: "DOUBLE_PROGRESSION" as const, percentage: null };
  }
  if (goal === "HYPERTROPHY" && (priority === "PRIMARY" || priority === "SECONDARY")) {
    return { sets: 3, minReps: 6, maxReps: 10, setType: "normal" as const, targetRpe: 8, progressionType: "DOUBLE_PROGRESSION" as const, percentage: 70 };
  }
  if (goal === "HYPERTROPHY") {
    return { sets: 3, minReps: 10, maxReps: 15, setType: "normal" as const, targetRpe: 8, progressionType: "DOUBLE_PROGRESSION" as const, percentage: null };
  }
  return { sets: 3, minReps: 6, maxReps: 10, setType: "normal" as const, targetRpe: 7.5, progressionType: "LINEAR" as const, percentage: null };
}
