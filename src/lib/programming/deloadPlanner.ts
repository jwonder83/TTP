import { DELOAD_INTENSITY_FACTOR, DELOAD_VOLUME_FACTOR } from "@/lib/programming/config";
import { fatigueScore, recoveryLabel, type FatigueInput } from "@/lib/programming/fatigueAnalyzer";
import type { GeneratedProgram } from "@/lib/programming/types";

export function suggestRecoveryWeek(input: FatigueInput, missedSessions: number) {
  return recoveryLabel(fatigueScore(input)) === "RECOVERY_NEEDED" && missedSessions >= 3;
}

export function recoveryWeekPreview(program: GeneratedProgram, weekNumber: number) {
  const week = program.weeks.find((item) => item.weekNumber === weekNumber) ?? program.weeks[0];
  if (!week) return null;
  return {
    weekNumber: week.weekNumber,
    days: week.days.map((day) => ({
      ...day,
      exercises: day.exercises.map((exercise) => ({
        ...exercise,
        sets: Math.max(1, Math.round(exercise.sets * DELOAD_VOLUME_FACTOR)),
        targetWeight: exercise.targetWeight == null ? null : Math.round(exercise.targetWeight * DELOAD_INTENSITY_FACTOR * 2) / 2,
      })),
    })),
  };
}
