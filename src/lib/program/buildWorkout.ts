import { calculateBackoffWeight } from "@/lib/training/backoffCalculator";
import { coachSessions, resolveConfig } from "@/lib/training/history";
import { sessionE1rm } from "@/lib/training/plateauDetector";
import type { TrainingConfig } from "@/lib/training/types";
import { weightFromPercentage } from "@/lib/program/percent";
import type { CompletedWorkout, Exercise, SessionExercise, SetType } from "@/lib/types";
import { createSessionExercise } from "@/lib/workout-plan";
import { uuid } from "@/lib/format";

export interface ProgramExercisePlan {
  id: string;
  exerciseId: string;
  orderIndex: number;
  sets: number;
  minReps: number;
  maxReps: number;
  targetWeight: number | null;
  percentage1rm: number | null;
  setType: SetType;
  restSeconds: number;
}

export function sessionFromProgramExercise(
  plan: ProgramExercisePlan,
  exercise: Exercise,
  history: CompletedWorkout[],
  configs: TrainingConfig[],
): SessionExercise {
  const config = resolveConfig(configs, exercise, plan.maxReps);
  const latest = coachSessions(history, exercise.id)[0];
  const estimated = latest ? sessionE1rm(latest) : 0;
  const fromPercent = plan.percentage1rm != null ? weightFromPercentage(estimated, plan.percentage1rm, config.weightIncrement) : null;
  const session = createSessionExercise(
    {
      id: plan.id || uuid(),
      exerciseId: exercise.id,
      orderIndex: plan.orderIndex,
      defaultSets: plan.sets,
      defaultReps: plan.maxReps,
      restSeconds: plan.restSeconds,
    },
    exercise,
    history,
    {
      configs,
      weightOverride: plan.targetWeight ?? fromPercent,
    },
  );
  if (fromPercent != null && config.backoffEnabled) {
    const backoff = calculateBackoffWeight(fromPercent, config.backoffPercentage, config.weightIncrement);
    return {
      ...session,
      sets: session.sets.map((set) => (set.setType === "backoff" ? { ...set, weight: backoff } : set)),
    };
  }
  return session;
}
