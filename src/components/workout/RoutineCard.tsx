"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useI18n } from "@/components/providers/LocaleProvider";
import type { Exercise, Routine } from "@/lib/types";

interface RoutineCardProps {
  routine: Routine;
  exercises: Exercise[];
  onStart: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export function RoutineCard({ routine, exercises, onStart, onEdit, onDelete, onDuplicate }: RoutineCardProps) {
  const { t, exerciseName } = useI18n();
  const names = [...routine.exercises]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((item) => {
      const name = exercises.find((exercise) => exercise.id === item.exerciseId)?.name;
      return name ? exerciseName(name) : undefined;
    })
    .filter((name): name is string => Boolean(name));

  return (
    <article className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
      <button type="button" onClick={onStart} className="w-full text-left">
        <h2 className="text-lg font-black tracking-wide">{routine.name}</h2>
        <ul className="mt-3 space-y-1">
          {names.map((name, index) => (
            <li key={`${name}-${index}`} className="text-sm text-[var(--muted)]">
              {name}
            </li>
          ))}
        </ul>
      </button>
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={onStart} className="h-11 flex-1 rounded-2xl bg-[var(--accent)] text-sm font-black text-[var(--accent-ink)]">
          {t("workoutStart")}
        </button>
        <button type="button" onClick={onDuplicate} className="h-11 rounded-2xl bg-[var(--bg-muted)] px-3 text-xs font-black">
          {t("duplicateRoutine")}
        </button>
        <button type="button" onClick={onEdit} aria-label={t("builderEditAria", { name: routine.name })} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--bg-muted)]">
          <Pencil size={16} />
        </button>
        <button type="button" onClick={onDelete} aria-label={t("builderDeleteAria", { name: routine.name })} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--bg-muted)] text-[var(--danger)]">
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  );
}
