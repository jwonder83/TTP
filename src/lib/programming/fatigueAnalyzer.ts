import type { RecoveryLabel } from "@/lib/programming/types";

export interface FatigueInput {
  recentRpe: number[];
  missRate: number;
  readinessLow: boolean;
  volumeUp: boolean;
  trendDown: boolean;
  completionRate: number;
}

export function fatigueScore(input: FatigueInput) {
  let score = 25;
  score += Math.min(40, input.missRate * 50);
  const high = input.recentRpe.filter((value) => value >= 9).length;
  score += Math.min(20, high * 6);
  if (input.readinessLow) score += 12;
  if (input.volumeUp && input.trendDown) score += 10;
  if (input.completionRate < 0.6) score += 10;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function recoveryLabel(score: number): RecoveryLabel {
  if (score < 40) return "READY";
  if (score <= 70) return "NORMAL";
  return "RECOVERY_NEEDED";
}

export function recoveryReason(input: FatigueInput, label: RecoveryLabel) {
  if (label === "READY") return "Recent sessions are inside the target range.";
  if (label === "RECOVERY_NEEDED") return "Several recent sessions missed the target range or stayed very hard.";
  if (input.recentRpe.some((value) => value >= 9)) return "One hard set is not enough to change the plan. The week still looks typical.";
  return "Training load looks typical for this block.";
}
