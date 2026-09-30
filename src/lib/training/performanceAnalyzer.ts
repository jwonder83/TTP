import { effortRpe } from "@/lib/training/effort";
import type { LoggedSet, PerformanceStatus, TrainingConfig } from "@/lib/training/types";

export type SetOutcome = "ABOVE" | "IN_RANGE" | "BELOW" | "SKIPPED";

export function classifyReps(reps: number, minReps: number, maxReps: number, completed: boolean): SetOutcome {
  if (!completed) return "SKIPPED";
  if (reps > maxReps) return "ABOVE";
  if (reps >= minReps) return "IN_RANGE";
  return "BELOW";
}

export function analyzePerformance(sets: LoggedSet[], config: TrainingConfig, recovery: boolean): PerformanceStatus {
  const working = sets.filter((set) => set.setType !== "warmup");
  const judged = working.filter((set) => set.completed);
  if (judged.length === 0) return "PARTIAL";
  const outcomes = judged.map((set) => classifyReps(set.reps, config.minReps, config.maxReps, true));
  const below = outcomes.filter((item) => item === "BELOW").length;
  const hit = outcomes.filter((item) => item === "IN_RANGE" || item === "ABOVE").length;
  const efforts = judged.map(effortRpe).filter((value): value is number => value != null);
  const easy = efforts.length > 0 && Math.max(...efforts) <= config.targetRpe - 1;
  if (recovery) return "RECOVERY";
  if (below === 0 && hit === judged.length && (easy || efforts.length === 0)) return below === 0 && easy ? "EXCELLENT" : "SUCCESS";
  if (below === 0) return "SUCCESS";
  if (hit > 0) return "PARTIAL";
  return "FAILED";
}

export function performanceLabel(status: PerformanceStatus) {
  if (status === "EXCELLENT") return "STRONG SESSION";
  if (status === "SUCCESS") return "TARGET HIT";
  if (status === "PARTIAL") return "PARTIAL TARGET";
  if (status === "RECOVERY") return "RECOVERY SESSION";
  return "BELOW TARGET";
}
