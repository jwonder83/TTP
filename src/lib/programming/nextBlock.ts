import { generateProgram } from "@/lib/programming/programGenerator";
import type { GeneratorInput, HistoryPoint } from "@/lib/programming/types";

export function stalledExerciseIds(history: HistoryPoint[]) {
  const byExercise = new Map<string, number[]>();
  for (const point of history) {
    if (point.reps <= 0 || point.reps > 10 || point.weight <= 0) continue;
    const estimated = point.weight * (1 + point.reps / 30);
    const list = byExercise.get(point.exerciseId) ?? [];
    list.push(estimated);
    byExercise.set(point.exerciseId, list);
  }
  const stalled: string[] = [];
  for (const [id, values] of byExercise) {
    if (values.length < 3) continue;
    const first = values[0] ?? 0;
    const last = values[values.length - 1] ?? 0;
    if (last <= first * 1.01) stalled.push(id);
  }
  return stalled;
}

export function generateNextBlock(input: GeneratorInput) {
  const stalled = stalledExerciseIds(input.history);
  const program = generateProgram({ ...input, profile: { ...input.profile, variation: (input.profile.variation ?? 0) + 1 } });
  if (!program) return null;
  if (stalled.length > 0) {
    program.explanation = [...program.explanation, "Lifts that stayed flat keep their load and stay early in the session."];
  }
  return program;
}
