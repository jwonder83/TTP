import type { GeneratedProgram, TrainingProfileInput } from "@/lib/programming/types";

export function explainProgram(profile: TrainingProfileInput, program: Pick<GeneratedProgram, "split" | "durationWeeks" | "daysPerWeek">) {
  const lines = [
    `${profile.goal} for ${profile.experience.toLowerCase()} training, ${program.daysPerWeek} days each week.`,
    `Split: ${program.split}. Block length: ${program.durationWeeks} weeks.`,
    profile.sessionMinutes <= 60
      ? "Session length keeps the day to the main lifts plus a short accessory list."
      : "The longer session adds accessory work after the main lifts.",
  ];
  if (profile.preferredExerciseIds.length > 0) lines.push("Preferred exercises are placed first when the equipment allows them.");
  if (profile.avoidExerciseIds.length > 0) lines.push("Avoided exercises are left out. You can add them back yourself.");
  return lines;
}

export function explainAdaptation(reason: string) {
  return reason;
}
