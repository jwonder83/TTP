import { DELOAD_FAIL_STREAK } from "@/lib/training/config";
import { failStreak, sessionE1rm, sessionTooHard } from "@/lib/training/plateauDetector";
import type { LoggedSession, TrainingConfig } from "@/lib/training/types";

export function detectDeload(sessionsNewestFirst: LoggedSession[], config: TrainingConfig) {
  if (config.pendingDeload) return { suggested: true, reasons: ["accepted"] as const };
  if (sessionsNewestFirst.length < DELOAD_FAIL_STREAK) return { suggested: false, reasons: [] as string[] };
  const reasons: string[] = [];
  const misses = failStreak(sessionsNewestFirst, config.minReps);
  if (misses >= DELOAD_FAIL_STREAK) reasons.push("missed-reps");
  const hard = sessionsNewestFirst.slice(0, 3).filter((session) => sessionTooHard(session, config.targetRpe)).length;
  if (hard >= 2 && misses >= 2) reasons.push("high-effort");
  const loads = sessionsNewestFirst.slice(0, 4).map(sessionE1rm).filter((value) => value > 0);
  if (loads.length >= 3 && loads[0] < loads[loads.length - 1] * 0.97 && misses >= 2) reasons.push("e1rm-down");
  return { suggested: reasons.length > 0, reasons };
}
