"use client";

import dynamic from "next/dynamic";
import { GoalsPanel, ReportPanel, StrengthPanel, VolumePanel } from "@/components/training/CoachPanels";
import { useEffect, useMemo, useState } from "react";
import { useAppState } from "@/components/providers/AppStateProvider";
import { useI18n } from "@/components/providers/LocaleProvider";
import { bestEstimated1RM, recordValue, workingSets } from "@/lib/calculations";
import {
  cx,
  formatRoundedWeight,
  formatVolume,
  formatWeight,
  kgToDisplay,
  toDateKey,
} from "@/lib/format";
import type { MessageKey } from "@/lib/i18n/messages";
import type { CompletedWorkout, RecordType } from "@/lib/types";

const ProgressChart = dynamic(() => import("@/components/progress/ProgressChart").then((mod) => mod.ProgressChart), {
  ssr: false,
});

const FEATURED = ["Bench Press", "Squat", "Deadlift", "Overhead Press", "Weighted Pull Up", "Weighted Dip"];
const PERIODS = ["1M", "3M", "6M", "1Y", "ALL"] as const;
const METRICS = [
  { id: "e1rm", label: "metric1rm" },
  { id: "max", label: "metricWeight" },
  { id: "volume", label: "metricVolume" },
  { id: "reps", label: "metricReps" },
] as const satisfies ReadonlyArray<{ id: string; label: MessageKey }>;

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
  const { t, exerciseName, recordLabel } = useI18n();
  const [tab, setTab] = useState<"overview" | "strength" | "volume" | "report" | "goals">("overview");
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
      <div className="grid grid-cols-5 rounded-2xl bg-[var(--bg-muted)] p-1 text-[10px] font-black">
        {(["overview", "strength", "volume", "report", "goals"] as const).map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={cx("h-9 rounded-xl", tab === item ? "bg-[var(--bg-elevated)]" : "text-[var(--muted)]")}>
            {t(item === "overview" ? "progressOverview" : item === "strength" ? "progressStrength" : item === "volume" ? "progressVolume" : item === "report" ? "progressReport" : "progressGoals")}
          </button>
        ))}
      </div>
      {tab === "strength" ? <StrengthPanel /> : null}
      {tab === "volume" ? <VolumePanel /> : null}
      {tab === "report" ? <ReportPanel /> : null}
      {tab === "goals" ? <GoalsPanel /> : null}
      {tab === "overview" ? (
        <>
        <header>
        <p className="text-[11px] font-black tracking-[0.16em] text-[var(--faint)]">{t("navProgress")}</p>
        <h1 className="text-3xl font-black tracking-tight">{exercise ? exerciseName(exercise.name) : t("progressFallback")}</h1>
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
            {exerciseName(item.name)}
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
            {t(item.label)}
          </button>
        ))}
      </div>

      <section className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] px-2 py-3">
        {series === null ? (
          <div className="h-56 animate-pulse rounded-2xl bg-[var(--bg-muted)]" />
        ) : (
          <ProgressChart points={points} suffix={metric === "reps" ? t("chartReps") : profile.unit} />
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
            {item === "ALL" ? t("periodAll") : item}
          </button>
        ))}
      </div>

      <section className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
        <h2 className="text-sm font-black tracking-wide">{(exercise ? exerciseName(exercise.name) : t("progressFallback")).toUpperCase()}</h2>
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
                <dt className="text-sm text-[var(--muted)]">{recordLabel(type)}</dt>
                <dd className="font-black tabular-nums">{value}</dd>
              </div>
            );
          })}
        </dl>
      </section>
        </>
      ) : null}
    </div>
  );
}
