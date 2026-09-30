import { describe, expect, it } from "vitest";
import { calculateBackoffWeight } from "@/lib/training/backoffCalculator";
import { decideProgression } from "@/lib/training/progressiveOverload";
import { recommendExercise } from "@/lib/training/recommendationEngine";
import { roundToIncrement } from "@/lib/training/rounding";
import type { LoggedSession, TrainingConfig } from "@/lib/training/types";

function config(patch: Partial<TrainingConfig> = {}): TrainingConfig {
  return {
    exerciseId: "bench",
    progressionType: "LINEAR",
    minReps: 5,
    maxReps: 5,
    weightIncrement: 2.5,
    targetRpe: 8,
    topSetEnabled: false,
    backoffEnabled: false,
    backoffPercentage: 90,
    backoffSets: 2,
    backoffMinReps: 6,
    backoffMaxReps: 8,
    deloadPercentage: 10,
    pendingDeload: false,
    ...patch,
  };
}

function session(weight: number, reps: number, setType: LoggedSession["sets"][number]["setType"] = "top"): LoggedSession {
  return {
    date: "2026-09-01",
    sets: [{ setType, weight, reps, completed: true, rpe: 8 }],
  };
}

describe("training coach", () => {
  it("raises a successful linear set by the increment", () => {
    const decision = decideProgression(session(100, 5), config(), 0);
    expect(decision?.type).toBe("INCREASE");
    expect(decision?.weight).toBe(102.5);
  });

  it("keeps the load when the target reps are missed", () => {
    const decision = decideProgression(session(100, 4), config(), 0);
    expect(decision?.type).toBe("KEEP");
    expect(decision?.weight).toBe(100);
  });

  it("raises double progression only after every work set hits the top", () => {
    const logged: LoggedSession = {
      date: "2026-09-01",
      sets: [
        { setType: "normal", weight: 100, reps: 8, completed: true },
        { setType: "normal", weight: 100, reps: 8, completed: true },
        { setType: "normal", weight: 100, reps: 8, completed: true },
      ],
    };
    const decision = decideProgression(logged, config({ progressionType: "DOUBLE_PROGRESSION", minReps: 6, maxReps: 8 }), 0);
    expect(decision?.weight).toBe(102.5);
  });

  it("rounds a 90 percent back-off to the plate increment", () => {
    const weight = calculateBackoffWeight(112.5, 90, 2.5);
    expect([100, 102.5]).toContain(weight);
    expect(roundToIncrement(101.25, 2.5)).toBe(weight);
  });

  it("suggests a deload after repeated misses", () => {
    const misses = [session(100, 4), session(100, 4), session(100, 4)];
    const recommendation = recommendExercise({ config: config(), sessionsNewestFirst: misses });
    expect(["DELOAD", "DECREASE"]).toContain(recommendation.recommendationType);
    expect(recommendation.recommendedWeight).toBeLessThan(100);
  });

  it("does not invent a load without history", () => {
    const recommendation = recommendExercise({ config: config(), sessionsNewestFirst: [] });
    expect(recommendation.recommendationType).toBe("MANUAL");
    expect(recommendation.confidence).toBe("LOW");
    expect(recommendation.recommendedWeight).toBeNull();
  });
});
