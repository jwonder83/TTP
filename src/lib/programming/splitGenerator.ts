import type { MovementPattern, TrainingGoalId } from "@/lib/programming/types";

export interface SplitSlot {
  pattern: MovementPattern;
  rank: "PRIMARY" | "SECONDARY" | "ACCESSORY" | "ISOLATION";
  minMinutes: number;
}

export interface SplitTemplate {
  id: string;
  days: Array<{ name: string; focus: string; slots: SplitSlot[] }>;
}

function slot(pattern: MovementPattern, rank: SplitSlot["rank"], minMinutes: number): SplitSlot {
  return { pattern, rank, minMinutes };
}

const FULL: SplitTemplate = {
  id: "FULL_BODY",
  days: [
    { name: "FULL BODY A", focus: "SQUAT / PUSH", slots: [slot("SQUAT", "PRIMARY", 30), slot("HORIZONTAL_PUSH", "SECONDARY", 30), slot("HORIZONTAL_PULL", "ACCESSORY", 45), slot("ISOLATION", "ISOLATION", 75)] },
    { name: "FULL BODY B", focus: "HINGE / PUSH", slots: [slot("HINGE", "PRIMARY", 30), slot("VERTICAL_PUSH", "SECONDARY", 30), slot("VERTICAL_PULL", "ACCESSORY", 45), slot("ISOLATION", "ISOLATION", 75)] },
    { name: "FULL BODY C", focus: "SQUAT / PULL", slots: [slot("HORIZONTAL_PUSH", "PRIMARY", 30), slot("SQUAT", "SECONDARY", 45), slot("VERTICAL_PULL", "ACCESSORY", 45), slot("HINGE", "ACCESSORY", 60)] },
  ],
};

const PPL: SplitTemplate = {
  id: "PUSH_PULL_LEGS",
  days: [
    { name: "PUSH", focus: "PRESS", slots: [slot("HORIZONTAL_PUSH", "PRIMARY", 30), slot("VERTICAL_PUSH", "SECONDARY", 30), slot("ISOLATION", "ISOLATION", 60)] },
    { name: "PULL", focus: "PULL", slots: [slot("HINGE", "PRIMARY", 30), slot("HORIZONTAL_PULL", "SECONDARY", 30), slot("VERTICAL_PULL", "ACCESSORY", 45)] },
    { name: "LEGS", focus: "SQUAT", slots: [slot("SQUAT", "PRIMARY", 30), slot("HINGE", "SECONDARY", 45), slot("ISOLATION", "ISOLATION", 60)] },
  ],
};

const POWER: SplitTemplate = {
  id: "POWERBUILDING",
  days: [
    { name: "DAY 1", focus: "SQUAT", slots: [slot("SQUAT", "PRIMARY", 30), slot("HORIZONTAL_PUSH", "SECONDARY", 30), slot("HORIZONTAL_PULL", "ACCESSORY", 45), slot("ISOLATION", "ISOLATION", 75)] },
    { name: "DAY 2", focus: "HINGE", slots: [slot("HINGE", "PRIMARY", 30), slot("VERTICAL_PUSH", "SECONDARY", 30), slot("VERTICAL_PULL", "ACCESSORY", 45), slot("ISOLATION", "ISOLATION", 75)] },
    { name: "DAY 3", focus: "PRESS", slots: [slot("HORIZONTAL_PUSH", "PRIMARY", 30), slot("SQUAT", "SECONDARY", 45), slot("VERTICAL_PULL", "ACCESSORY", 60), slot("ISOLATION", "ISOLATION", 75)] },
  ],
};

const UPPER_LOWER: SplitTemplate = {
  id: "UPPER_LOWER",
  days: [
    { name: "UPPER A", focus: "PUSH", slots: [slot("HORIZONTAL_PUSH", "PRIMARY", 30), slot("HORIZONTAL_PULL", "SECONDARY", 30), slot("VERTICAL_PUSH", "ACCESSORY", 45), slot("ISOLATION", "ISOLATION", 60)] },
    { name: "LOWER A", focus: "SQUAT", slots: [slot("SQUAT", "PRIMARY", 30), slot("HINGE", "SECONDARY", 30), slot("ISOLATION", "ISOLATION", 60)] },
    { name: "UPPER B", focus: "PULL", slots: [slot("VERTICAL_PULL", "PRIMARY", 30), slot("VERTICAL_PUSH", "SECONDARY", 30), slot("HORIZONTAL_PUSH", "ACCESSORY", 45), slot("ISOLATION", "ISOLATION", 75)] },
    { name: "LOWER B", focus: "HINGE", slots: [slot("HINGE", "PRIMARY", 30), slot("SQUAT", "SECONDARY", 45), slot("ISOLATION", "ISOLATION", 60)] },
  ],
};

const FIVE: SplitTemplate = {
  id: "UPPER_LOWER_PPL",
  days: [
    ...UPPER_LOWER.days.slice(0, 2),
    ...PPL.days,
  ],
};

const SIX: SplitTemplate = {
  id: "PPL_TWICE",
  days: [
    ...PPL.days.map((day) => ({ ...day, name: `${day.name} A` })),
    ...PPL.days.map((day) => ({ ...day, name: `${day.name} B` })),
  ],
};

function optionsFor(goal: TrainingGoalId, days: number): SplitTemplate[] {
  if (days <= 2) return [FULL];
  if (days === 3) {
    if (goal === "POWERBUILDING") return [POWER, PPL, FULL];
    if (goal === "HYPERTROPHY") return [PPL, FULL, POWER];
    if (goal === "GENERAL") return [FULL, PPL];
    return [POWER, FULL, PPL];
  }
  if (days === 4) return [UPPER_LOWER, { ...POWER, id: "POWER_4", days: [...POWER.days, FULL.days[2]!] }];
  if (days === 5) return [FIVE];
  return [SIX];
}

export function chooseSplit(goal: TrainingGoalId, days: number, variation = 0) {
  const options = optionsFor(goal, days);
  const picked = options[Math.abs(variation) % options.length] ?? FULL;
  return { ...picked, days: picked.days.slice(0, days) };
}
