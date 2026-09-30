"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import { useAppState } from "@/components/providers/AppStateProvider";
import { useI18n } from "@/components/providers/LocaleProvider";
import { workoutStats, workoutVolume } from "@/lib/calculations";
import { addDaysKey, formatVolume, formatWeight, greeting, isAddedLoad, toDateKey, weekdayShort } from "@/lib/format";
import { coachSessions, resolveConfig } from "@/lib/training/history";
import { recommendExercise } from "@/lib/training/recommendationEngine";
import { strengthTrend } from "@/lib/training/strengthTrend";
import { useNow } from "@/hooks/useNow";

function formatWorkoutTime(totalSeconds: number, hoursLabel: (hours: number, minutes: number) => string, minutesLabel: (minutes: number) => string) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  if (hours <= 0) return minutesLabel(minutes);
  return hoursLabel(hours, minutes);
}

export function HomeDashboard() {
  const { profile, exercises, history, activeWorkout, bodyWeights, latestSetPr, routines, trainingConfigs } = useAppState();
  const { locale, t, exerciseName, displayName } = useI18n();
  const now = useNow(30_000);
  const today = new Date(now);
  const todayKey = toDateKey(today);
  const weekStart = addDaysKey(todayKey, -6);
  const week = history.filter((workout) => workout.date >= weekStart && workout.date <= todayKey);
  const weekVolume = week.reduce((sum, workout) => sum + workoutVolume(workout), 0);
  const weekSeconds = week.reduce((sum, workout) => sum + workoutStats(workout).durationSec, 0);
  const recent = [...history].sort((a, b) => b.date.localeCompare(a.date) || b.startedAt.localeCompare(a.startedAt)).slice(0, 4);
  const weight = [...bodyWeights].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  const prExercise = exercises.find((exercise) => exercise.id === latestSetPr?.exerciseId);
  const nameOf = (id: string) => {
    const name = exercises.find((exercise) => exercise.id === id)?.name;
    return name ? exerciseName(name) : t("exerciseFallback");
  };
  const elapsedMin = activeWorkout
    ? Math.max(1, Math.round((now - new Date(activeWorkout.startedAt).getTime()) / 60000))
    : 0;

  const focus = routines[0]?.exercises
    .map((item) => exercises.find((exercise) => exercise.id === item.exerciseId))
    .find((exercise) => exercise?.kind === "compound") ?? null;
  const focusPlan = focus
    ? recommendExercise({
        config: resolveConfig(trainingConfigs, focus, 5),
        sessionsNewestFirst: coachSessions(history, focus.id),
      })
    : null;
  const focusTrend = focus ? strengthTrend(coachSessions(history, focus.id)) : null;

  return (
    <div className="space-y-4">
      <header>
        <p className="text-sm font-semibold text-[var(--muted)]" suppressHydrationWarning>
          {greeting(today, locale)}
        </p>
        <h1 className="text-3xl font-black tracking-tight">{displayName(profile.name)}</h1>
      </header>

      {activeWorkout ? (
        <Link href="/workout?resume=1" className="block rounded-3xl bg-[var(--accent)] p-4 text-[var(--accent-ink)]">
          <p className="text-[11px] font-black tracking-[0.16em]">{t("homeInProgress")}</p>
          <p className="mt-1 text-xl font-black">{activeWorkout.routineName}</p>
          <p className="mt-1 text-sm font-black tabular-nums">{t("homeMinutes", { count: elapsedMin })}</p>
          <p className="mt-3 text-sm font-black">{t("homeResume")}</p>
        </Link>
      ) : null}

      <section className="grid grid-cols-2 gap-3">
        <article className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
          <p className="text-[11px] font-bold tracking-wide text-[var(--faint)]">{t("homeThisWeek")}</p>
          <p className="mt-2 text-3xl font-black tabular-nums">
            {week.length}
            <span className="text-lg text-[var(--muted)]"> / {profile.weeklyGoal}</span>
          </p>
          <p className="mt-1 text-xs font-bold tabular-nums text-[var(--muted)]">
            {formatWorkoutTime(
              weekSeconds,
              (hours, minutes) => t("homeHours", { hours, minutes }),
              (minutes) => t("homeMinutes", { count: minutes }),
            )}
          </p>
          <p className="text-xs text-[var(--muted)]">{t("homeWorkouts")}</p>
        </article>
        <article className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
          <p className="text-[11px] font-bold tracking-wide text-[var(--faint)]">{t("homeVolume")}</p>
          <p className="mt-2 text-3xl font-black tabular-nums">{formatVolume(weekVolume, profile.unit)}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{t("homeLast7", { unit: profile.unit })}</p>
        </article>
        <article className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
          <p className="text-[11px] font-bold tracking-wide text-[var(--faint)]">{t("homeRecentPr")}</p>
          <p className="mt-2 text-lg font-black leading-tight">{prExercise ? exerciseName(prExercise.name) : "—"}</p>
          <p className="mt-1 text-sm font-bold tabular-nums text-[var(--muted)]">
            {latestSetPr ? `${formatWeight(latestSetPr.weight, profile.unit)} × ${latestSetPr.reps}` : t("homeNoRecord")}
          </p>
        </article>
        <article className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
          <p className="text-[11px] font-bold tracking-wide text-[var(--faint)]">{t("homeBody")}</p>
          <p className="mt-2 text-3xl font-black tabular-nums">
            {weight ? formatWeight(weight.weight, profile.unit) : "—"}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">{profile.unit}</p>
        </article>
      </section>

      {routines[0] && !activeWorkout ? (
        <section className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
          <p className="text-[11px] font-black tracking-[0.16em] text-[var(--faint)]">{t("coachToday")}</p>
          <h2 className="mt-1 text-xl font-black">{routines[0].name}</h2>
          {focus && focusPlan?.recommendedWeight != null ? (
            <>
              <p className="mt-3 text-sm font-bold text-[var(--muted)]">{exerciseName(focus.name)}</p>
              <p className="text-2xl font-black tabular-nums">
                {formatWeight(focusPlan.recommendedWeight, profile.unit, { prefixPlus: isAddedLoad(focus.equipment) })} × {focusPlan.recommendedReps}
              </p>
              {focusTrend ? (
                <p className="mt-1 text-sm font-bold">
                  {focusTrend.direction === "TRENDING_UP" ? "↑" : focusTrend.direction === "TRENDING_DOWN" ? "↓" : "·"} {focusTrend.changePercent.toFixed(1)}%
                </p>
              ) : (
                <p className="mt-1 text-sm text-[var(--muted)]">{t("confidenceLow")}</p>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]">{t("reasonNoHistory")}</p>
          )}
        </section>
      ) : null}

      <Link
        href={activeWorkout ? "/workout?resume=1" : "/workout"}
        className="flex h-16 items-center justify-center gap-2 rounded-3xl bg-[var(--accent)] text-lg font-black tracking-wide text-[var(--accent-ink)]"
      >
        <Play size={18} fill="currentColor" />
        {activeWorkout ? t("homeResume") : t("homeStart")}
      </Link>

      <section className="space-y-3">
        <h2 className="text-[11px] font-black tracking-[0.16em] text-[var(--faint)]">{t("homeRecent")}</h2>
        {recent.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-[var(--line)] px-4 py-8 text-center text-sm text-[var(--muted)]">
            {t("homeEmpty")}
          </p>
        ) : (
          recent.map((workout) => (
          <article key={workout.id} className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
            <p className="text-[11px] font-black tracking-wide text-[var(--accent-text)]">{weekdayShort(workout.date, locale)}</p>
            <h3 className="mt-1 text-lg font-black">{workout.routineName}</h3>
            <ul className="mt-2 space-y-1">
              {workout.exercises.map((exercise) => (
                <li key={exercise.id} className="text-sm text-[var(--muted)]">
                  {nameOf(exercise.exerciseId)}
                </li>
              ))}
            </ul>
          </article>
          ))
        )}
      </section>
    </div>
  );
}
