import { describe, expect, it } from "vitest";
import { decideAdaptation, resolveLoggedWeight } from "@/lib/programming/adaptiveProgramming";
import { equipmentAllows } from "@/lib/programming/catalog";
import { clampProgression } from "@/lib/programming/intensityCalculator";
import { generateProgram } from "@/lib/programming/programGenerator";
import { previewWeeklyAdjustment } from "@/lib/programming/weeklyAdjustment";
import { warmupSets } from "@/lib/programming/warmupCalculator";
import { suggestRecoveryWeek } from "@/lib/programming/deloadPlanner";
import type { Exercise } from "@/lib/types";
import type { GeneratorInput, TrainingProfileInput } from "@/lib/programming/types";

function exercise(id: string, name: string, category: Exercise["category"], equipment: Exercise["equipment"]): Exercise {
  return { id, name, category, equipment, kind: equipment === "machine" || name.includes("Curl") || name.includes("Raise") || name.includes("Fly") ? "accessory" : "compound", isCustom: false };
}

const catalog: Exercise[] = [
  exercise("squat", "Squat", "leg", "barbell"),
  exercise("bench", "Bench Press", "chest", "barbell"),
  exercise("dead", "Deadlift", "back", "barbell"),
  exercise("ohp", "Overhead Press", "shoulder", "barbell"),
  exercise("row", "Barbell Row", "back", "barbell"),
  exercise("pull", "Weighted Pull Up", "back", "bodyweight"),
  exercise("dbbench", "Dumbbell Bench Press", "chest", "dumbbell"),
  exercise("press", "Chest Press", "chest", "machine"),
  exercise("lat", "Lat Pulldown", "back", "cable"),
  exercise("cable", "Seated Cable Row", "back", "cable"),
  exercise("legpress", "Leg Press", "leg", "machine"),
  exercise("curl", "Leg Curl", "leg", "machine"),
  exercise("ext", "Leg Extension", "leg", "machine"),
  exercise("dbpress", "Dumbbell Shoulder Press", "shoulder", "dumbbell"),
  exercise("raise", "Lateral Raise", "shoulder", "dumbbell"),
  exercise("fly", "Cable Fly", "chest", "cable"),
  exercise("tricep", "Triceps Extension", "arms", "cable"),
];

function profile(patch: Partial<TrainingProfileInput>): TrainingProfileInput {
  return {
    goal: "STRENGTH",
    experience: "INTERMEDIATE",
    daysPerWeek: 3,
    sessionMinutes: 60,
    equipment: ["BARBELL", "POWER_RACK", "BENCH"],
    preferredExerciseIds: [],
    avoidExerciseIds: [],
    scheduleMode: "FLEXIBLE",
    ...patch,
  };
}

function input(patch: Partial<TrainingProfileInput>, extra?: Partial<GeneratorInput>): GeneratorInput {
  return { profile: profile(patch), exercises: catalog, baselines: [], history: [], ...extra };
}

describe("phase 5 programming", () => {
  it("increases after a successful appropriate session", () => {
    const result = decideAdaptation({
      sessions: [{ weight: 100, reps: 5, rpe: 8, hitTarget: true }],
      minReps: 4,
      maxReps: 6,
      increment: 2.5,
      priority: "PRIMARY",
    });
    expect(result.action).toBe("INCREASE");
    expect(result.nextWeight).toBe(102.5);
  });

  it("keeps the load after one miss", () => {
    const result = decideAdaptation({
      sessions: [{ weight: 100, reps: 3, rpe: 9, hitTarget: false }],
      minReps: 5,
      maxReps: 5,
      increment: 2.5,
      priority: "PRIMARY",
    });
    expect(["KEEP", "REPEAT"]).toContain(result.action);
  });

  it("reduces after several missed sessions", () => {
    const result = decideAdaptation({
      sessions: [
        { weight: 100, reps: 2, rpe: 9.5, hitTarget: false },
        { weight: 100, reps: 2, rpe: 9.5, hitTarget: false },
        { weight: 100, reps: 3, rpe: 9, hitTarget: false },
      ],
      minReps: 5,
      maxReps: 5,
      increment: 2.5,
      priority: "PRIMARY",
    });
    expect(["REDUCE", "DELOAD"]).toContain(result.action);
    expect(result.nextWeight).toBeLessThan(100);
  });

  it("does not deload after one high rpe", () => {
    const result = decideAdaptation({
      sessions: [{ weight: 100, reps: 5, rpe: 9.5, hitTarget: true }],
      minReps: 5,
      maxReps: 5,
      increment: 2.5,
      priority: "PRIMARY",
    });
    expect(result.action).not.toBe("DELOAD");
    expect(suggestRecoveryWeek({ recentRpe: [9.5], missRate: 0, readinessLow: false, volumeUp: false, trendDown: false, completionRate: 1 }, 1)).toBe(false);
  });

  it("asks for a baseline when history is empty", () => {
    const result = decideAdaptation({ sessions: [], minReps: 5, maxReps: 5, increment: 2.5, priority: "PRIMARY" });
    expect(result.action).toBe("NO_RECOMMENDATION");
  });

  it("leaves avoided exercises out", () => {
    const program = generateProgram(input({ avoidExerciseIds: ["squat"] }));
    expect(program).not.toBeNull();
    const ids = program!.weeks.flatMap((week) => week.days.flatMap((day) => day.exercises.map((exercise) => exercise.exerciseId)));
    expect(ids).not.toContain("squat");
  });

  it("skips barbell lifts without a barbell", () => {
    const program = generateProgram(input({
      goal: "HYPERTROPHY",
      daysPerWeek: 4,
      sessionMinutes: 75,
      equipment: ["DUMBBELLS", "CABLE", "MACHINES"],
    }));
    expect(program).not.toBeNull();
    const names = new Set(program!.weeks[0]?.days.flatMap((day) => day.exercises.map((exercise) => exercise.name)));
    for (const name of names) {
      const exercise = catalog.find((item) => item.name === name)!;
      expect(equipmentAllows(exercise, ["DUMBBELLS", "CABLE", "MACHINES"])).toBe(true);
    }
    expect(names.has("Bench Press")).toBe(false);
    expect(names.has("Squat")).toBe(false);
  });

  it("keeps a 60 minute plan short", () => {
    const program = generateProgram(input({}));
    expect(program).not.toBeNull();
    for (const day of program!.weeks[0]!.days) {
      expect(day.exercises.length).toBeLessThanOrEqual(6);
      expect(day.estimatedDuration).toBeLessThanOrEqual(72);
    }
  });

  it("previews a weekly adjustment without changing the current program", () => {
    const program = generateProgram(input({}));
    const before = structuredClone(program);
    const exerciseId = program!.weeks[1]!.days[0]!.exercises[0]!.exerciseId;
    const preview = previewWeeklyAdjustment(program!, [{
      exerciseId,
      input: { sessions: [{ weight: 100, reps: 5, rpe: 8, hitTarget: true }], minReps: 5, maxReps: 5, increment: 2.5, priority: "PRIMARY" },
    }], 2);
    expect(program).toEqual(before);
    expect(preview.lines.length).toBeGreaterThan(0);
    expect(preview.program).not.toBe(program);
  });

  it("keeps the lifter's weight when the suggestion is declined", () => {
    expect(resolveLoggedWeight(100, 102.5, false)).toBe(100);
    expect(resolveLoggedWeight(100, 102.5, true)).toBe(102.5);
  });

  it("builds a strength plan around compounds", () => {
    const program = generateProgram(input({}));
    expect(program?.goal).toBe("STRENGTH");
    expect(program?.daysPerWeek).toBe(3);
    const primary = program!.weeks[0]!.days.flatMap((day) => day.exercises).filter((exercise) => exercise.priority === "PRIMARY");
    expect(primary.length).toBeGreaterThan(0);
    expect(program?.weeks.some((week) => week.block === "PEAK")).toBe(true);
  });

  it("keeps preferred powerbuilding lifts", () => {
    const program = generateProgram(input({
      goal: "POWERBUILDING",
      equipment: ["BARBELL", "POWER_RACK", "BENCH", "PULLUP_BAR"],
      preferredExerciseIds: ["dead", "bench", "pull"],
    }));
    const names = program!.weeks[0]!.days.flatMap((day) => day.exercises.map((exercise) => exercise.name));
    expect(names).toEqual(expect.arrayContaining(["Deadlift", "Bench Press", "Weighted Pull Up"]));
  });

  it("caps a bad progression step", () => {
    expect(clampProgression(100, 120, "PRIMARY")).toBeLessThanOrEqual(110);
  });

  it("builds a short warmup under the working weight", () => {
    const sets = warmupSets(200, 2.5, true);
    expect(sets.length).toBeGreaterThan(0);
    expect(sets.every((set) => set.weight < 200)).toBe(true);
    expect(warmupSets(30, 2.5, true)).toHaveLength(1);
  });
});
