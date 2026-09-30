import type { BlockKind, TrainingGoalId } from "@/lib/programming/types";

export function blockForWeek(week: number, total: number, goal: TrainingGoalId): BlockKind {
  if (week === total) return "DELOAD";
  if (goal === "HYPERTROPHY" || goal === "GENERAL") {
    return week <= Math.ceil(total * 0.6) ? "BUILD" : "OVERLOAD";
  }
  if (total >= 8 && week === total - 1) return "PEAK";
  if (week <= Math.ceil(total / 2)) return "BUILD";
  return "OVERLOAD";
}

export function weekLoadFactor(block: BlockKind) {
  if (block === "DELOAD") return 0.9;
  if (block === "PEAK") return 1.025;
  if (block === "OVERLOAD") return 1.01;
  return 1;
}
