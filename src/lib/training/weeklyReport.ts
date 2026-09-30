import { workoutStats, workoutVolume } from "@/lib/calculations";
import type { CompletedWorkout, Exercise, ExerciseCategory, PersonalRecord } from "@/lib/types";
import { sessionE1rm } from "@/lib/training/plateauDetector";
import { coachSessions } from "@/lib/training/history";

export interface MuscleVolume {
  category: ExerciseCategory;
  sets: number;
}

export interface WeeklyReport {
  workouts: number;
  sets: number;
  volume: number;
  durationSec: number;
  prs: number;
  previousWorkouts: number;
  previousVolume: number;
  muscles: MuscleVolume[];
  strength: Array<{ exerciseId: string; name: string; changePercent: number | null }>;
}

function inRange(workout: CompletedWorkout, start: string, end: string) {
  return workout.date >= start && workout.date <= end;
}

function workingSetCount(workout: CompletedWorkout, exercises: Exercise[]) {
  const categories = new Map(exercises.map((exercise) => [exercise.id, exercise.category]));
  const totals = new Map<ExerciseCategory, number>();
  for (const session of workout.exercises) {
    const category = categories.get(session.exerciseId);
    if (!category) continue;
    const count = session.sets.filter((set) => set.completed && set.reps > 0 && set.setType !== "warmup").length;
    totals.set(category, (totals.get(category) ?? 0) + count);
  }
  return totals;
}

export function buildWeeklyReport(input: {
  history: CompletedWorkout[];
  exercises: Exercise[];
  records: PersonalRecord[];
  start: string;
  end: string;
  previousStart: string;
  previousEnd: string;
}): WeeklyReport {
  const current = input.history.filter((workout) => inRange(workout, input.start, input.end));
  const previous = input.history.filter((workout) => inRange(workout, input.previousStart, input.previousEnd));
  const muscles = new Map<ExerciseCategory, number>();
  for (const workout of current) {
    for (const [category, count] of workingSetCount(workout, input.exercises)) {
      muscles.set(category, (muscles.get(category) ?? 0) + count);
    }
  }
  const strength = input.exercises
    .filter((exercise) => exercise.kind === "compound")
    .map((exercise) => {
      const sessions = coachSessions(input.history, exercise.id);
      const recent = sessions.find((session) => session.date >= input.start && session.date <= input.end);
      const prior = sessions.find((session) => session.date >= input.previousStart && session.date <= input.previousEnd);
      const now = recent ? sessionE1rm(recent) : 0;
      const then = prior ? sessionE1rm(prior) : 0;
      const changePercent = now > 0 && then > 0 ? ((now - then) / then) * 100 : null;
      return { exerciseId: exercise.id, name: exercise.name, changePercent };
    })
    .filter((item) => item.changePercent !== null)
    .slice(0, 4);

  return {
    workouts: current.length,
    sets: current.reduce((sum, workout) => sum + workout.exercises.reduce((inner, session) => inner + session.sets.filter((set) => set.completed && set.setType !== "warmup").length, 0), 0),
    volume: current.reduce((sum, workout) => sum + workoutVolume(workout), 0),
    durationSec: current.reduce((sum, workout) => sum + workoutStats(workout).durationSec, 0),
    prs: input.records.filter((record) => record.date >= input.start && record.date <= input.end).length,
    previousWorkouts: previous.length,
    previousVolume: previous.reduce((sum, workout) => sum + workoutVolume(workout), 0),
    muscles: [...muscles.entries()].map(([category, sets]) => ({ category, sets })).sort((a, b) => b.sets - a.sets),
    strength,
  };
}
