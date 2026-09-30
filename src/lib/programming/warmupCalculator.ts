import { roundToIncrement } from "@/lib/training/rounding";

export interface WarmupSet {
  weight: number;
  reps: number;
}

const STEPS = [
  { ratio: 0.3, reps: 8 },
  { ratio: 0.5, reps: 5 },
  { ratio: 0.7, reps: 3 },
  { ratio: 0.85, reps: 1 },
];

export function warmupSets(workingWeight: number, increment = 2.5, compound = true): WarmupSet[] {
  if (!compound || workingWeight < 40) return workingWeight >= 20 ? [{ weight: roundToIncrement(workingWeight * 0.5, increment), reps: 5 }] : [];
  return STEPS.map((step) => ({
    weight: roundToIncrement(workingWeight * step.ratio, increment),
    reps: step.reps,
  })).filter((set) => set.weight > 0 && set.weight < workingWeight);
}
