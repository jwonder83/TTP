import { volumeBand } from "@/lib/programming/config";
import type { GeneratedDay, MuscleGroup, TrainingGoalId, ExperienceLevel } from "@/lib/programming/types";

export function weeklySets(days: GeneratedDay[]) {
  const totals = {} as Record<MuscleGroup, number>;
  for (const day of days) {
    for (const exercise of day.exercises) {
      totals[exercise.muscle] = (totals[exercise.muscle] ?? 0) + exercise.sets;
    }
  }
  return totals;
}

export function overVolume(days: GeneratedDay[], goal: TrainingGoalId, experience: ExperienceLevel) {
  const band = volumeBand(goal, experience);
  const totals = weeklySets(days);
  return (Object.keys(totals) as MuscleGroup[])
    .filter((muscle) => totals[muscle] > band[muscle].max)
    .map((muscle) => ({ muscle, sets: totals[muscle], baselineMax: band[muscle].max }));
}
