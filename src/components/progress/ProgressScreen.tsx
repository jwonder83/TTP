"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useAppState } from "@/components/providers/AppStateProvider";
import { bestEstimated1RM, recordValue, workingSets } from "@/lib/calculations";
import {
  RECORD_LABEL,
  cx,
  formatRoundedWeight,
  formatVolume,
  formatWeight,
  kgToDisplay,
  toDateKey,
} from "@/lib/format";
import type { CompletedWorkout, RecordType } from "@/lib/types";

const ProgressChart = dynamic(() => import("@/components/progress/ProgressChart").then((mod) => mod.ProgressChart), {
  ssr: false,
});

const FEATURED = ["Bench Press", "Squat", "Deadlift", "Overhead Press", "Weighted Pull Up", "Weighted Dip"];
const PERIODS = ["1M", "3M", "6M", "1Y", "ALL"] as const;
const METRICS = [
  { id: "e1rm", label: "Estimated 1RM" },
  { id: "max", label: "Max Weight" },
  { id: "volume", label: "Volume" },
  { id: "reps", label: "Reps" },
] as const;

type Period = (typeof PERIODS)[number];
type Metric = (typeof METRICS)[number]["id"];

function periodStart(period: Period) {
  if (period === "ALL") return "1970-01-01";
  const date = new Date();
  if (period === "1M") date.setMonth(date.getMonth() - 1);
  if (period === "3M") date.setMonth(date.getMonth() - 3);
  if (period === "6M") date.setMonth(date.getMonth() - 6);
  if (period === "1Y") date.setFullYear(date.getFullYear() - 1);
  return toDateKey(date);
}

export function ProgressScreen() {
  const { exercises, records, profile, loadExerciseHistory } = useAppState();
  const [exerciseId, setExerciseId] = useState("");
  const [period, setPeriod] = useState<Period>("3M");
  const [metric, setMetric] = useState<Metric>("e1rm");
  const [series, setSeries] = useState<CompletedWorkout[] | null>(null);
  const exercise = exercises.find((item) => item.id === exerciseId);
  const chips = FEATURED.map((name) => exercises.find((item) => item.name === name)).filter((item) => item !== undefined);

  useEffect(() => {
    if (exerciseId && exercises.some((item) => item.id === exerciseId)) return;
    const bench = exercises.find((item) => item.name === "Bench Press") ?? exercises[0];
    if (bench) setExerciseId(bench.id);
  }, [exerciseId, exercises]);

  useEffect(() => {
    if (!exerciseId) return;
    let cancelled = false;
    setSeries(null);
    void loadExerciseHistory(exerciseId, periodStart(period))
      .then((workouts) => {
        if (!cancelled) setSeries(workouts);
      })
      .catch(() => {
        if (!cancelled) setSeries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [exerciseId, loadExerciseHistory, period]);

  const points = useMemo(() => {
    const source = series ?? [];
    return source
      .filter((workout) => workout.exercises.some((item) => item.exerciseId === exerciseId))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((workout) => {
        const session = workout.exercises.find((item) => item.exerciseId === exerciseId);
        const completed = session?.sets.filter((set) => set.completed) ?? [];
        const working = session ? workingSets(session.sets) : [];
        let raw = 0;
        if (metric === "e1rm") raw = session ? bestEstimated1RM(session.sets) : 0;
        if (metric === "max") raw = working.reduce((max, set) => Math.max(max, set.weight), 0);
        if (metric === "volume") raw = completed.reduce((sum, set) => sum + set.weight * set.reps, 0);
        if (metric === "reps") raw = completed.reduce((sum, set) => sum + set.reps, 0);
        const value = metric === "reps" ? raw : metric === "volume" ? Math.round(profile.unit === "lb" ? raw * 2.2046226218 : raw) : Math.round(kgToDisplay(raw, profile.unit) * 10) / 10;
        const date = new Date(`${workout.date}T00:00:00`);
        return { label: `${date.getMonth() + 1}/${date.getDate()}`, value };
      })
      .filter((point) => point.value > 0);
  }, [exerciseId, metric, profile.unit, series]);

  const recordTypes: RecordType[] = ["e1rm", "3rm", "5rm", "volume"];

  return (
    <div className="space-y-4">
      <header>
        <p className="text-[11px] font-black tracking-[0.16em] text-[var(--faint)]">PROGRESS</p>
        <h1 className="text-3xl font-black tracking-tight">{exercise?.name ?? "Exercise"}</h1>
      </header>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {chips.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setExerciseId(item.id)}
            className={cx(
              "h-10 shrink-0 rounded-full px-3 text-sm font-bold",
              item.id === exerciseId ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--bg-elevated)] text-[var(--muted)]",
            )}
          >
            {item.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 rounded-2xl bg-[var(--bg-elevated)] p-1">
        {METRICS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setMetric(item.id)}
            className={cx(
              "h-10 rounded-xl text-[11px] font-bold",
              metric === item.id ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "text-[var(--muted)]",
            )}
          >
            {item.label === "Estimated 1RM" ? "1RM" : item.label === "Max Weight" ? "Weight" : item.label}
          </button>
        ))}
      </div>

      <section className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] px-2 py-3">
        {series === null ? (
          <div className="h-56 animate-pulse rounded-2xl bg-[var(--bg-muted)]" />
        ) : (
          <ProgressChart points={points} suffix={metric === "reps" ? "reps" : profile.unit} />
        )}
      </section>

      <div className="grid grid-cols-5 rounded-2xl bg-[var(--bg-muted)] p-1">
        {PERIODS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setPeriod(item)}
            className={cx(
              "h-9 rounded-xl text-xs font-black",
              period === item ? "bg-[var(--bg-elevated)] text-[var(--text)]" : "text-[var(--muted)]",
            )}
          >
            {item}
          </button>
        ))}
      </div>

      <section className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
        <h2 className="text-sm font-black tracking-wide">{(exercise?.name ?? "EXERCISE").toUpperCase()}</h2>
        <dl className="mt-3 space-y-3">
          {recordTypes.map((type) => {
            const record = recordValue(records, exerciseId, type);
            const value = !record
              ? "—"
              : type === "volume"
                ? `${formatVolume(record.value, profile.unit)} ${profile.unit}`
                : type === "e1rm"
                  ? `${formatRoundedWeight(record.value, profile.unit)} ${profile.unit}`
                  : `${formatWeight(record.value, profile.unit)} ${profile.unit}`;
            return (
              <div key={type} className="flex items-center justify-between">
                <dt className="text-sm text-[var(--muted)]">{RECORD_LABEL[type]}</dt>
                <dd className="font-black tabular-nums">{value}</dd>
              </div>
            );
          })}
        </dl>
      </section>
    </div>
  );
}
