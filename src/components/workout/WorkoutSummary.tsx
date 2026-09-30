"use client";

import { PRBadge } from "@/components/ui/PRBadge";
import { useI18n } from "@/components/providers/LocaleProvider";
import { formatDurationMinutes, formatRoundedWeight, formatVolume, formatWeight } from "@/lib/format";
import { coachSessions, resolveConfig } from "@/lib/training/history";
import { analyzePerformance } from "@/lib/training/performanceAnalyzer";
import { sessionE1rm } from "@/lib/training/plateauDetector";
import { recommendExercise } from "@/lib/training/recommendationEngine";
import type { Exercise, FinishResult, Unit } from "@/lib/types";
import type { TrainingConfig } from "@/lib/training/types";
import type { CompletedWorkout } from "@/lib/types";

interface WorkoutSummaryProps {
  result: FinishResult;
  exercises: Exercise[];
  unit: Unit;
  history: CompletedWorkout[];
  trainingConfigs: TrainingConfig[];
  recovery: boolean;
  onDone: () => void;
  onSaveTemplate: () => void;
}

export function WorkoutSummary({ result, exercises, unit, history, trainingConfigs, recovery, onDone, onSaveTemplate }: WorkoutSummaryProps) {
  const { locale, t, exerciseName, recordLabel } = useI18n();
  const nameOf = (id: string) => {
    const name = exercises.find((exercise) => exercise.id === id)?.name;
    return name ? exerciseName(name) : t("exerciseFallback");
  };
  const heroes = result.prs.filter((hit) => hit.recordType === "e1rm");
  const extras = result.prs.filter((hit) => hit.recordType !== "e1rm" && hit.recordType !== "volume");

  return (
    <div className="space-y-4">
      <header>
        <p className="text-[11px] font-black tracking-[0.18em] text-[var(--accent-text)]">{t("summaryComplete")}</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">{result.workout.routineName}</h1>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <Stat label={t("summaryDuration")} value={formatDurationMinutes(result.stats.durationSec, locale)} />
        <Stat label={t("summaryExercises")} value={String(result.stats.exerciseCount)} />
        <Stat label={t("summarySets")} value={String(result.stats.totalSets)} />
        <Stat label={t("summaryVolume")} value={`${formatVolume(result.stats.volume, unit)} ${unit}`} />
      </section>

      {heroes.length > 0 ? (
        <section className="space-y-3">
          {heroes.map((hit) => (
            <article key={`${hit.exerciseId}-${hit.recordType}`} className="rounded-3xl bg-[var(--accent)] p-4 text-[var(--accent-ink)]">
              <PRBadge />
              <h2 className="mt-3 text-2xl font-black">{nameOf(hit.exerciseId)}</h2>
              <p className="mt-1 text-lg font-bold tabular-nums">
                {hit.weight !== null && hit.reps !== null ? `${formatWeight(hit.weight, unit)} × ${hit.reps}` : recordLabel(hit.recordType)}
              </p>
              <p className="mt-2 text-sm font-semibold">{t("summaryE1rm", { value: formatRoundedWeight(hit.value, unit), unit })}</p>
            </article>
          ))}
        </section>
      ) : null}

      {extras.length > 0 ? (
        <section className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
          <h2 className="text-sm font-black tracking-wide">{t("summaryOther")}</h2>
          <ul className="mt-3 space-y-2">
            {extras.map((hit) => (
              <li key={`${hit.exerciseId}-${hit.recordType}`} className="flex items-center justify-between text-sm">
                <span>
                  {nameOf(hit.exerciseId)} · {recordLabel(hit.recordType)}
                </span>
                <span className="font-bold tabular-nums">
                  {hit.recordType === "volume" ? formatVolume(hit.value, unit) : formatWeight(hit.value, unit)} {unit}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <PerformanceBlock result={result} exercises={exercises} unit={unit} history={history} trainingConfigs={trainingConfigs} recovery={recovery} />

      <button type="button" onClick={onSaveTemplate} className="h-12 w-full rounded-2xl bg-[var(--bg-elevated)] font-black">{t("saveTemplate")}</button>
      <button type="button" onClick={onDone} className="h-14 w-full rounded-2xl bg-[var(--text)] text-base font-black text-[var(--bg)]">
        {t("summaryDone")}
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
      <p className="text-[11px] font-bold tracking-wide text-[var(--faint)]">{label}</p>
      <p className="mt-2 text-2xl font-black tabular-nums">{value}</p>
    </div>
  );
}

function PerformanceBlock({
  result,
  exercises,
  unit,
  history,
  trainingConfigs,
  recovery,
}: {
  result: FinishResult;
  exercises: Exercise[];
  unit: Unit;
  history: CompletedWorkout[];
  trainingConfigs: TrainingConfig[];
  recovery: boolean;
}) {
  const { t, exerciseName } = useI18n();
  const rows = result.workout.exercises.map((session) => {
    const exercise = exercises.find((item) => item.id === session.exerciseId);
    if (!exercise) return null;
    const config = resolveConfig(trainingConfigs, exercise, 5);
    const status = analyzePerformance(session.sets, config, recovery);
    const judged = session.sets.filter((set) => set.completed && set.setType !== "warmup");
    const hits = judged.filter((set) => set.reps >= config.minReps).length;
    const prior = coachSessions(history.filter((workout) => workout.id !== result.workout.id), exercise.id)[0];
    const now = sessionE1rm({ date: result.workout.date, sets: session.sets });
    const before = prior ? sessionE1rm(prior) : 0;
    const next = recommendExercise({
      config,
      sessionsNewestFirst: coachSessions([result.workout, ...history.filter((workout) => workout.id !== result.workout.id)], exercise.id),
    });
    return { exercise, status, hits, judged: judged.length, now, before, next };
  }).filter((row) => row !== null);
  const hitTotal = rows.reduce((sum, row) => sum + row.hits, 0);
  const judgedTotal = rows.reduce((sum, row) => sum + row.judged, 0);
  if (rows.length === 0) return null;
  return (
    <section className="space-y-3 rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
      <h2 className="text-sm font-black tracking-wide">{t("summaryPerformance")}</h2>
      <p className="text-sm font-bold">{t("summaryTargets")} {hitTotal} / {judgedTotal}</p>
      {rows.map((row) => (
        <div key={row.exercise.id} className="border-t border-[var(--line)] pt-3">
          <p className="font-black">{exerciseName(row.exercise.name)}</p>
          <p className="text-sm text-[var(--muted)]">{t(row.status === "EXCELLENT" ? "perfExcellent" : row.status === "SUCCESS" ? "perfSuccess" : row.status === "PARTIAL" ? "perfPartial" : row.status === "RECOVERY" ? "perfRecovery" : "perfFailed")}</p>
          {row.before > 0 && row.now > 0 ? (
            <p className="text-sm tabular-nums">{t("summaryStrength")} {Math.round(row.before)} → {Math.round(row.now)} {unit}</p>
          ) : null}
          {row.next.recommendedWeight != null ? (
            <p className="text-sm">{t("coachNext")} {formatWeight(row.next.recommendedWeight, unit)} × {row.next.recommendedReps}</p>
          ) : null}
        </div>
      ))}
    </section>
  );
}
