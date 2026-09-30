import { createClient } from "@/lib/supabase/client";
import type { TrainingProgram } from "@/lib/api/programs";
import type { EquipmentChoice, ExperienceLevel, ScheduleMode, TrainingGoalId, TrainingMaxSource } from "@/lib/programming/types";

export interface StoredTrainingProfile {
  goal: TrainingGoalId;
  experience: ExperienceLevel;
  daysPerWeek: number;
  sessionMinutes: number;
  scheduleMode: ScheduleMode;
  effortScale: "rpe" | "rir";
}

export interface StoredTrainingMax {
  exerciseId: string;
  value: number;
  source: TrainingMaxSource;
}

export interface ProgramVersion {
  id: string;
  programId: string;
  versionNumber: number;
  changeType: string;
  changeSummary: string;
  snapshot: TrainingProgram;
}

const EMPTY_PROFILE = null;

export async function fetchCoachingBundle() {
  const supabase = createClient();
  const [profileResult, equipmentResult, preferenceResult, maxResult] = await Promise.all([
    supabase.from("training_profiles").select("primary_goal, experience_level, training_days_per_week, session_duration_minutes, schedule_mode, effort_scale").maybeSingle(),
    supabase.from("user_equipment").select("equipment_type"),
    supabase.from("exercise_preferences").select("exercise_id, preference_type"),
    supabase.from("exercise_training_max").select("exercise_id, value, source"),
  ]);
  if (profileResult.error) throw profileResult.error;
  const row = profileResult.data;
  const profile: StoredTrainingProfile | null = row
    ? {
        goal: row.primary_goal as TrainingGoalId,
        experience: row.experience_level as ExperienceLevel,
        daysPerWeek: row.training_days_per_week,
        sessionMinutes: row.session_duration_minutes,
        scheduleMode: row.schedule_mode as ScheduleMode,
        effortScale: row.effort_scale === "rir" ? "rir" : "rpe",
      }
    : EMPTY_PROFILE;
  return {
    profile,
    equipment: ((equipmentResult.data ?? []) as Array<{ equipment_type: EquipmentChoice }>).map((item) => item.equipment_type),
    preferences: ((preferenceResult.data ?? []) as Array<{ exercise_id: string; preference_type: "PREFERRED" | "AVOID" }>).map((item) => ({
      exerciseId: item.exercise_id,
      preferenceType: item.preference_type,
    })),
    trainingMaxes: ((maxResult.data ?? []) as Array<{ exercise_id: string; value: number; source: TrainingMaxSource }>).map((item) => ({
      exerciseId: item.exercise_id,
      value: Number(item.value),
      source: item.source,
    })),
  };
}

export async function saveCoachingSetup(
  userId: string,
  profile: StoredTrainingProfile,
  equipment: EquipmentChoice[],
  preferences: Array<{ exerciseId: string; preferenceType: "PREFERRED" | "AVOID" }>,
  trainingMaxes: StoredTrainingMax[],
) {
  const supabase = createClient();
  const saved = await supabase.from("training_profiles").upsert({
    user_id: userId,
    primary_goal: profile.goal,
    experience_level: profile.experience,
    training_days_per_week: profile.daysPerWeek,
    session_duration_minutes: profile.sessionMinutes,
    schedule_mode: profile.scheduleMode,
    effort_scale: profile.effortScale,
  }, { onConflict: "user_id" });
  if (saved.error) throw saved.error;
  await supabase.from("user_equipment").delete().eq("user_id", userId);
  if (equipment.length > 0) {
    const inserted = await supabase.from("user_equipment").insert(equipment.map((equipmentType) => ({ user_id: userId, equipment_type: equipmentType })));
    if (inserted.error) throw inserted.error;
  }
  await supabase.from("exercise_preferences").delete().eq("user_id", userId);
  if (preferences.length > 0) {
    const inserted = await supabase.from("exercise_preferences").insert(preferences.map((item) => ({
      user_id: userId,
      exercise_id: item.exerciseId,
      preference_type: item.preferenceType,
    })));
    if (inserted.error) throw inserted.error;
  }
  for (const item of trainingMaxes) {
    const upserted = await supabase.from("exercise_training_max").upsert({
      user_id: userId,
      exercise_id: item.exerciseId,
      value: item.value,
      source: item.source,
    }, { onConflict: "user_id,exercise_id" });
    if (upserted.error) throw upserted.error;
  }
}

export async function insertProgramVersion(program: TrainingProgram, changeType: string, summary: string) {
  const supabase = createClient();
  const existing = await supabase.from("program_versions").select("version_number").eq("program_id", program.id).order("version_number", { ascending: false }).limit(1);
  if (existing.error) throw existing.error;
  const versionNumber = ((existing.data?.[0] as { version_number?: number } | undefined)?.version_number ?? 0) + 1;
  const inserted = await supabase.from("program_versions").insert({
    program_id: program.id,
    version_number: versionNumber,
    change_type: changeType,
    change_summary: summary,
    snapshot_json: program,
  });
  if (inserted.error) throw inserted.error;
}

export async function fetchProgramVersions(programId: string): Promise<ProgramVersion[]> {
  const { data, error } = await createClient()
    .from("program_versions")
    .select("id, program_id, version_number, change_type, change_summary, snapshot_json")
    .eq("program_id", programId)
    .order("version_number", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    programId: String(row.program_id),
    versionNumber: Number(row.version_number),
    changeType: String(row.change_type),
    changeSummary: String(row.change_summary ?? ""),
    snapshot: row.snapshot_json as TrainingProgram,
  }));
}

export async function recordScheduleAction(userId: string, programDayId: string, action: "DO_TODAY" | "MOVE_TOMORROW" | "SKIP" | "RESCHEDULE", targetDate: string | null) {
  const { error } = await createClient().from("program_schedule_actions").insert({
    user_id: userId,
    program_day_id: programDayId,
    action,
    target_date: targetDate,
  });
  if (error) throw error;
}

export async function recordSubstitution(userId: string, fromExerciseId: string, toExerciseId: string) {
  const { error } = await createClient().from("substitution_history").insert({
    user_id: userId,
    from_exercise_id: fromExerciseId,
    to_exercise_id: toExerciseId,
  });
  if (error) throw error;
}
