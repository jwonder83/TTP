import type { Exercise } from "@/lib/types";

export function exerciseAlternatives(exercise: Exercise, catalog: Exercise[]) {
  return catalog
    .filter((item) => item.id !== exercise.id && item.category === exercise.category)
    .sort((a, b) => Number(b.equipment === exercise.equipment) - Number(a.equipment === exercise.equipment))
    .slice(0, 4);
}
