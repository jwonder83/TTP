import { sessionsForExercise } from "@/lib/calculations";
import { roundTo, uuid, weightStep } from "@/lib/format";
import { recommendNextLoad } from "@/lib/recommendations";
import type {
  ActiveWorkout,
  CompletedWorkout,
  Equipment,
  Exercise,
  Routine,
  RoutineExercise,
  SessionExercise,
  SetType,
  WorkoutSet,
} from "@/lib/types";

interface BuildSetsInput {
  targetWeight: number;
  targetReps: number;
  setCount: number;
  equipment: Equipment;
  completed?: boolean;
  actualTopReps?: number;
}

export function buildPlannedSets({
  targetWeight,
  targetReps,
  setCount,
  equipment,
  completed = false,
  actualTopReps,
}: BuildSetsInput): WorkoutSet[] {
  const count = Math.max(1, setCount);
  const step = weightStep(equipment);
  const warmupCount = count >= 5 ? 2 : count >= 3 ? 1 : 0;
  const topReps = actualTopReps ?? targetReps;
  const plan: Array<{ setType: SetType; ratio: number; reps: number }> = [];

  if (warmupCount >= 1) {
    plan.push({ setType: "warmup", ratio: 0.55, reps: warmupCount === 1 ? Math.min(targetReps, 8) : 10 });
  }
  if (warmupCount >= 2) {
    plan.push({ setType: "warmup", ratio: 0.73, reps: 5 });
  }
  plan.push({ setType: "top", ratio: 1, reps: topReps });

  const backoffCount = Math.max(0, count - plan.length);
  for (let index = 0; index < backoffCount; index += 1) {
    plan.push({ setType: "backoff", ratio: 0.91, reps: targetReps + 3 });
  }

  return plan.map((item, index) => ({
    id: uuid(),
    setNumber: index + 1,
    setType: item.setType,
    weight: targetWeight <= 0 ? 0 : roundTo(targetWeight * item.ratio, step),
    reps: item.reps,
    completed,
  }));
}

export function fallbackWeight(equipment: Equipment) {
  if (equipment === "dumbbell") return 12;
  if (equipment === "bodyweight") return 0;
  if (equipment === "cable") return 20;
  return 40;
}

export function createSessionExercise(
  routineExercise: RoutineExercise,
  exercise: Exercise,
  history: CompletedWorkout[],
): SessionExercise {
  const previous = sessionsForExercise(history, exercise.id);
  const recommendation = recommendNextLoad(
    previous.map((session) => ({ weight: session.key.weight, reps: session.key.reps })),
    routineExercise.defaultReps,
  );
  const targetWeight = recommendation?.weight ?? fallbackWeight(exercise.equipment);

  return {
    id: uuid(),
    exerciseId: exercise.id,
    orderIndex: routineExercise.orderIndex,
    restSeconds: routineExercise.restSeconds,
    sets: buildPlannedSets({
      targetWeight,
      targetReps: routineExercise.defaultReps,
      setCount: routineExercise.defaultSets,
      equipment: exercise.equipment,
    }),
  };
}

export function createActiveWorkout(
  routine: Routine,
  exercises: Exercise[],
  history: CompletedWorkout[],
  now = new Date(),
): ActiveWorkout {
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const sessionExercises = [...routine.exercises]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .flatMap((routineExercise) => {
      const exercise = byId.get(routineExercise.exerciseId);
      if (!exercise) return [];
      return [createSessionExercise(routineExercise, exercise, history)];
    });

  return {
    id: uuid(),
    routineId: routine.id,
    routineName: routine.name,
    startedAt: now.toISOString(),
    exercises: sessionExercises,
  };
}

export function blankSet(previous: WorkoutSet | undefined, setNumber: number): WorkoutSet {
  const setType: SetType = previous?.setType === "top" ? "backoff" : (previous?.setType ?? "normal");
  return {
    id: uuid(),
    setNumber,
    setType,
    weight: previous?.weight ?? 0,
    reps: previous?.reps ?? 0,
    completed: false,
  };
}
