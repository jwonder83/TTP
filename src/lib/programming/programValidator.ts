import { overVolume } from "@/lib/programming/volumeCalculator";
import type { GeneratedProgram, VolumeWarning } from "@/lib/programming/types";

export interface ProgramValidation {
  ok: boolean;
  warnings: VolumeWarning[];
  empty: boolean;
}

export function validateProgram(program: GeneratedProgram): ProgramValidation {
  const days = program.weeks[0]?.days ?? [];
  const warnings = overVolume(days, program.goal, "INTERMEDIATE");
  const empty = days.every((day) => day.exercises.length === 0);
  return { ok: !empty, warnings, empty };
}
