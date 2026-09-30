import { createClient } from "@/lib/supabase/client";
import type { ProgramExercisePlan } from "@/lib/program/buildWorkout";
import type { SetType } from "@/lib/types";

export interface TrainingProgram {
  id: string;
  name: string;
  description: string;
  durationWeeks: number;
  currentWeek: number;
  status: "draft" | "active" | "paused" | "completed";
  startedAt: string | null;
  days: ProgramDay[];
}

export interface ProgramDay {
  id: string;
  weekNumber: number;
  dayNumber: number;
  name: string;
  scheduledDay: number | null;
  orderIndex: number;
  exercises: ProgramExercisePlan[];
}

const SELECT = `
  id, name, description, duration_weeks, current_week, status, started_at,
  program_days (
    id, week_number, day_number, name, scheduled_day, order_index,
    program_exercises (
      id, exercise_id, order_index, sets, min_reps, max_reps, target_weight,
      target_rpe, percentage_1rm, set_type, rest_seconds, notes
    )
  )
`;

function num(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function fetchPrograms(): Promise<TrainingProgram[]> {
  const { data, error } = await createClient().from("training_programs").select(SELECT).order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map(mapProgram);
}

function mapProgram(row: Record<string, unknown>): TrainingProgram {
  const days = Array.isArray(row.program_days) ? row.program_days : [];
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    description: String(row.description ?? ""),
    durationWeeks: num(row.duration_weeks, 8),
    currentWeek: num(row.current_week, 1),
    status: (row.status as TrainingProgram["status"]) ?? "draft",
    startedAt: (row.started_at as string | null) ?? null,
    days: days.map((day) => mapDay(day as Record<string, unknown>)).sort((a, b) => a.weekNumber - b.weekNumber || a.orderIndex - b.orderIndex),
  };
}

function mapDay(row: Record<string, unknown>): ProgramDay {
  const exercises = Array.isArray(row.program_exercises) ? row.program_exercises : [];
  return {
    id: String(row.id),
    weekNumber: num(row.week_number, 1),
    dayNumber: num(row.day_number, 1),
    name: String(row.name ?? ""),
    scheduledDay: row.scheduled_day == null ? null : num(row.scheduled_day),
    orderIndex: num(row.order_index),
    exercises: exercises
      .map((item) => {
        const row = item as Record<string, unknown>;
        return {
          id: String(row.id),
          exerciseId: String(row.exercise_id),
          orderIndex: num(row.order_index),
          sets: num(row.sets, 3),
          minReps: num(row.min_reps, 5),
          maxReps: num(row.max_reps, 5),
          targetWeight: row.target_weight == null ? null : num(row.target_weight),
          percentage1rm: row.percentage_1rm == null ? null : num(row.percentage_1rm),
          setType: (row.set_type as SetType) ?? "top",
          restSeconds: num(row.rest_seconds, 180),
        };
      })
      .sort((a, b) => a.orderIndex - b.orderIndex),
  };
}

export async function saveProgram(userId: string, program: TrainingProgram) {
  const supabase = createClient();
  const saved = await supabase.from("training_programs").upsert({
    id: program.id,
    user_id: userId,
    name: program.name.trim() || "Program",
    description: program.description,
    duration_weeks: program.durationWeeks,
    current_week: program.currentWeek,
    status: program.status,
    started_at: program.startedAt,
  });
  if (saved.error) throw saved.error;
  if (program.days.length === 0) return;
  const days = program.days.map((day) => ({
    id: day.id,
    program_id: program.id,
    week_number: day.weekNumber,
    day_number: day.dayNumber,
    name: day.name,
    scheduled_day: day.scheduledDay,
    order_index: day.orderIndex,
  }));
  const dayResult = await supabase.from("program_days").upsert(days);
  if (dayResult.error) throw dayResult.error;
  const exercises = program.days.flatMap((day) =>
    day.exercises.map((item) => ({
      id: item.id,
      program_day_id: day.id,
      exercise_id: item.exerciseId,
      order_index: item.orderIndex,
      sets: item.sets,
      min_reps: item.minReps,
      max_reps: Math.max(item.minReps, item.maxReps),
      target_weight: item.targetWeight,
      percentage_1rm: item.percentage1rm,
      set_type: item.setType,
      rest_seconds: item.restSeconds,
    })),
  );
  if (exercises.length === 0) return;
  const exerciseResult = await supabase.from("program_exercises").upsert(exercises);
  if (exerciseResult.error) throw exerciseResult.error;
}

export async function fetchExerciseNotes(): Promise<Array<{ exerciseId: string; body: string }>> {
  const { data, error } = await createClient().from("exercise_notes").select("exercise_id, body");
  if (error) throw error;
  return ((data ?? []) as Array<{ exercise_id: string; body: string }>).map((row) => ({ exerciseId: row.exercise_id, body: row.body }));
}

export async function saveExerciseNote(userId: string, exerciseId: string, body: string) {
  const { error } = await createClient().from("exercise_notes").upsert(
    { user_id: userId, exercise_id: exerciseId, body },
    { onConflict: "user_id,exercise_id" },
  );
  if (error) throw error;
}
