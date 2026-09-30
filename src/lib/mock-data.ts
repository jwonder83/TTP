import { addDays, roundTo, startOfDay, toDateKey } from "@/lib/format";
import type {
  BodyWeightEntry,
  CompletedWorkout,
  Exercise,
  ExerciseKind,
  PersistedState,
  Profile,
  Routine,
  RoutineExercise,
} from "@/lib/types";
import { buildPlannedSets } from "@/lib/workout-plan";

const PROFILE: Profile = {
  name: "Alex",
  heightCm: 178,
  unit: "kg",
  theme: "dark",
  compoundRestSec: 180,
  accessoryRestSec: 90,
  weeklyGoal: 4,
  effortScale: "rpe",
};

function exercise(
  id: string,
  name: string,
  category: Exercise["category"],
  equipment: Exercise["equipment"],
  kind: ExerciseKind,
): Exercise {
  return { id, name, category, equipment, kind, isCustom: false };
}

export const LIBRARY: Exercise[] = [
  exercise("ex-bench", "Bench Press", "chest", "barbell", "compound"),
  exercise("ex-incline-bench", "Incline Bench Press", "chest", "barbell", "compound"),
  exercise("ex-db-press", "Dumbbell Press", "chest", "dumbbell", "accessory"),
  exercise("ex-dip", "Weighted Dip", "chest", "bodyweight", "compound"),
  exercise("ex-fly", "Cable Fly", "chest", "cable", "accessory"),
  exercise("ex-deadlift", "Deadlift", "back", "barbell", "compound"),
  exercise("ex-pullup", "Pull Up", "back", "bodyweight", "compound"),
  exercise("ex-wpullup", "Weighted Pull Up", "back", "bodyweight", "compound"),
  exercise("ex-row", "Barbell Row", "back", "barbell", "compound"),
  exercise("ex-lat", "Lat Pulldown", "back", "cable", "accessory"),
  exercise("ex-cable-row", "Cable Row", "back", "cable", "accessory"),
  exercise("ex-squat", "Squat", "leg", "barbell", "compound"),
  exercise("ex-fsquat", "Front Squat", "leg", "barbell", "compound"),
  exercise("ex-rdl", "Romanian Deadlift", "leg", "barbell", "compound"),
  exercise("ex-legpress", "Leg Press", "leg", "machine", "compound"),
  exercise("ex-legcurl", "Leg Curl", "leg", "machine", "accessory"),
  exercise("ex-legext", "Leg Extension", "leg", "machine", "accessory"),
  exercise("ex-ohp", "Overhead Press", "shoulder", "barbell", "compound"),
  exercise("ex-db-shoulder", "Dumbbell Shoulder Press", "shoulder", "dumbbell", "accessory"),
  exercise("ex-lateral", "Lateral Raise", "shoulder", "dumbbell", "accessory"),
  exercise("ex-rear-delt", "Rear Delt Fly", "shoulder", "dumbbell", "accessory"),
  exercise("ex-bb-curl", "Barbell Curl", "arms", "barbell", "accessory"),
  exercise("ex-db-curl", "Dumbbell Curl", "arms", "dumbbell", "accessory"),
  exercise("ex-tri-ext", "Triceps Extension", "arms", "cable", "accessory"),
  exercise("ex-skull", "Skull Crusher", "arms", "barbell", "accessory"),
];

interface TemplateExercise {
  exerciseId: string;
  defaultSets: number;
  defaultReps: number;
  restSeconds: number;
  baseWeight: number;
  weeklyStep: number;
  capWeight: number;
  missLast?: number;
}

function routineExercise(template: TemplateExercise, index: number): RoutineExercise {
  return {
    id: `re-${template.exerciseId}`,
    exerciseId: template.exerciseId,
    orderIndex: index,
    defaultSets: template.defaultSets,
    defaultReps: template.defaultReps,
    restSeconds: template.restSeconds,
  };
}

const PUSH: TemplateExercise[] = [
  { exerciseId: "ex-bench", defaultSets: 5, defaultReps: 5, restSeconds: 180, baseWeight: 80, weeklyStep: 2.5, capWeight: 110 },
  { exerciseId: "ex-dip", defaultSets: 4, defaultReps: 6, restSeconds: 180, baseWeight: 20, weeklyStep: 1.25, capWeight: 40 },
  { exerciseId: "ex-db-press", defaultSets: 4, defaultReps: 8, restSeconds: 90, baseWeight: 26, weeklyStep: 1, capWeight: 36 },
  {
    exerciseId: "ex-tri-ext",
    defaultSets: 3,
    defaultReps: 10,
    restSeconds: 90,
    baseWeight: 20,
    weeklyStep: 1.25,
    capWeight: 30,
    missLast: 2,
  },
];

const PULL: TemplateExercise[] = [
  { exerciseId: "ex-deadlift", defaultSets: 5, defaultReps: 4, restSeconds: 180, baseWeight: 140, weeklyStep: 2.5, capWeight: 190 },
  { exerciseId: "ex-wpullup", defaultSets: 4, defaultReps: 6, restSeconds: 180, baseWeight: 15, weeklyStep: 1.25, capWeight: 40 },
  { exerciseId: "ex-row", defaultSets: 4, defaultReps: 8, restSeconds: 120, baseWeight: 70, weeklyStep: 2.5, capWeight: 100 },
  { exerciseId: "ex-lat", defaultSets: 3, defaultReps: 10, restSeconds: 90, baseWeight: 45, weeklyStep: 2.5, capWeight: 70 },
];

const LEG: TemplateExercise[] = [
  { exerciseId: "ex-squat", defaultSets: 5, defaultReps: 5, restSeconds: 180, baseWeight: 100, weeklyStep: 2.5, capWeight: 160 },
  { exerciseId: "ex-rdl", defaultSets: 4, defaultReps: 8, restSeconds: 120, baseWeight: 80, weeklyStep: 2.5, capWeight: 120 },
  { exerciseId: "ex-legpress", defaultSets: 4, defaultReps: 10, restSeconds: 120, baseWeight: 140, weeklyStep: 5, capWeight: 220 },
  { exerciseId: "ex-legcurl", defaultSets: 3, defaultReps: 12, restSeconds: 90, baseWeight: 35, weeklyStep: 2.5, capWeight: 55 },
];

function makeRoutine(id: string, name: string, templates: TemplateExercise[]): Routine {
  return {
    id,
    name,
    exercises: templates.map((template, index) => routineExercise(template, index)),
  };
}

export const ROUTINES: Routine[] = [
  makeRoutine("routine-push", "PUSH DAY", PUSH),
  makeRoutine("routine-pull", "PULL DAY", PULL),
  makeRoutine("routine-leg", "LEG DAY", LEG),
];

const TEMPLATE_BY_EXERCISE = new Map(
  [...PUSH, ...PULL, ...LEG].map((template) => [template.exerciseId, template]),
);

function historicalWeight(template: TemplateExercise, index: number, total: number) {
  if (template.exerciseId === "ex-deadlift") {
    if (index === total - 1) return 200;
    if (index === total - 2) return 190;
  }
  const growth = Math.max(0, Math.min(index, total - 2));
  return Math.min(template.capWeight, roundTo(template.baseWeight + growth * template.weeklyStep, template.weeklyStep));
}

function durationMinutes(routineId: string) {
  if (routineId === "routine-pull") return 62;
  if (routineId === "routine-leg") return 70;
  return 58;
}

function buildHistory(now: Date): CompletedWorkout[] {
  const today = startOfDay(now);
  const start = addDays(today, -18 * 7);
  const schedule: Array<{ day: number; routineId: string }> = [
    { day: 2, routineId: "routine-push" },
    { day: 4, routineId: "routine-pull" },
    { day: 6, routineId: "routine-leg" },
  ];
  const datesByRoutine = new Map<string, Date[]>();

  for (let cursor = new Date(start); cursor < today; cursor = addDays(cursor, 1)) {
    const match = schedule.find((item) => item.day === cursor.getDay());
    if (!match) continue;
    const list = datesByRoutine.get(match.routineId) ?? [];
    list.push(new Date(cursor));
    datesByRoutine.set(match.routineId, list);
  }

  const workouts: CompletedWorkout[] = [];
  const exerciseById = new Map(LIBRARY.map((item) => [item.id, item]));

  for (const routine of ROUTINES) {
    const dates = datesByRoutine.get(routine.id) ?? [];
    dates.forEach((date, index) => {
      const started = new Date(date);
      started.setHours(18, 5, 0, 0);
      const finished = new Date(started.getTime() + durationMinutes(routine.id) * 60 * 1000);
      workouts.push({
        id: `hist-${routine.id}-${toDateKey(date)}`,
        routineId: routine.id,
        routineName: routine.name,
        date: toDateKey(date),
        startedAt: started.toISOString(),
        finishedAt: finished.toISOString(),
        exercises: routine.exercises.map((routineExercise, orderIndex) => {
          const template = TEMPLATE_BY_EXERCISE.get(routineExercise.exerciseId);
          const exercise = exerciseById.get(routineExercise.exerciseId);
          const weight = template ? historicalWeight(template, index, dates.length) : 20;
          const missed =
            template?.missLast && index >= dates.length - template.missLast ? Math.max(1, routineExercise.defaultReps - 2) : undefined;
          return {
            id: `hx-${routine.id}-${routineExercise.exerciseId}-${index}`,
            exerciseId: routineExercise.exerciseId,
            orderIndex,
            restSeconds: routineExercise.restSeconds,
            sets: buildPlannedSets({
              targetWeight: weight,
              targetReps: routineExercise.defaultReps,
              setCount: routineExercise.defaultSets,
              equipment: exercise?.equipment ?? "barbell",
              completed: true,
              actualTopReps: missed,
            }),
          };
        }),
      });
    });
  }

  return workouts.sort((a, b) => a.date.localeCompare(b.date) || a.startedAt.localeCompare(b.startedAt));
}

function buildBodyWeights(now: Date): BodyWeightEntry[] {
  const today = startOfDay(now);
  return Array.from({ length: 17 }, (_, index) => {
    const weeksAgo = 16 - index;
    const weight = roundTo(86 - weeksAgo * 0.1, 0.1);
    return {
      id: `bw-${index}`,
      date: toDateKey(addDays(today, -7 * weeksAgo)),
      weight,
    };
  });
}

export function createSeedState(now = new Date()): PersistedState {
  return {
    profile: PROFILE,
    exercises: LIBRARY.map((item) => ({ ...item })),
    routines: ROUTINES.map((routine) => ({
      ...routine,
      exercises: routine.exercises.map((exercise) => ({ ...exercise })),
    })),
    history: buildHistory(now),
    activeWorkout: null,
    bodyWeights: buildBodyWeights(now),
  };
}

