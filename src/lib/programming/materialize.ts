import type { TrainingProgram } from "@/lib/api/programs";
import { uuid } from "@/lib/format";
import type { GeneratedProgram } from "@/lib/programming/types";

export function materializeProgram(generated: GeneratedProgram, id = uuid()): TrainingProgram {
  return {
    id,
    name: generated.name,
    description: generated.explanation.join(" "),
    durationWeeks: generated.durationWeeks,
    currentWeek: 1,
    status: "active",
    startedAt: new Date().toISOString(),
    plannedDays: generated.plannedDays,
    days: generated.weeks.flatMap((week) =>
      week.days.map((day, dayIndex) => ({
        id: uuid(),
        weekNumber: week.weekNumber,
        dayNumber: dayIndex + 1,
        name: day.name,
        scheduledDay: day.scheduledDay,
        orderIndex: dayIndex,
        exercises: day.exercises.map((exercise, orderIndex) => ({
          id: uuid(),
          exerciseId: exercise.exerciseId,
          orderIndex,
          sets: exercise.sets,
          minReps: exercise.minReps,
          maxReps: exercise.maxReps,
          targetWeight: exercise.targetWeight,
          percentage1rm: exercise.percentage1rm,
          setType: exercise.setType,
          restSeconds: exercise.restSeconds,
        })),
      })),
    ),
  };
}
