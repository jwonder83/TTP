"use client";

import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronUp, Trash2 } from "lucide-react";
import { AddExerciseSheet } from "@/components/workout/AddExerciseSheet";
import { useAppState } from "@/components/providers/AppStateProvider";
import { uuid } from "@/lib/format";
import type { Routine, RoutineExercise } from "@/lib/types";

interface RoutineBuilderProps {
  initial: Routine | null;
  onClose: () => void;
}

export function RoutineBuilder({ initial, onClose }: RoutineBuilderProps) {
  const { exercises, profile, saveRoutine } = useAppState();
  const [name, setName] = useState(initial?.name ?? "");
  const [items, setItems] = useState<RoutineExercise[]>(
    initial ? [...initial.exercises].sort((a, b) => a.orderIndex - b.orderIndex) : [],
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setItems(next.map((entry, orderIndex) => ({ ...entry, orderIndex })));
  };

  const updateItem = (id: string, patch: Partial<RoutineExercise>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  return (
    <div className="space-y-4">
      <button type="button" onClick={onClose} className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--muted)]">
        <ChevronLeft size={18} />
        Routines
      </button>
      <h1 className="text-2xl font-black">{initial ? "Edit routine" : "Create routine"}</h1>
      <label className="block text-sm font-semibold">
        Routine name
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="PUSH DAY"
          className="mt-1 h-12 w-full rounded-2xl bg-[var(--bg-elevated)] px-3 font-bold tracking-wide outline-none ring-1 ring-[var(--line)] focus:ring-[var(--accent)]"
        />
      </label>

      <div className="space-y-3">
        {items.map((item, index) => {
          const exercise = exercises.find((entry) => entry.id === item.exerciseId);
          return (
            <article key={item.id} className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-black">{exercise?.name ?? "Exercise"}</h2>
                <div className="flex items-center gap-1">
                  <IconButton label="Move up" onClick={() => move(index, -1)} disabled={index === 0}>
                    <ChevronUp size={16} />
                  </IconButton>
                  <IconButton label="Move down" onClick={() => move(index, 1)} disabled={index === items.length - 1}>
                    <ChevronDown size={16} />
                  </IconButton>
                  <IconButton
                    label="Remove exercise"
                    onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id).map((entry, orderIndex) => ({ ...entry, orderIndex })))}
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <NumberField label="Sets" value={item.defaultSets} min={1} max={10} onChange={(value) => updateItem(item.id, { defaultSets: value })} />
                <NumberField label="Reps" value={item.defaultReps} min={1} max={30} onChange={(value) => updateItem(item.id, { defaultReps: value })} />
                <NumberField label="Rest" value={item.restSeconds} min={15} max={600} step={15} onChange={(value) => updateItem(item.id, { restSeconds: value })} />
              </div>
            </article>
          );
        })}
      </div>

      <button type="button" onClick={() => setPickerOpen(true)} className="h-12 w-full rounded-2xl border border-dashed border-[var(--line-strong)] font-bold">
        Add exercise
      </button>
      <button
        type="button"
        disabled={!name.trim() || items.length === 0 || saving}
        onClick={async () => {
          if (saving) return;
          setSaving(true);
          setError(null);
          try {
            await saveRoutine({
              id: initial?.id ?? uuid(),
              name: name.trim().toUpperCase(),
              exercises: items.map((item, orderIndex) => ({ ...item, orderIndex })),
            });
            onClose();
          } catch {
            setError("Could not save this routine.");
            setSaving(false);
          }
        }}
        className="h-14 w-full rounded-2xl bg-[var(--accent)] font-black text-[var(--accent-ink)] disabled:opacity-40"
      >
        {saving ? "Saving..." : "Save routine"}
      </button>
      {error ? <p className="text-center text-sm font-semibold text-[var(--danger)]">{error}</p> : null}

      <AddExerciseSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        excludeIds={items.map((item) => item.exerciseId)}
        onPick={(exerciseId, kind) => {
          const exercise = exercises.find((entry) => entry.id === exerciseId);
          const compound = (kind ?? exercise?.kind) === "compound";
          setItems((current) => [
            ...current,
            {
              id: uuid(),
              exerciseId,
              orderIndex: current.length,
              defaultSets: compound ? 5 : 3,
              defaultReps: compound ? 5 : 10,
              restSeconds: compound ? profile.compoundRestSec : profile.accessoryRestSec,
            },
          ]);
        }}
      />
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--bg-muted)] disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="text-[11px] font-bold tracking-wide text-[var(--faint)]">
      {label.toUpperCase()}
      <input
        inputMode="numeric"
        value={value}
        onChange={(event) => {
          const parsed = Number.parseInt(event.target.value, 10);
          if (!Number.isFinite(parsed)) return;
          onChange(Math.min(max, Math.max(min, parsed)));
        }}
        onBlur={(event) => {
          const parsed = Number.parseInt(event.target.value, 10);
          onChange(Math.min(max, Math.max(min, Number.isFinite(parsed) ? parsed : min)));
        }}
        className="mt-1 h-11 w-full rounded-xl bg-[var(--bg)] text-center text-base font-bold text-[var(--text)] outline-none"
        step={step}
      />
    </label>
  );
}
