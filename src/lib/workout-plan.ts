import { sessionsForExercise } from "@/lib/calculations";
import { roundTo, uuid, weightStep } from "@/lib/format";
import { recommendNextLoad } from "@/lib/recommendations";
import { coachSessions, resolveConfig } from "@/lib/training/history";
import { recommendExercise } from "@/lib/training/recommendationEngine";
import type { ReadinessInput, TrainingConfig } from "@/lib/training/types";
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
  options?: {
    configs?: TrainingConfig[];
    readiness?: ReadinessInput | null;
    useRecovery?: boolean;
    weightOverride?: number | null;
  },
): SessionExercise {
  const config = resolveConfig(options?.configs, exercise, routineExercise.defaultReps);
  const recommendation = recommendExercise({
    config,
    sessionsNewestFirst: coachSessions(history, exercise.id),
    readiness: options?.readiness,
  });
  const legacy = recommendNextLoad(
    sessionsForExercise(history, exercise.id).map((session) => ({ weight: session.key.weight, reps: session.key.reps })),
    routineExercise.defaultReps,
  );
  const suggested =
    options?.useRecovery && recommendation.recoveryWeight != null
      ? recommendation.recoveryWeight
      : recommendation.recommendedWeight;
  const targetWeight = options?.weightOverride ?? suggested ?? legacy?.weight ?? fallbackWeight(exercise.equipment);
  const targetReps = recommendation.recommendedReps ?? routineExercise.defaultReps;
  const applied = options?.weightOverride == null && suggested != null && targetWeight === suggested;
  const sets = buildPlannedSets({
    targetWeight,
    targetReps,
    setCount: routineExercise.defaultSets,
    equipment: exercise.equipment,
  }).map((set) => {
    if (set.setType === "backoff" && recommendation.backoffWeight != null && applied) {
      return {
        ...set,
        weight: recommendation.backoffWeight,
        reps: recommendation.backoffReps ?? set.reps,
        recommendationWeight: recommendation.backoffWeight,
        recommendationApplied: true,
        targetReps: recommendation.backoffReps ?? set.reps,
      };
    }
    if (set.setType === "top" || set.setType === "normal") {
      return {
        ...set,
        recommendationWeight: recommendation.recommendedWeight,
        recommendationApplied: applied,
        targetReps,
      };
    }
    return set;
  });

  return {
    id: uuid(),
    exerciseId: exercise.id,
    orderIndex: routineExercise.orderIndex,
    restSeconds: routineExercise.restSeconds,
    sets,
  };
}

export interface ActivePlanOptions {
  configs?: TrainingConfig[];
  readiness?: ReadinessInput | null;
  useRecovery?: boolean;
  weightOverrides?: Record<string, number>;
}

export function createActiveWorkout(
  routine: Routine,
  exercises: Exercise[],
  history: CompletedWorkout[],
  now = new Date(),
  options?: ActivePlanOptions,
): ActiveWorkout {
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const sessionExercises = [...routine.exercises]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .flatMap((routineExercise) => {
      const exercise = byId.get(routineExercise.exerciseId);
      if (!exercise) return [];
      return [createSessionExercise(routineExercise, exercise, history, {
        configs: options?.configs,
        readiness: options?.readiness,
        useRecovery: options?.useRecovery,
        weightOverride: options?.weightOverrides?.[exercise.id] ?? null,
      })];
    });

  return {
    id: uuid(),
    routineId: routine.id,
    routineName: routine.name,
    startedAt: now.toISOString(),
    exercises: sessionExercises,
    readiness: options?.readiness ?? null,
    recoveryMode: Boolean(options?.useRecovery),
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
