import { describe, expect, it } from "vitest";
import { toCsv, rowsFromHistory, backupDocument } from "@/lib/export/build";
import { markRetry, queueId, remainingSeconds, upsertQueue, type QueueItem } from "@/lib/offline/model";
import { exerciseAlternatives } from "@/lib/program/alternatives";
import { sessionFromProgramExercise } from "@/lib/program/buildWorkout";
import { weightFromPercentage } from "@/lib/program/percent";
import type { Exercise } from "@/lib/types";

function item(type: QueueItem["type"], entityId: string): QueueItem {
  return { id: queueId(type, entityId), type, entityId, payload: { n: 1 }, createdAt: "2026-09-30T00:00:00.000Z", retryCount: 0, status: "pending" };
}

describe("phase 4", () => {
  it("keeps one pending change per entity", () => {
    const first = upsertQueue([], item("SET_UPSERT", "set-1"));
    const second = upsertQueue(first, { ...item("SET_UPSERT", "set-1"), payload: { n: 2 } });
    expect(second).toHaveLength(1);
    expect(second[0]?.payload).toEqual({ n: 2 });
  });

  it("stops retrying after the limit", () => {
    const failed = markRetry({ ...item("WORKOUT_FINISH", "w"), retryCount: 8 });
    expect(failed).toBeNull();
  });

  it("measures rest from an end timestamp", () => {
    expect(remainingSeconds(10_000, 4_100)).toBe(6);
    expect(remainingSeconds(10_000, 12_000)).toBe(0);
  });

  it("rounds a percentage of an estimated 1RM to the plate", () => {
    expect(weightFromPercentage(170, 75, 2.5)).toBe(127.5);
  });

  it("uses the program reps and the recommended or percentage weight", () => {
    const exercise: Exercise = { id: "squat", name: "Squat", category: "leg", equipment: "barbell", kind: "compound", isCustom: false };
    const session = sessionFromProgramExercise(
      {
        id: "plan-1",
        exerciseId: "squat",
        orderIndex: 0,
        sets: 4,
        minReps: 5,
        maxReps: 5,
        targetWeight: null,
        percentage1rm: 75,
        setType: "top",
        restSeconds: 180,
      },
      exercise,
      [],
      [],
    );
    expect(session.sets.filter((set) => set.setType !== "warmup").length).toBeGreaterThan(0);
    expect(session.sets.find((set) => set.setType === "top")?.reps).toBe(5);
  });

  it("suggests same-category replacements", () => {
    const bench: Exercise = { id: "1", name: "Bench Press", category: "chest", equipment: "barbell", kind: "compound", isCustom: false };
    const dumbbell: Exercise = { id: "2", name: "Dumbbell Bench Press", category: "chest", equipment: "dumbbell", kind: "compound", isCustom: false };
    const squat: Exercise = { id: "3", name: "Squat", category: "leg", equipment: "barbell", kind: "compound", isCustom: false };
    expect(exerciseAlternatives(bench, [bench, dumbbell, squat]).map((item) => item.id)).toEqual(["2"]);
  });

  it("exports completed sets as csv and a versioned backup", () => {
    const csv = toCsv(rowsFromHistory([{
      date: "2026-09-30",
      routineName: "Pull",
      exercises: [{ exerciseId: "dl", sets: [{ setNumber: 1, setType: "top", weight: 200, reps: 3, completed: true, rpe: 8 }] }],
    }], [{ id: "dl", name: "Deadlift", category: "back", equipment: "barbell", kind: "compound", isCustom: false }]));
    expect(csv).toContain("Deadlift");
    expect(csv).toContain("200");
    const backup = backupDocument({ workouts: [], bodyWeights: [], records: [], routines: [], programs: [] });
    expect(backup.schemaVersion).toBe(4);
    expect(backup.appVersion).toBe("0.4.0");
  });
});
