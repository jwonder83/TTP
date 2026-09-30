import { HIGH_RPE } from "@/lib/training/config";
import { calculateBackoffWeight } from "@/lib/training/backoffCalculator";
import { effortRpe } from "@/lib/training/effort";
import { roundToIncrement } from "@/lib/training/rounding";
import type { LoggedSession, TrainingConfig } from "@/lib/training/types";

export interface ProgressionDecision {
  type: "INCREASE" | "KEEP" | "DELOAD";
  weight: number;
  reps: number;
  reason: string;
}

function keySet(session: LoggedSession) {
  const working = session.sets.filter((set) => set.completed && set.setType !== "warmup");
  const tops = working.filter((set) => set.setType === "top");
  const pool = tops.length > 0 ? tops : working;
  if (pool.length === 0) return null;
  return pool.reduce((best, set) => (set.weight > best.weight || (set.weight === best.weight && set.reps > best.reps) ? set : best));
}

function allHitCeiling(session: LoggedSession, maxReps: number) {
  const working = session.sets.filter((set) => set.completed && set.setType !== "warmup" && set.setType !== "backoff");
  if (working.length === 0) return false;
  return working.every((set) => set.reps >= maxReps);
}

export function decideProgression(session: LoggedSession, config: TrainingConfig, failCount: number): ProgressionDecision | null {
  const key = keySet(session);
  if (!key) return null;
  const effort = effortRpe(key);
  const hard = effort != null && effort >= HIGH_RPE;
  const bodyweight = key.weight <= 0;

  if (failCount >= 3) {
    const reduced = bodyweight ? 0 : roundToIncrement(key.weight * (1 - config.deloadPercentage / 100), config.weightIncrement);
    return {
      type: "DELOAD",
      weight: Math.max(0, reduced),
      reps: config.minReps,
      reason: "deload",
    };
  }

  if (config.progressionType === "MANUAL") {
    return { type: "KEEP", weight: key.weight, reps: key.reps, reason: "manual" };
  }

  if (config.progressionType === "DOUBLE_PROGRESSION") {
    if (allHitCeiling(session, config.maxReps) && !hard) {
      if (bodyweight) {
        return { type: "INCREASE", weight: 0, reps: config.maxReps + 1, reason: "double-up" };
      }
      return {
        type: "INCREASE",
        weight: roundToIncrement(key.weight + config.weightIncrement, config.weightIncrement),
        reps: config.minReps,
        reason: "double-up",
      };
    }
    return {
      type: "KEEP",
      weight: key.weight,
      reps: config.maxReps,
      reason: hard ? "double-hard" : "double-keep",
    };
  }

  const target = config.progressionType === "LINEAR" ? config.minReps : config.minReps;
  const madeReps = key.reps >= target;
  if (madeReps && !hard) {
    return {
      type: "INCREASE",
      weight: bodyweight ? 0 : roundToIncrement(key.weight + config.weightIncrement, config.weightIncrement),
      reps: bodyweight ? key.reps + 1 : target,
      reason: effort != null && effort < config.targetRpe ? "linear-easy" : "linear-up",
    };
  }
  return {
    type: "KEEP",
    weight: key.weight,
    reps: target,
    reason: madeReps ? "linear-hard" : "linear-miss",
  };
}

export function backoffFor(topWeight: number, config: TrainingConfig) {
  if (!config.backoffEnabled || topWeight <= 0) return { weight: null as number | null, sets: 0, reps: null as number | null };
  return {
    weight: calculateBackoffWeight(topWeight, config.backoffPercentage, config.weightIncrement),
    sets: config.backoffSets,
    reps: config.backoffMinReps,
  };
}
