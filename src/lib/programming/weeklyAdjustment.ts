import { decideAdaptation } from "@/lib/programming/adaptiveProgramming";
import type { AdaptiveInput, GeneratedProgram } from "@/lib/programming/types";

export interface AdjustmentLine {
  exerciseId: string;
  name: string;
  fromWeight: number | null;
  toWeight: number | null;
  fromSets: number;
  toSets: number;
  action: string;
  reason: string;
}

export function previewWeeklyAdjustment(
  program: GeneratedProgram,
  items: Array<{ exerciseId: string; input: AdaptiveInput }>,
  weekNumber: number,
) {
  const next = structuredClone(program);
  const week = next.weeks.find((item) => item.weekNumber === weekNumber);
  const lines: AdjustmentLine[] = [];
  if (!week) return { lines, program: next };
  for (const item of items) {
    const decision = decideAdaptation(item.input);
    for (const day of week.days) {
      for (const exercise of day.exercises) {
        if (exercise.exerciseId !== item.exerciseId) continue;
        const fromWeight = exercise.targetWeight;
        const fromSets = exercise.sets;
        if (decision.nextWeight != null && exercise.targetWeight != null) exercise.targetWeight = decision.nextWeight;
        exercise.sets = Math.max(1, exercise.sets + decision.nextSetsDelta);
        lines.push({
          exerciseId: exercise.exerciseId,
          name: exercise.name,
          fromWeight,
          toWeight: exercise.targetWeight,
          fromSets,
          toSets: exercise.sets,
          action: decision.action,
          reason: decision.reason,
        });
      }
    }
  }
  return { lines, program: next };
}
