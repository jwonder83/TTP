import { createClient } from "@/lib/supabase/client";
import type { ExerciseRecommendation, ReadinessInput, TrainingConfig, TrainingGoal } from "@/lib/training/types";

function client() {
  return createClient();
}

function num(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function fetchTrainingConfigs(): Promise<TrainingConfig[]> {
  const { data, error } = await client().from("exercise_training_config").select("*");
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => ({
    exerciseId: String(row.exercise_id),
    progressionType: row.progression_type as TrainingConfig["progressionType"],
    minReps: num(row.min_reps, 5),
    maxReps: num(row.max_reps, 8),
    weightIncrement: num(row.weight_increment, 2.5),
    targetRpe: num(row.target_rpe, 8),
    topSetEnabled: Boolean(row.top_set_enabled),
    backoffEnabled: Boolean(row.backoff_enabled),
    backoffPercentage: num(row.backoff_percentage, 90),
    backoffSets: num(row.backoff_sets, 2),
    backoffMinReps: num(row.backoff_min_reps, 6),
    backoffMaxReps: num(row.backoff_max_reps, 8),
    deloadPercentage: num(row.deload_percentage, 10),
    pendingDeload: Boolean(row.pending_deload),
  }));
}

export async function saveTrainingConfig(userId: string, config: TrainingConfig) {
  const { error } = await client().from("exercise_training_config").upsert(
    {
      user_id: userId,
      exercise_id: config.exerciseId,
      progression_type: config.progressionType,
      min_reps: config.minReps,
      max_reps: Math.max(config.minReps, config.maxReps),
      weight_increment: config.weightIncrement,
      target_rpe: config.targetRpe,
      top_set_enabled: config.topSetEnabled,
      backoff_enabled: config.backoffEnabled,
      backoff_percentage: config.backoffPercentage,
      backoff_sets: config.backoffSets,
      backoff_min_reps: config.backoffMinReps,
      backoff_max_reps: Math.max(config.backoffMinReps, config.backoffMaxReps),
      deload_percentage: config.deloadPercentage,
      pending_deload: config.pendingDeload,
    },
    { onConflict: "user_id,exercise_id" },
  );
  if (error) throw error;
}

export async function fetchGoals(): Promise<TrainingGoal[]> {
  const { data, error } = await client().from("training_goals").select("*").eq("status", "active");
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    exerciseId: String(row.exercise_id),
    goalType: row.goal_type === "WEIGHT_REPS" ? "WEIGHT_REPS" : "ONE_RM",
    targetWeight: row.target_weight == null ? null : num(row.target_weight, 0),
    targetReps: row.target_reps == null ? null : num(row.target_reps, 0),
    targetEstimated1rm: row.target_estimated_1rm == null ? null : num(row.target_estimated_1rm, 0),
    targetDate: (row.target_date as string | null) ?? null,
    status: "active",
  }));
}

export async function saveGoal(userId: string, goal: TrainingGoal) {
  const { error } = await client().from("training_goals").upsert({
    id: goal.id,
    user_id: userId,
    exercise_id: goal.exerciseId,
    goal_type: goal.goalType,
    target_weight: goal.targetWeight,
    target_reps: goal.targetReps,
    target_estimated_1rm: goal.targetEstimated1rm,
    target_date: goal.targetDate,
    status: goal.status,
  });
  if (error) throw error;
}

export async function saveReadiness(userId: string, workoutId: string, readiness: ReadinessInput) {
  const { error } = await client().from("workout_readiness").upsert(
    {
      user_id: userId,
      workout_id: workoutId,
      energy: readiness.energy,
      sleep: readiness.sleep,
      soreness: readiness.soreness,
    },
    { onConflict: "workout_id" },
  );
  if (error) throw error;
}

export async function saveRecommendation(userId: string, workoutId: string | null, recommendation: ExerciseRecommendation, accepted: boolean | null) {
  const { error } = await client().from("training_recommendations").insert({
    user_id: userId,
    exercise_id: recommendation.exerciseId,
    workout_id: workoutId,
    recommended_weight: recommendation.recommendedWeight,
    recommended_reps: recommendation.recommendedReps,
    recommendation_type: recommendation.recommendationType,
    reason: recommendation.reason,
    confidence: recommendation.confidence,
    accepted,
  });
  if (error) throw error;
}
