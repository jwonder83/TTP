"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import { useAppState } from "@/components/providers/AppStateProvider";
import { workoutStats, workoutVolume } from "@/lib/calculations";
import { addDaysKey, formatVolume, formatWeight, greeting, toDateKey, weekdayShort } from "@/lib/format";
import { useNow } from "@/hooks/useNow";

function formatWorkoutTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  if (hours <= 0) return `${minutes}M`;
  return `${hours}H ${minutes}M`;
}

export function HomeDashboard() {
  const { profile, exercises, history, activeWorkout, bodyWeights, latestSetPr } = useAppState();
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
  const nameOf = (id: string) => exercises.find((exercise) => exercise.id === id)?.name ?? "Exercise";
  const elapsedMin = activeWorkout
    ? Math.max(1, Math.round((now - new Date(activeWorkout.startedAt).getTime()) / 60000))
    : 0;

  return (
    <div className="space-y-4">
      <header>
        <p className="text-sm font-semibold text-[var(--muted)]" suppressHydrationWarning>
          {greeting(today)}
        </p>
        <h1 className="text-3xl font-black tracking-tight">{profile.name}</h1>
      </header>

      {activeWorkout ? (
        <Link href="/workout?resume=1" className="block rounded-3xl bg-[var(--accent)] p-4 text-[var(--accent-ink)]">
          <p className="text-[11px] font-black tracking-[0.16em]">WORKOUT IN PROGRESS</p>
          <p className="mt-1 text-xl font-black">{activeWorkout.routineName}</p>
          <p className="mt-1 text-sm font-black tabular-nums">{elapsedMin} MIN</p>
          <p className="mt-3 text-sm font-black">RESUME WORKOUT</p>
        </Link>
      ) : null}

      <section className="grid grid-cols-2 gap-3">
        <article className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
          <p className="text-[11px] font-bold tracking-wide text-[var(--faint)]">THIS WEEK</p>
          <p className="mt-2 text-3xl font-black tabular-nums">
            {week.length}
            <span className="text-lg text-[var(--muted)]"> / {profile.weeklyGoal}</span>
          </p>
          <p className="mt-1 text-xs font-bold tabular-nums text-[var(--muted)]">{formatWorkoutTime(weekSeconds)}</p>
          <p className="text-xs text-[var(--muted)]">Workouts</p>
        </article>
        <article className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
          <p className="text-[11px] font-bold tracking-wide text-[var(--faint)]">WEEKLY VOLUME</p>
          <p className="mt-2 text-3xl font-black tabular-nums">{formatVolume(weekVolume, profile.unit)}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{profile.unit} · last 7 days</p>
        </article>
        <article className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
          <p className="text-[11px] font-bold tracking-wide text-[var(--faint)]">RECENT PR</p>
          <p className="mt-2 text-lg font-black leading-tight">{prExercise?.name ?? "—"}</p>
          <p className="mt-1 text-sm font-bold tabular-nums text-[var(--muted)]">
            {latestSetPr ? `${formatWeight(latestSetPr.weight, profile.unit)} × ${latestSetPr.reps}` : "No record yet"}
          </p>
        </article>
        <article className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
          <p className="text-[11px] font-bold tracking-wide text-[var(--faint)]">BODY WEIGHT</p>
          <p className="mt-2 text-3xl font-black tabular-nums">
            {weight ? formatWeight(weight.weight, profile.unit) : "—"}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">{profile.unit}</p>
        </article>
      </section>

      <Link
        href={activeWorkout ? "/workout?resume=1" : "/workout"}
        className="flex h-16 items-center justify-center gap-2 rounded-3xl bg-[var(--accent)] text-lg font-black tracking-wide text-[var(--accent-ink)]"
      >
        <Play size={18} fill="currentColor" />
        {activeWorkout ? "RESUME WORKOUT" : "START WORKOUT"}
      </Link>

      <section className="space-y-3">
        <h2 className="text-[11px] font-black tracking-[0.16em] text-[var(--faint)]">RECENT</h2>
        {recent.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-[var(--line)] px-4 py-8 text-center text-sm text-[var(--muted)]">
            No workouts yet.
          </p>
        ) : (
          recent.map((workout) => (
          <article key={workout.id} className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
            <p className="text-[11px] font-black tracking-wide text-[var(--accent-text)]">{weekdayShort(workout.date)}</p>
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
