import type { CompletedWorkout, Exercise } from "@/lib/types";
import { defaultTrainingConfig, type LoggedSession, type TrainingConfig } from "@/lib/training/types";

export function coachSessions(history: CompletedWorkout[], exerciseId: string): LoggedSession[] {
  return [...history]
    .sort((a, b) => b.date.localeCompare(a.date) || b.startedAt.localeCompare(a.startedAt))
    .flatMap((workout) => {
      const session = workout.exercises.find((item) => item.exerciseId === exerciseId);
      if (!session) return [];
      const sets = session.sets
        .filter((set) => set.completed && set.reps > 0)
        .map((set) => ({
          setType: set.setType,
          weight: set.weight,
          reps: set.reps,
          completed: set.completed,
          rpe: set.rpe,
          rir: set.rir,
        }));
      if (!sets.some((set) => set.setType !== "warmup")) return [];
      return [{ date: workout.date, sets }];
    });
}

export function resolveConfig(stored: TrainingConfig[] | undefined, exercise: Exercise, defaultReps: number) {
  return stored?.find((item) => item.exerciseId === exercise.id) ?? defaultTrainingConfig(exercise.id, exercise.equipment, exercise.kind, defaultReps);
}
