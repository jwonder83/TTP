import type { Equipment, Exercise } from "@/lib/types";
import type { EquipmentChoice, ExercisePriority, MovementPattern, MuscleGroup } from "@/lib/programming/types";

export interface CatalogMeta {
  pattern: MovementPattern;
  priority: ExercisePriority;
  muscle: MuscleGroup;
  requires: EquipmentChoice[];
}

const BY_NAME: Record<string, CatalogMeta> = {
  "Bench Press": { pattern: "HORIZONTAL_PUSH", priority: "PRIMARY", muscle: "CHEST", requires: ["BARBELL", "BENCH"] },
  "Incline Bench Press": { pattern: "HORIZONTAL_PUSH", priority: "SECONDARY", muscle: "CHEST", requires: ["BARBELL", "BENCH"] },
  "Dumbbell Bench Press": { pattern: "HORIZONTAL_PUSH", priority: "SECONDARY", muscle: "CHEST", requires: ["DUMBBELLS", "BENCH"] },
  "Weighted Dip": { pattern: "HORIZONTAL_PUSH", priority: "SECONDARY", muscle: "CHEST", requires: ["DIP_STATION"] },
  "Chest Press": { pattern: "HORIZONTAL_PUSH", priority: "SECONDARY", muscle: "CHEST", requires: ["MACHINES"] },
  "Cable Fly": { pattern: "ISOLATION", priority: "ISOLATION", muscle: "CHEST", requires: ["CABLE"] },
  Deadlift: { pattern: "HINGE", priority: "PRIMARY", muscle: "HAMSTRINGS", requires: ["BARBELL"] },
  "Pull Up": { pattern: "VERTICAL_PULL", priority: "SECONDARY", muscle: "BACK", requires: ["PULLUP_BAR"] },
  "Weighted Pull Up": { pattern: "VERTICAL_PULL", priority: "PRIMARY", muscle: "BACK", requires: ["PULLUP_BAR"] },
  "Barbell Row": { pattern: "HORIZONTAL_PULL", priority: "SECONDARY", muscle: "BACK", requires: ["BARBELL"] },
  "Lat Pulldown": { pattern: "VERTICAL_PULL", priority: "SECONDARY", muscle: "BACK", requires: ["CABLE"] },
  "Seated Cable Row": { pattern: "HORIZONTAL_PULL", priority: "SECONDARY", muscle: "BACK", requires: ["CABLE"] },
  Squat: { pattern: "SQUAT", priority: "PRIMARY", muscle: "QUADS", requires: ["BARBELL", "POWER_RACK"] },
  "Front Squat": { pattern: "SQUAT", priority: "SECONDARY", muscle: "QUADS", requires: ["BARBELL", "POWER_RACK"] },
  "Romanian Deadlift": { pattern: "HINGE", priority: "SECONDARY", muscle: "HAMSTRINGS", requires: ["BARBELL"] },
  "Leg Press": { pattern: "SQUAT", priority: "SECONDARY", muscle: "QUADS", requires: ["LEG_PRESS"] },
  "Leg Extension": { pattern: "ISOLATION", priority: "ISOLATION", muscle: "QUADS", requires: ["MACHINES"] },
  "Leg Curl": { pattern: "ISOLATION", priority: "ISOLATION", muscle: "HAMSTRINGS", requires: ["MACHINES"] },
  "Overhead Press": { pattern: "VERTICAL_PUSH", priority: "PRIMARY", muscle: "SHOULDERS", requires: ["BARBELL"] },
  "Dumbbell Shoulder Press": { pattern: "VERTICAL_PUSH", priority: "SECONDARY", muscle: "SHOULDERS", requires: ["DUMBBELLS"] },
  "Lateral Raise": { pattern: "ISOLATION", priority: "ISOLATION", muscle: "SHOULDERS", requires: ["DUMBBELLS"] },
  "Rear Delt Fly": { pattern: "ISOLATION", priority: "ISOLATION", muscle: "SHOULDERS", requires: ["DUMBBELLS"] },
  "Barbell Curl": { pattern: "ISOLATION", priority: "ISOLATION", muscle: "BICEPS", requires: ["BARBELL"] },
  "Dumbbell Curl": { pattern: "ISOLATION", priority: "ISOLATION", muscle: "BICEPS", requires: ["DUMBBELLS"] },
  "Hammer Curl": { pattern: "ISOLATION", priority: "ISOLATION", muscle: "BICEPS", requires: ["DUMBBELLS"] },
  "Triceps Extension": { pattern: "ISOLATION", priority: "ISOLATION", muscle: "TRICEPS", requires: ["CABLE"] },
  "Skull Crusher": { pattern: "ISOLATION", priority: "ISOLATION", muscle: "TRICEPS", requires: ["BARBELL"] },
};

const EQUIPMENT_FALLBACK: Record<Equipment, EquipmentChoice[]> = {
  barbell: ["BARBELL"],
  dumbbell: ["DUMBBELLS"],
  cable: ["CABLE"],
  machine: ["MACHINES"],
  bodyweight: ["BODYWEIGHT"],
  other: ["BODYWEIGHT"],
};

export function catalogMeta(exercise: Exercise): CatalogMeta {
  return BY_NAME[exercise.name] ?? {
    pattern: "ISOLATION",
    priority: exercise.kind === "compound" ? "SECONDARY" : "ISOLATION",
    muscle: exercise.category === "chest" ? "CHEST" : exercise.category === "back" ? "BACK" : exercise.category === "leg" ? "QUADS" : exercise.category === "shoulder" ? "SHOULDERS" : "BICEPS",
    requires: EQUIPMENT_FALLBACK[exercise.equipment],
  };
}

export function equipmentAllows(exercise: Exercise, owned: EquipmentChoice[]) {
  const requires = catalogMeta(exercise).requires;
  return requires.every((item) => owned.includes(item));
}
