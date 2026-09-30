import { catalogMeta } from "@/lib/programming/catalog";
import { durationWeeksFor, maxExercisesFor, prescription, restFor, SESSION_OVERSHOOT_MINUTES } from "@/lib/programming/config";
import { selectForSlot } from "@/lib/programming/exerciseSelector";
import { weightFromBaseline } from "@/lib/programming/intensityCalculator";
import { explainProgram } from "@/lib/programming/programExplanation";
import { blockForWeek, weekLoadFactor } from "@/lib/programming/progressionPlanner";
import { chooseSplit } from "@/lib/programming/splitGenerator";
import { PROGRAM_ENGINE_VERSION, type GeneratedDay, type GeneratedExercise, type GeneratedProgram, type GeneratorInput } from "@/lib/programming/types";
import { roundToIncrement } from "@/lib/training/rounding";

function estimateMinutes(exercises: GeneratedExercise[]) {
  const warmup = exercises.some((exercise) => exercise.priority === "PRIMARY") ? 8 : 4;
  const body = exercises.reduce((sum, exercise) => sum + exercise.sets * (exercise.restSeconds / 60 + 0.6) + 1.5, 0);
  return Math.round(warmup + body);
}

function baselineMap(input: GeneratorInput) {
  const map = new Map<string, number>();
  for (const baseline of input.baselines) {
    if (baseline.value > 0) map.set(baseline.exerciseId, baseline.value);
  }
  for (const point of input.history) {
    if (map.has(point.exerciseId) || point.weight <= 0 || point.reps <= 0 || point.reps > 10) continue;
    const estimated = point.reps === 1 ? point.weight : point.weight * (1 + point.reps / 30);
    const current = map.get(point.exerciseId) ?? 0;
    if (estimated > current) map.set(point.exerciseId, estimated);
  }
  return map;
}

export function generateProgram(input: GeneratorInput): GeneratedProgram | null {
  const { profile } = input;
  const variation = profile.variation ?? 0;
  const split = chooseSplit(profile.goal, profile.daysPerWeek, variation);
  const weeks = durationWeeksFor(profile.experience, profile.durationWeeks);
  const bases = baselineMap(input);
  const week1: GeneratedDay[] = split.days.map((day, dayIndex) => {
    const used = new Set<string>();
    const exercises: GeneratedExercise[] = [];
    const slots = day.slots.filter((item) => item.minMinutes <= profile.sessionMinutes);
    for (const [slotIndex, item] of slots.entries()) {
      const exercise = selectForSlot(item, input.exercises, profile.equipment, profile.preferredExerciseIds, profile.avoidExerciseIds, used, input.history, variation + slotIndex);
      if (!exercise) continue;
      const meta = catalogMeta(exercise);
      const plan = prescription(profile.goal, item.rank);
      const percentage = plan.percentage;
      const weight = weightFromBaseline(bases.get(exercise.id) ?? null, percentage, meta.priority === "PRIMARY" ? 2.5 : 2);
      exercises.push({
        exerciseId: exercise.id,
        name: exercise.name,
        sets: plan.sets,
        minReps: plan.minReps,
        maxReps: plan.maxReps,
        setType: plan.setType,
        targetRpe: plan.targetRpe,
        percentage1rm: weight == null ? null : percentage,
        targetWeight: weight,
        restSeconds: restFor(item.rank, profile.goal),
        progressionType: plan.progressionType,
        priority: item.rank,
        pattern: meta.pattern,
        muscle: meta.muscle,
        startingNote: weight == null ? "Choose a weight around RPE 7-8." : null,
      });
      used.add(exercise.id);
    }
    const limit = maxExercisesFor(profile.sessionMinutes);
    while (exercises.length > 1 && (exercises.length > limit || estimateMinutes(exercises) > profile.sessionMinutes + SESSION_OVERSHOOT_MINUTES)) {
      const optional = exercises.findIndex((exercise) => exercise.priority === "ISOLATION" || exercise.priority === "ACCESSORY");
      exercises.splice(optional >= 0 ? optional : exercises.length - 1, 1);
    }
    return {
      name: day.name,
      focus: day.focus,
      scheduledDay: profile.scheduleMode === "FIXED" ? (dayIndex * Math.max(1, Math.floor(7 / profile.daysPerWeek))) % 7 : null,
      exercises,
      estimatedDuration: estimateMinutes(exercises),
    };
  });
  if (week1.every((day) => day.exercises.length === 0)) return null;
  const programWeeks = Array.from({ length: weeks }, (_, index) => {
    const weekNumber = index + 1;
    const block = blockForWeek(weekNumber, weeks, profile.goal);
    const factor = weekLoadFactor(block);
    return {
      weekNumber,
      block,
      days: week1.map((day) => ({
        ...day,
        exercises: day.exercises.map((exercise) => ({
          ...exercise,
          sets: block === "DELOAD" ? Math.max(1, exercise.sets - 1) : exercise.sets,
          targetWeight: exercise.targetWeight == null ? null : roundToIncrement(exercise.targetWeight * factor, 2.5),
        })),
      })),
    };
  });
  const draft: GeneratedProgram = {
    name: `${profile.goal === "POWERBUILDING" ? "Powerbuilding" : profile.goal === "HYPERTROPHY" ? "Hypertrophy" : profile.goal === "STRENGTH" ? "Strength" : "General Fitness"} ${weeks} Week`,
    goal: profile.goal,
    durationWeeks: weeks,
    daysPerWeek: profile.daysPerWeek,
    split: split.id,
    weeks: programWeeks,
    explanation: [],
    algorithmVersion: PROGRAM_ENGINE_VERSION,
    plannedDays: profile.daysPerWeek,
  };
  draft.explanation = explainProgram(profile, draft);
  return draft;
}
