import { estimate1RM } from "@/lib/calculations";
import { E1RM_NOISE_PERCENT, PLATEAU_SESSION_COUNT, STRENGTH_REP_CAP } from "@/lib/training/config";
import { effortRpe } from "@/lib/training/effort";
import type { LoggedSession } from "@/lib/training/types";

export function strengthLoad(set: { weight: number; reps: number }) {
  if (set.weight <= 0 || set.reps < 1 || set.reps > STRENGTH_REP_CAP) return 0;
  return estimate1RM(set.weight, set.reps);
}

export function sessionE1rm(session: LoggedSession) {
  const loads = session.sets
    .filter((set) => set.completed && set.setType !== "warmup")
    .map(strengthLoad)
    .filter((value) => value > 0);
  return loads.length === 0 ? 0 : Math.max(...loads);
}

export function detectPlateau(sessionsNewestFirst: LoggedSession[]) {
  const recent = sessionsNewestFirst.filter((session) => sessionE1rm(session) > 0).slice(0, Math.max(PLATEAU_SESSION_COUNT, 5));
  if (recent.length < PLATEAU_SESSION_COUNT) return { detected: false, changePercent: 0 };
  const values = [...recent].reverse().map(sessionE1rm);
  const first = values[0];
  const last = values[values.length - 1];
  const changePercent = first <= 0 ? 0 : ((last - first) / first) * 100;
  const weights = recent.map((session) => {
    const working = session.sets.filter((set) => set.completed && set.setType !== "warmup" && set.weight > 0);
    return working.reduce((max, set) => Math.max(max, set.weight), 0);
  });
  const weightStuck = Math.max(...weights) - Math.min(...weights) < 0.2;
  const detected = Math.abs(changePercent) < E1RM_NOISE_PERCENT && weightStuck;
  return { detected, changePercent };
}

export function failStreak(sessionsNewestFirst: LoggedSession[], minReps: number) {
  let streak = 0;
  for (const session of sessionsNewestFirst) {
    const working = session.sets.filter((set) => set.completed && set.setType !== "warmup" && (set.setType === "top" || set.setType === "normal" || set.setType === "amrap"));
    const pool = working.length > 0 ? working : session.sets.filter((set) => set.completed && set.setType !== "warmup");
    if (pool.length === 0) break;
    const missed = pool.some((set) => set.reps < minReps);
    if (!missed) break;
    streak += 1;
  }
  return streak;
}

export function sessionTooHard(session: LoggedSession, targetRpe: number) {
  const efforts = session.sets
    .filter((set) => set.completed && set.setType !== "warmup")
    .map(effortRpe)
    .filter((value): value is number => value != null);
  if (efforts.length === 0) return false;
  return Math.max(...efforts) >= Math.max(9.5, targetRpe + 1.5);
}
