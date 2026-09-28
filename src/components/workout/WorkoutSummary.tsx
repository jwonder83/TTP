"use client";

import { PRBadge } from "@/components/ui/PRBadge";
import { RECORD_LABEL, formatDurationMinutes, formatRoundedWeight, formatVolume, formatWeight } from "@/lib/format";
import type { Exercise, FinishResult, Unit } from "@/lib/types";

interface WorkoutSummaryProps {
  result: FinishResult;
  exercises: Exercise[];
  unit: Unit;
  onDone: () => void;
}

export function WorkoutSummary({ result, exercises, unit, onDone }: WorkoutSummaryProps) {
  const nameOf = (id: string) => exercises.find((exercise) => exercise.id === id)?.name ?? "Exercise";
  const heroes = result.prs.filter((hit) => hit.recordType === "e1rm");
  const extras = result.prs.filter((hit) => hit.recordType !== "e1rm" && hit.recordType !== "volume");

  return (
    <div className="space-y-4">
      <header>
        <p className="text-[11px] font-black tracking-[0.18em] text-[var(--accent-text)]">WORKOUT COMPLETE</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">{result.workout.routineName}</h1>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <Stat label="Duration" value={formatDurationMinutes(result.stats.durationSec)} />
        <Stat label="Exercises" value={String(result.stats.exerciseCount)} />
        <Stat label="Total Sets" value={String(result.stats.totalSets)} />
        <Stat label="Total Volume" value={`${formatVolume(result.stats.volume, unit)} ${unit}`} />
      </section>

      {heroes.length > 0 ? (
        <section className="space-y-3">
          {heroes.map((hit) => (
            <article key={`${hit.exerciseId}-${hit.recordType}`} className="rounded-3xl bg-[var(--accent)] p-4 text-[var(--accent-ink)]">
              <PRBadge />
              <h2 className="mt-3 text-2xl font-black">{nameOf(hit.exerciseId)}</h2>
              <p className="mt-1 text-lg font-bold tabular-nums">
                {hit.weight !== null && hit.reps !== null ? `${formatWeight(hit.weight, unit)} × ${hit.reps}` : RECORD_LABEL[hit.recordType]}
              </p>
              <p className="mt-2 text-sm font-semibold">Estimated 1RM {formatRoundedWeight(hit.value, unit)} {unit}</p>
            </article>
          ))}
        </section>
      ) : null}

      {extras.length > 0 ? (
        <section className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
          <h2 className="text-sm font-black tracking-wide">OTHER RECORDS</h2>
          <ul className="mt-3 space-y-2">
            {extras.map((hit) => (
              <li key={`${hit.exerciseId}-${hit.recordType}`} className="flex items-center justify-between text-sm">
                <span>
                  {nameOf(hit.exerciseId)} · {RECORD_LABEL[hit.recordType]}
                </span>
                <span className="font-bold tabular-nums">
                  {hit.recordType === "volume" ? formatVolume(hit.value, unit) : formatWeight(hit.value, unit)} {unit}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <button type="button" onClick={onDone} className="h-14 w-full rounded-2xl bg-[var(--text)] text-base font-black text-[var(--bg)]">
        DONE
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
      <p className="text-[11px] font-bold tracking-wide text-[var(--faint)]">{label.toUpperCase()}</p>
      <p className="mt-2 text-2xl font-black tabular-nums">{value}</p>
    </div>
  );
}
