"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { SET_TYPE_META, cx, displayToKg, formatEditValue, kgToDisplay } from "@/lib/format";
import type { SetType, Unit, WorkoutSet } from "@/lib/types";

interface SetRowProps {
  set: WorkoutSet;
  unit: Unit;
  onChange: (patch: Partial<WorkoutSet>) => void;
  onToggleComplete: () => void;
  onPickType: () => void;
}

export function SetRow({ set, unit, onChange, onToggleComplete, onPickType }: SetRowProps) {
  const weightFocused = useRef(false);
  const repsFocused = useRef(false);
  const [weightText, setWeightText] = useState(() => formatEditValue(kgToDisplay(set.weight, unit)));
  const [repsText, setRepsText] = useState(() => String(set.reps));

  useEffect(() => {
    if (weightFocused.current) return;
    setWeightText(formatEditValue(kgToDisplay(set.weight, unit)));
  }, [set.weight, unit]);

  useEffect(() => {
    if (repsFocused.current) return;
    setRepsText(String(set.reps));
  }, [set.reps]);

  const commitWeight = (raw: string) => {
    const parsed = Number.parseFloat(raw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setWeightText(formatEditValue(kgToDisplay(set.weight, unit)));
      return;
    }
    onChange({ weight: displayToKg(parsed, unit) });
  };

  const commitReps = (raw: string) => {
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setRepsText(String(set.reps));
      return;
    }
    onChange({ reps: parsed });
  };

  return (
    <div
      data-set-row
      className={cx(
        "grid grid-cols-[22px_minmax(68px,1fr)_68px_52px_44px] items-center gap-1 rounded-2xl px-1 py-1",
        set.completed && "bg-[var(--accent-soft)]",
      )}
    >
      <span className="text-center text-sm font-bold tabular-nums text-[var(--muted)]">{set.setNumber}</span>
      <button type="button" onClick={onPickType} className={`badge badge-${set.setType}`} aria-label="Change set type">
        {SET_TYPE_META[set.setType as SetType].short}
      </button>
      <input
        data-field="weight"
        inputMode="decimal"
        enterKeyHint="next"
        aria-label={`Set ${set.setNumber} weight`}
        value={weightText}
        onFocus={(event) => {
          weightFocused.current = true;
          event.currentTarget.select();
        }}
        onChange={(event) => {
          const next = event.target.value;
          setWeightText(next);
          const parsed = Number.parseFloat(next);
          if (Number.isFinite(parsed) && parsed >= 0) onChange({ weight: displayToKg(parsed, unit) });
        }}
        onBlur={() => {
          weightFocused.current = false;
          commitWeight(weightText);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          commitWeight(weightText);
          const reps = event.currentTarget.closest("[data-set-row]")?.querySelector<HTMLInputElement>("[data-field=reps]");
          reps?.focus();
        }}
        className="h-11 rounded-xl bg-[var(--bg)] text-center text-base font-bold tabular-nums outline-none ring-1 ring-transparent focus:ring-[var(--accent)]"
      />
      <input
        data-field="reps"
        inputMode="numeric"
        enterKeyHint="next"
        aria-label={`Set ${set.setNumber} reps`}
        value={repsText}
        onFocus={(event) => {
          repsFocused.current = true;
          event.currentTarget.select();
        }}
        onChange={(event) => {
          const next = event.target.value.replace(/[^\d]/g, "");
          setRepsText(next);
          if (next === "") return;
          onChange({ reps: Number.parseInt(next, 10) });
        }}
        onBlur={() => {
          repsFocused.current = false;
          commitReps(repsText);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          commitReps(repsText);
          const row = event.currentTarget.closest("[data-set-row]");
          const nextWeight = row?.nextElementSibling?.querySelector<HTMLInputElement>("[data-field=weight]");
          nextWeight?.focus();
        }}
        className="h-11 rounded-xl bg-[var(--bg)] text-center text-base font-bold tabular-nums outline-none ring-1 ring-transparent focus:ring-[var(--accent)]"
      />
      <button
        type="button"
        aria-label={set.completed ? "Mark set incomplete" : "Complete set"}
        onClick={onToggleComplete}
        className={cx(
          "flex h-11 w-11 items-center justify-center rounded-full border transition active:scale-95",
          set.completed
            ? "border-transparent bg-[var(--accent)] text-[var(--accent-ink)]"
            : "border-[var(--line-strong)] text-[var(--faint)]",
        )}
      >
        {set.completed ? <Check size={20} strokeWidth={3} /> : null}
      </button>
    </div>
  );
}
