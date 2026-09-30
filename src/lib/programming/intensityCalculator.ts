import { roundToIncrement } from "@/lib/training/rounding";
import { HARD_STEP_PERCENT, maxStepKg } from "@/lib/programming/config";
import type { ExercisePriority } from "@/lib/programming/types";

export function weightFromBaseline(baseline: number | null, percentage: number | null, increment: number) {
  if (baseline == null || baseline <= 0 || percentage == null) return null;
  return roundToIncrement(baseline * (percentage / 100), increment);
}

export function clampProgression(current: number, proposed: number, priority: ExercisePriority) {
  if (!Number.isFinite(current) || current <= 0) return proposed;
  const cap = maxStepKg(priority, current);
  const delta = proposed - current;
  if (delta > cap) return roundToIncrement(current + cap, priority === "PRIMARY" ? 2.5 : 2);
  if (proposed > current * (1 + HARD_STEP_PERCENT)) return roundToIncrement(current * (1 + HARD_STEP_PERCENT), 2.5);
  return proposed;
}
