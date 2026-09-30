import { APPROPRIATE_RPE, FAIL_STREAK_FOR_REDUCE, HIGH_RPE } from "@/lib/programming/config";
import { clampProgression } from "@/lib/programming/intensityCalculator";
import type { AdaptiveInput, AdaptiveResult } from "@/lib/programming/types";

export function decideAdaptation(input: AdaptiveInput): AdaptiveResult {
  const sessions = input.sessions.filter((session) => session.weight > 0 && session.reps > 0);
  if (sessions.length < 1) {
    return { action: "NO_RECOMMENDATION", nextWeight: null, nextSetsDelta: 0, reason: "Complete a session before the load changes." };
  }
  const newestFirst = sessions;
  let misses = 0;
  for (const session of newestFirst) {
    if (session.hitTarget) break;
    misses += 1;
  }
  const last = newestFirst[0]!;
  const rpe = last.rpe ?? null;
  const hardOnce = rpe != null && rpe >= HIGH_RPE;
  if (misses >= FAIL_STREAK_FOR_REDUCE) {
    const reduced = clampProgression(last.weight, last.weight * 0.9, input.priority);
    return { action: "DELOAD", nextWeight: reduced, nextSetsDelta: -1, reason: "The target range was missed across several sessions." };
  }
  if (misses === 1) {
    return { action: "KEEP", nextWeight: last.weight, nextSetsDelta: 0, reason: "One session outside the target range. Keep the same load." };
  }
  if (hardOnce && last.hitTarget) {
    return { action: "KEEP", nextWeight: last.weight, nextSetsDelta: 0, reason: "The last set was very hard. Keep the load for the next session." };
  }
  const appropriate = rpe == null || rpe <= APPROPRIATE_RPE;
  if (last.hitTarget && appropriate) {
    const proposed = last.weight + input.increment;
    return {
      action: "INCREASE",
      nextWeight: clampProgression(last.weight, proposed, input.priority),
      nextSetsDelta: 0,
      reason: "The target range was met at an appropriate effort. Add the usual increment.",
    };
  }
  if (last.hitTarget && last.reps >= input.maxReps && (rpe == null || rpe <= 7) && newestFirst[1]?.hitTarget) {
    return { action: "CHANGE_VOLUME", nextWeight: last.weight, nextSetsDelta: 1, reason: "The top of the rep range stayed easy. Add one set before more load." };
  }
  return { action: "REPEAT", nextWeight: last.weight, nextSetsDelta: 0, reason: "Repeat this load and stay inside the rep range." };
}

export function resolveLoggedWeight(actual: number, recommended: number | null, accepted: boolean) {
  if (accepted && recommended != null && Number.isFinite(recommended)) return recommended;
  return actual;
}
