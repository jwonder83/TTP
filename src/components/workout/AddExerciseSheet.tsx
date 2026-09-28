"use client";

import { useMemo, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { useAppState } from "@/components/providers/AppStateProvider";
import { CATEGORY_LABEL, CATEGORY_ORDER, EQUIPMENT_LABEL } from "@/lib/format";
import type { Equipment, ExerciseCategory, ExerciseKind } from "@/lib/types";

interface AddExerciseSheetProps {
  open: boolean;
  onClose: () => void;
  onPick: (exerciseId: string, kind?: ExerciseKind) => void;
  excludeIds?: string[];
}

const EQUIPMENT: Equipment[] = ["barbell", "dumbbell", "cable", "machine", "bodyweight", "other"];

export function AddExerciseSheet({ open, onClose, onPick, excludeIds = [] }: AddExerciseSheetProps) {
  const { exercises, addCustomExercise } = useAppState();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ExerciseCategory>("chest");
  const [equipment, setEquipment] = useState<Equipment>("barbell");
  const [kind, setKind] = useState<ExerciseKind>("accessory");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return exercises.filter((exercise) => {
      if (excludeIds.includes(exercise.id)) return false;
      if (!needle) return true;
      return exercise.name.toLowerCase().includes(needle);
    });
  }, [exercises, excludeIds, query]);

  const close = () => {
    setCreating(false);
    setQuery("");
    setName("");
    onClose();
  };

  return (
    <Sheet open={open} title={creating ? "Custom exercise" : "Add exercise"} onClose={close}>
      {creating ? (
        <form
          className="space-y-3 pb-2"
          onSubmit={async (event) => {
            event.preventDefault();
            const trimmed = name.trim();
            if (!trimmed || saving) return;
            setSaving(true);
            setError(null);
            try {
              const id = await addCustomExercise({ name: trimmed, category, equipment, kind });
              onPick(id, kind);
              close();
            } catch {
              setError("Could not save this exercise.");
            } finally {
              setSaving(false);
            }
          }}
        >
          <label className="block text-sm font-semibold">
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 h-12 w-full rounded-2xl bg-[var(--bg-muted)] px-3 outline-none focus:ring-2 focus:ring-[var(--accent)]"
              placeholder="Pause Squat"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Select label="Category" value={category} onChange={(value) => setCategory(value as ExerciseCategory)}>
              {CATEGORY_ORDER.map((item) => (
                <option key={item} value={item}>
                  {CATEGORY_LABEL[item]}
                </option>
              ))}
            </Select>
            <Select label="Equipment" value={equipment} onChange={(value) => setEquipment(value as Equipment)}>
              {EQUIPMENT.map((item) => (
                <option key={item} value={item}>
                  {EQUIPMENT_LABEL[item]}
                </option>
              ))}
            </Select>
          </div>
          <Select label="Type" value={kind} onChange={(value) => setKind(value as ExerciseKind)}>
            <option value="compound">Compound · 180s rest</option>
            <option value="accessory">Accessory · 90s rest</option>
          </Select>
          {error ? <p className="text-sm font-semibold text-[var(--danger)]">{error}</p> : null}
          <button type="submit" disabled={saving} className="h-12 w-full rounded-2xl bg-[var(--accent)] font-black text-[var(--accent-ink)] disabled:opacity-40">
            {saving ? "Saving..." : "Save exercise"}
          </button>
        </form>
      ) : (
        <div className="pb-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            className="h-12 w-full rounded-2xl bg-[var(--bg-muted)] px-3 outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
          <div className="mt-3 space-y-4">
            {CATEGORY_ORDER.map((item) => {
              const group = filtered.filter((exercise) => exercise.category === item);
              if (group.length === 0) return null;
              return (
                <section key={item}>
                  <h3 className="text-[11px] font-black tracking-wide text-[var(--faint)]">{CATEGORY_LABEL[item].toUpperCase()}</h3>
                  <div className="mt-2 space-y-1">
                    {group.map((exercise) => (
                      <button
                        key={exercise.id}
                        type="button"
                        onClick={() => {
                          onPick(exercise.id);
                          close();
                        }}
                        className="flex h-12 w-full items-center justify-between rounded-2xl px-2 text-left font-semibold active:bg-[var(--bg-muted)]"
                      >
                        {exercise.name}
                        {exercise.isCustom ? <span className="text-[10px] text-[var(--faint)]">CUSTOM</span> : null}
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
          <button type="button" onClick={() => setCreating(true)} className="mt-4 h-12 w-full rounded-2xl bg-[var(--bg-muted)] font-bold">
            Create custom exercise
          </button>
        </div>
      )}
    </Sheet>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-12 w-full rounded-2xl bg-[var(--bg-muted)] px-3 outline-none"
      >
        {children}
      </select>
    </label>
  );
}
