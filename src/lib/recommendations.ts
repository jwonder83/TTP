import { roundTo } from "@/lib/format";
import type { LoadRecommendation } from "@/lib/types";

/**
 * Load suggestion from recent key sets. No external model.
 * Hit the rep target -> +2.5kg. Miss once -> hold. Miss twice in a row -> -5%.
 */
export function recommendNextLoad(
  recentNewestFirst: Array<{ weight: number; reps: number }>,
  targetReps: number,
  step = 2.5,
): LoadRecommendation | null {
  if (recentNewestFirst.length === 0 || targetReps <= 0) return null;

  const latest = recentNewestFirst[0];
  let failStreak = 0;
  for (const session of recentNewestFirst) {
    if (session.reps < targetReps) failStreak += 1;
    else break;
  }

  if (failStreak >= 2) {
    return {
      weight: Math.max(step, roundTo(latest.weight * 0.95, 0.5)),
      reps: targetReps,
      reason: "deload",
      previousWeight: latest.weight,
      previousReps: latest.reps,
      failStreak,
    };
  }

  if (latest.reps >= targetReps) {
    return {
      weight: roundTo(latest.weight + step, 0.5),
      reps: targetReps,
      reason: "progress",
      previousWeight: latest.weight,
      previousReps: latest.reps,
      failStreak,
    };
  }

  return {
    weight: latest.weight,
    reps: targetReps,
    reason: "hold",
    previousWeight: latest.weight,
    previousReps: latest.reps,
    failStreak,
  };
}
