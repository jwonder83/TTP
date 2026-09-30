"use client";

import { useMemo, useState } from "react";
import { useAppState } from "@/components/providers/AppStateProvider";
import { useI18n } from "@/components/providers/LocaleProvider";
import { addDaysKey, formatRoundedWeight, formatVolume, formatWeight, isAddedLoad, toDateKey, uuid } from "@/lib/format";
import { coachSessions, resolveConfig } from "@/lib/training/history";
import { buildExerciseInsights } from "@/lib/training/insightEngine";
import { detectPlateau } from "@/lib/training/plateauDetector";
import { detectDeload } from "@/lib/training/deloadDetector";
import { recommendExercise } from "@/lib/training/recommendationEngine";
import { strengthTrend } from "@/lib/training/strengthTrend";
import { buildWeeklyReport } from "@/lib/training/weeklyReport";
import { defaultTrainingConfig, type TrainingConfig, type TrainingGoal } from "@/lib/training/types";

export function StrengthPanel() {
  const { exercises, history, records, trainingConfigs, profile, saveTrainingConfig } = useAppState();
  const { t, exerciseName } = useI18n();
  const [exerciseId, setExerciseId] = useState(exercises.find((item) => item.kind === "compound")?.id ?? exercises[0]?.id ?? "");
  const exercise = exercises.find((item) => item.id === exerciseId);
  if (!exercise) return <Empty />;
  const sessions = coachSessions(history, exercise.id);
  const trend = strengthTrend(sessions);
  const config = resolveConfig(trainingConfigs, exercise, exercise.kind === "compound" ? 5 : 8);
  const recommendation = recommendExercise({ config, sessionsNewestFirst: sessions });
  const plateau = detectPlateau(sessions);
  const deload = detectDeload(sessions, config);
  const current = sessions[0] ? bestFrom(sessions[0].sets) : 0;
  const record = records.find((item) => item.exerciseId === exercise.id && item.recordType === "e1rm");
  const plus = isAddedLoad(exercise.equipment);

  return (
    <div className="space-y-4">
      <select value={exerciseId} onChange={(event) => setExerciseId(event.target.value)} className="h-12 w-full rounded-2xl bg-[var(--bg-elevated)] px-3 font-bold">
        {exercises.map((item) => (
          <option key={item.id} value={item.id}>
            {exerciseName(item.name)}
          </option>
        ))}
      </select>
      {sessions.length < 2 ? <Empty /> : null}
      <section className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
        <p className="text-[11px] font-bold tracking-wide text-[var(--faint)]">{t("coachE1rm")}</p>
        <p className="mt-1 text-3xl font-black tabular-nums">{current > 0 ? `${formatRoundedWeight(current, profile.unit)} ${profile.unit}` : "—"}</p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {t("coachActualPr")} {record ? `${formatRoundedWeight(record.value, profile.unit)} ${profile.unit}` : "—"}
        </p>
        {trend ? (
          <p className="mt-2 text-sm font-black">
            {trend.direction === "TRENDING_UP" ? "↑" : trend.direction === "TRENDING_DOWN" ? "↓" : "·"} {trend.changePercent.toFixed(1)}% · {t(trend.direction === "TRENDING_UP" ? "trendUp" : trend.direction === "TRENDING_DOWN" ? "trendDown" : "trendStable")}
          </p>
        ) : null}
        {trend ? <p className="mt-2 text-sm tabular-nums text-[var(--muted)]">{trend.series.map((value) => Math.round(value)).join(" · ")}</p> : null}
      </section>
      <section className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
        <p className="text-[11px] font-bold tracking-wide text-[var(--faint)]">{t("coachNext")}</p>
        <p className="mt-1 text-xl font-black tabular-nums">
          {recommendation.recommendedWeight != null
            ? `${formatWeight(recommendation.recommendedWeight, profile.unit, { prefixPlus: plus })} × ${recommendation.recommendedReps}`
            : t("reasonNoHistory")}
        </p>
      </section>
      {plateau.detected ? (
        <section className="rounded-3xl border border-[var(--line)] p-4">
          <p className="font-black">{t("plateauTitle")}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">{t("plateauBody")}</p>
          <p className="mt-2 text-sm">{t("plateauActions")}</p>
        </section>
      ) : null}
      {deload.suggested ? (
        <section className="rounded-3xl border border-[var(--line)] p-4">
          <p className="font-black">{t("deloadTitle")}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">{t("deloadBody", { percent: config.deloadPercentage })}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => void saveTrainingConfig({ ...config, pendingDeload: true })} className="h-11 rounded-2xl bg-[var(--accent)] font-black text-[var(--accent-ink)]">
              {t("deloadApply")}
            </button>
            <button type="button" onClick={() => void saveTrainingConfig({ ...config, pendingDeload: false })} className="h-11 rounded-2xl bg-[var(--bg-muted)] font-bold">
              {t("deloadIgnore")}
            </button>
          </div>
        </section>
      ) : null}
      <ConfigForm exerciseId={exercise.id} initial={trainingConfigs.find((item) => item.exerciseId === exercise.id) ?? defaultTrainingConfig(exercise.id, exercise.equipment, exercise.kind, exercise.kind === "compound" ? 5 : 8)} />
    </div>
  );
}

function bestFrom(sets: Array<{ weight: number; reps: number; completed: boolean; setType: string }>) {
  return sets.filter((set) => set.completed && set.setType !== "warmup" && set.weight > 0 && set.reps > 0 && set.reps <= 10).reduce((max, set) => Math.max(max, set.weight * (1 + set.reps / 30)), 0);
}

export function VolumePanel() {
  const { history, exercises, profile } = useAppState();
  const { t } = useI18n();
  const today = toDateKey(new Date());
  const report = buildWeeklyReport({
    history,
    exercises,
    records: [],
    start: addDaysKey(today, -6),
    end: today,
    previousStart: addDaysKey(today, -13),
    previousEnd: addDaysKey(today, -7),
  });
  if (report.sets === 0) return <Empty />;
  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--muted)]">{t("volumeNote")}</p>
      {report.muscles.map((item) => (
        <article key={item.category} className="flex items-center justify-between rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
          <span className="font-black">{t(item.category === "chest" ? "catChest" : item.category === "back" ? "catBack" : item.category === "leg" ? "catLeg" : item.category === "shoulder" ? "catShoulder" : "catArms")}</span>
          <span className="font-black tabular-nums">{item.sets} {t("volumeSets")}</span>
        </article>
      ))}
      <p className="text-sm text-[var(--muted)]">
        {t("summaryVolume")} {formatVolume(report.volume, profile.unit)} {profile.unit}
      </p>
    </div>
  );
}

export function ReportPanel() {
  const { history, exercises, records, profile } = useAppState();
  const { locale, t, exerciseName } = useI18n();
  const today = toDateKey(new Date());
  const report = buildWeeklyReport({
    history,
    exercises,
    records,
    start: addDaysKey(today, -6),
    end: today,
    previousStart: addDaysKey(today, -13),
    previousEnd: addDaysKey(today, -7),
  });
  const insights = useMemo(() => {
    return exercises.flatMap((exercise) => {
      const sessions = coachSessions(history, exercise.id);
      if (sessions.length < 2) return [];
      return buildExerciseInsights({
        exerciseId: exercise.id,
        exerciseName: exerciseName(exercise.name),
        sessionsNewestFirst: sessions,
        workingSetsThisWeek: sessions.filter((session) => session.date >= addDaysKey(today, -6)).length,
        workingSetsLastWeek: sessions.filter((session) => session.date < addDaysKey(today, -6) && session.date >= addDaysKey(today, -13)).length,
        prThisWeek: records.some((record) => record.exerciseId === exercise.id && record.date >= addDaysKey(today, -6)),
        locale,
      });
    }).sort((a, b) => a.priority - b.priority).slice(0, 6);
  }, [exerciseName, exercises, history, locale, records, today]);

  if (report.workouts === 0 && insights.length === 0) return <Empty />;
  const volumeDelta = report.previousVolume > 0 ? Math.round(((report.volume - report.previousVolume) / report.previousVolume) * 100) : null;
  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-3">
        <Stat label={t("reportWorkouts")} value={`${report.workouts}`} />
        <Stat label={t("summarySets")} value={`${report.sets}`} />
        <Stat label={t("summaryVolume")} value={`${formatVolume(report.volume, profile.unit)}`} />
        <Stat label={t("reportPr")} value={`${report.prs}`} />
      </section>
      <section className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4 text-sm">
        <p className="font-black">{t("reportCompare")}</p>
        <p className="mt-2">{t("homeWorkouts")} {report.workouts} / {report.previousWorkouts}</p>
        <p>{t("summaryVolume")} {volumeDelta == null ? "—" : `${volumeDelta > 0 ? "+" : ""}${volumeDelta}%`}</p>
        {report.strength.map((item) => (
          <p key={item.exerciseId}>
            {exerciseName(item.name)} {item.changePercent == null ? t("trendStable") : `${item.changePercent > 0 ? "+" : ""}${item.changePercent.toFixed(1)}%`}
          </p>
        ))}
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-black tracking-wide">{t("insightsTitle")}</h2>
        {insights.length === 0 ? <Empty /> : insights.map((insight) => (
          <article key={`${insight.type}-${insight.exerciseId}-${insight.title}`} className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
            <p className="text-[11px] font-black tracking-wide text-[var(--faint)]">{insight.type}</p>
            <p className="mt-1 font-black">{insight.title}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{insight.description}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

export function GoalsPanel() {
  const { exercises, history, goals, profile, saveGoal } = useAppState();
  const { t, exerciseName } = useI18n();
  const [exerciseId, setExerciseId] = useState(exercises[0]?.id ?? "");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [kind, setKind] = useState<"ONE_RM" | "WEIGHT_REPS">("ONE_RM");
  return (
    <div className="space-y-4">
      {goals.length === 0 ? <Empty /> : null}
      {goals.map((goal) => {
        const exercise = exercises.find((item) => item.id === goal.exerciseId);
        const current = exercise ? currentValue(history, exercise.id, goal) : 0;
        const target = goal.goalType === "ONE_RM" ? goal.targetEstimated1rm ?? goal.targetWeight ?? 0 : goal.targetWeight ?? 0;
        const ratio = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
        return (
          <article key={goal.id} className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
            <p className="font-black">{exercise ? exerciseName(exercise.name) : t("exerciseFallback")}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{goal.goalType === "ONE_RM" ? t("goalEstimated") : `${goal.targetWeight} × ${goal.targetReps}`}</p>
            <p className="mt-2 font-black tabular-nums">{Math.round(current)} / {Math.round(target)} {profile.unit} · {ratio}%</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--bg-muted)]">
              <div className="h-full bg-[var(--accent)]" style={{ width: `${ratio}%` }} />
            </div>
          </article>
        );
      })}
      <form
        className="space-y-2 rounded-3xl border border-[var(--line)] p-4"
        onSubmit={(event) => {
          event.preventDefault();
          const targetWeight = Number.parseFloat(weight);
          if (!exerciseId || !Number.isFinite(targetWeight)) return;
          const goal: TrainingGoal = {
            id: uuid(),
            exerciseId,
            goalType: kind,
            targetWeight,
            targetReps: kind === "WEIGHT_REPS" ? Number.parseInt(reps, 10) || null : null,
            targetEstimated1rm: kind === "ONE_RM" ? targetWeight : null,
            targetDate: null,
            status: "active",
          };
          void saveGoal(goal);
          setWeight("");
        }}
      >
        <select value={exerciseId} onChange={(event) => setExerciseId(event.target.value)} className="h-12 w-full rounded-2xl bg-[var(--bg)] px-3 font-bold">
          {exercises.map((item) => (
            <option key={item.id} value={item.id}>{exerciseName(item.name)}</option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setKind("ONE_RM")} className={`h-10 rounded-xl font-bold ${kind === "ONE_RM" ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--bg)]"}`}>{t("goal1rm")}</button>
          <button type="button" onClick={() => setKind("WEIGHT_REPS")} className={`h-10 rounded-xl font-bold ${kind === "WEIGHT_REPS" ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--bg)]"}`}>{t("goalReps")}</button>
        </div>
        <input value={weight} onChange={(event) => setWeight(event.target.value)} inputMode="decimal" placeholder={profile.unit} className="h-12 w-full rounded-2xl bg-[var(--bg)] px-3 font-bold" />
        {kind === "WEIGHT_REPS" ? <input value={reps} onChange={(event) => setReps(event.target.value)} inputMode="numeric" placeholder={t("cardReps")} className="h-12 w-full rounded-2xl bg-[var(--bg)] px-3 font-bold" /> : null}
        <button type="submit" className="h-12 w-full rounded-2xl bg-[var(--text)] font-black text-[var(--bg)]">{t("goalSave")}</button>
      </form>
    </div>
  );
}

function currentValue(history: ReturnType<typeof useAppState>["history"], exerciseId: string, goal: TrainingGoal) {
  const sessions = coachSessions(history, exerciseId);
  const latest = sessions[0];
  if (!latest) return 0;
  if (goal.goalType === "WEIGHT_REPS") {
    return latest.sets.reduce((max, set) => (set.completed && set.reps >= (goal.targetReps ?? 1) ? Math.max(max, set.weight) : max), 0);
  }
  return bestFrom(latest.sets);
}

function ConfigForm({ exerciseId, initial }: { exerciseId: string; initial: TrainingConfig }) {
  const { saveTrainingConfig } = useAppState();
  const { t } = useI18n();
  const [config, setConfig] = useState({ ...initial, exerciseId });
  return (
    <form
      className="space-y-2 rounded-3xl border border-[var(--line)] p-4"
      onSubmit={(event) => {
        event.preventDefault();
        void saveTrainingConfig({
          ...config,
          topSetEnabled: config.progressionType === "TOP_SET_BACKOFF",
          backoffEnabled: config.progressionType === "TOP_SET_BACKOFF" || config.backoffEnabled,
        });
      }}
    >
      <p className="font-black">{t("configTitle")}</p>
      <select value={config.progressionType} onChange={(event) => setConfig((current) => ({ ...current, progressionType: event.target.value as TrainingConfig["progressionType"] }))} className="h-12 w-full rounded-2xl bg-[var(--bg)] px-3 font-bold">
        <option value="DOUBLE_PROGRESSION">DOUBLE PROGRESSION</option>
        <option value="LINEAR">LINEAR</option>
        <option value="TOP_SET_BACKOFF">TOP SET + BACK-OFF</option>
        <option value="MANUAL">MANUAL</option>
      </select>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] font-bold text-[var(--faint)]">{t("configMin")}<input inputMode="numeric" value={config.minReps} onChange={(event) => setConfig((current) => ({ ...current, minReps: Number(event.target.value) || 1 }))} className="mt-1 h-12 w-full rounded-2xl bg-[var(--bg)] px-3 font-bold text-[var(--text)]" /></label>
        <label className="text-[11px] font-bold text-[var(--faint)]">{t("configMax")}<input inputMode="numeric" value={config.maxReps} onChange={(event) => setConfig((current) => ({ ...current, maxReps: Number(event.target.value) || 1 }))} className="mt-1 h-12 w-full rounded-2xl bg-[var(--bg)] px-3 font-bold text-[var(--text)]" /></label>
      </div>
      <label className="block text-[11px] font-bold text-[var(--faint)]">{t("configIncrement")}<input inputMode="decimal" value={config.weightIncrement} onChange={(event) => setConfig((current) => ({ ...current, weightIncrement: Number(event.target.value) || 2.5 }))} className="mt-1 h-12 w-full rounded-2xl bg-[var(--bg)] px-3 font-bold text-[var(--text)]" /></label>
      <label className="block text-[11px] font-bold text-[var(--faint)]">{t("configRpe")}<input inputMode="decimal" value={config.targetRpe} onChange={(event) => setConfig((current) => ({ ...current, targetRpe: Number(event.target.value) || 8 }))} className="mt-1 h-12 w-full rounded-2xl bg-[var(--bg)] px-3 font-bold text-[var(--text)]" /></label>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] font-bold text-[var(--faint)]">{t("configBackoffPct")}<input inputMode="decimal" value={config.backoffPercentage} onChange={(event) => setConfig((current) => ({ ...current, backoffPercentage: Number(event.target.value) || 90 }))} className="mt-1 h-12 w-full rounded-2xl bg-[var(--bg)] px-3 font-bold text-[var(--text)]" /></label>
        <label className="text-[11px] font-bold text-[var(--faint)]">{t("configBackoffSets")}<input inputMode="numeric" value={config.backoffSets} onChange={(event) => setConfig((current) => ({ ...current, backoffSets: Number(event.target.value) || 0 }))} className="mt-1 h-12 w-full rounded-2xl bg-[var(--bg)] px-3 font-bold text-[var(--text)]" /></label>
      </div>
      <label className="block text-[11px] font-bold text-[var(--faint)]">{t("configDeload")}<select value={config.deloadPercentage} onChange={(event) => setConfig((current) => ({ ...current, deloadPercentage: Number(event.target.value) }))} className="mt-1 h-12 w-full rounded-2xl bg-[var(--bg)] px-3 font-bold text-[var(--text)]">
        {[5, 7.5, 10, 15].map((value) => (
          <option key={value} value={value}>{value}%</option>
        ))}
      </select></label>
      <button type="submit" className="h-12 w-full rounded-2xl bg-[var(--text)] font-black text-[var(--bg)]">{t("configSave")}</button>
    </form>
  );
}

function Empty() {
  const { t } = useI18n();
  return (
    <div className="rounded-3xl border border-dashed border-[var(--line)] px-4 py-8 text-center">
      <p className="font-black">{t("notEnoughTitle")}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{t("notEnoughBody")}</p>
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
