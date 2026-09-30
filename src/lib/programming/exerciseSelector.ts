import type { Exercise } from "@/lib/types";
import { catalogMeta, equipmentAllows } from "@/lib/programming/catalog";
import type { EquipmentChoice, HistoryPoint, MovementPattern } from "@/lib/programming/types";
import type { SplitSlot } from "@/lib/programming/splitGenerator";

export function selectForSlot(
  slot: SplitSlot,
  exercises: Exercise[],
  equipment: EquipmentChoice[],
  preferred: string[],
  avoid: string[],
  used: Set<string>,
  history: HistoryPoint[],
  variation: number,
) {
  const counts = new Map<string, number>();
  for (const point of history) counts.set(point.exerciseId, (counts.get(point.exerciseId) ?? 0) + 1);
  const matches = exercises.filter((exercise) => {
    if (avoid.includes(exercise.id) || used.has(exercise.id)) return false;
    if (!equipmentAllows(exercise, equipment)) return false;
    const meta = catalogMeta(exercise);
    if (slot.pattern === "ISOLATION") return meta.pattern === "ISOLATION" || meta.priority === "ISOLATION";
    return meta.pattern === slot.pattern;
  });
  matches.sort((a, b) => {
    const prefer = Number(preferred.includes(b.id)) - Number(preferred.includes(a.id));
    if (prefer !== 0) return prefer;
    const historyGap = (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0);
    if (historyGap !== 0) return historyGap;
    return a.name.localeCompare(b.name);
  });
  if (matches.length === 0) return null;
  return matches[Math.abs(variation) % matches.length] ?? null;
}

export function patternOf(exercise: Exercise): MovementPattern {
  return catalogMeta(exercise).pattern;
}

export function rankSubstitutes(
  exercise: Exercise,
  exercises: Exercise[],
  equipment: EquipmentChoice[],
  behavior: Array<{ toExerciseId: string; count: number }>,
) {
  const meta = catalogMeta(exercise);
  return exercises
    .filter((item) => item.id !== exercise.id && equipmentAllows(item, equipment))
    .filter((item) => catalogMeta(item).pattern === meta.pattern)
    .sort((a, b) => {
      const countA = behavior.find((entry) => entry.toExerciseId === a.id)?.count ?? 0;
      const countB = behavior.find((entry) => entry.toExerciseId === b.id)?.count ?? 0;
      if (countB !== countA) return countB - countA;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 4);
}
