import { RECOVERY_REDUCTION } from "@/lib/training/config";
import { detectDeload } from "@/lib/training/deloadDetector";
import { backoffFor, decideProgression } from "@/lib/training/progressiveOverload";
import { effortRpe } from "@/lib/training/effort";
import { failStreak } from "@/lib/training/plateauDetector";
import { roundToIncrement } from "@/lib/training/rounding";
import type { ExerciseRecommendation, LoggedSession, ReadinessInput, TrainingConfig } from "@/lib/training/types";

function confidence(count: number): ExerciseRecommendation["confidence"] {
  if (count >= 5) return "HIGH";
  if (count >= 2) return "MEDIUM";
  return "LOW";
}

function wantsRecovery(readiness: ReadinessInput | null | undefined) {
  if (!readiness) return false;
  return readiness.energy === "LOW" || readiness.sleep === "POOR";
}

export function recommendExercise(input: {
  config: TrainingConfig;
  sessionsNewestFirst: LoggedSession[];
  readiness?: ReadinessInput | null;
}): ExerciseRecommendation {
  const { config, sessionsNewestFirst } = input;
  const count = sessionsNewestFirst.length;
  const base: ExerciseRecommendation = {
    exerciseId: config.exerciseId,
    recommendedWeight: null,
    recommendedReps: null,
    recommendationType: "MANUAL",
    confidence: confidence(count),
    reason: "no-history",
    backoffWeight: null,
    backoffSets: 0,
    backoffReps: null,
    status: "NO_HISTORY",
    recoveryWeight: null,
    lastWeight: null,
    lastReps: null,
    lastRpe: null,
  };
  if (count === 0) return base;

  const latest = sessionsNewestFirst[0];
  const misses = failStreak(sessionsNewestFirst, config.minReps);
  const deload = detectDeload(sessionsNewestFirst, config);
  const decision = decideProgression(latest, config, deload.suggested ? Math.max(misses, 3) : misses);
  if (!decision) return { ...base, status: "LOW_DATA", reason: "no-work" };

  const backoff = config.progressionType === "TOP_SET_BACKOFF" || config.backoffEnabled ? backoffFor(decision.weight, config) : { weight: null, sets: 0, reps: null };
  const recoveryWeight =
    wantsRecovery(input.readiness) && decision.weight > 0
      ? roundToIncrement(decision.weight * (1 - RECOVERY_REDUCTION), config.weightIncrement)
      : null;

  const lastWork = latest.sets.find((set) => set.completed && set.setType !== "warmup");
  return {
    ...base,
    recommendedWeight: decision.weight,
    recommendedReps: decision.reps,
    recommendationType: decision.type,
    confidence: confidence(count),
    reason: decision.reason,
    backoffWeight: backoff.weight,
    backoffSets: backoff.sets,
    backoffReps: backoff.reps,
    status: count < 2 ? "LOW_DATA" : "READY",
    recoveryWeight,
    lastWeight: lastWork?.weight ?? null,
    lastReps: lastWork?.reps ?? null,
    lastRpe: lastWork ? effortRpe(lastWork) : null,
  };
}
