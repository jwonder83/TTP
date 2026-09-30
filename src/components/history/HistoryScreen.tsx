"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAppState } from "@/components/providers/AppStateProvider";
import { useI18n } from "@/components/providers/LocaleProvider";
import { workoutStats } from "@/lib/calculations";
import {
  cx,
  formatDurationMinutes,
  formatVolume,
  formatWeight,
  isAddedLoad,
  monthLabel,
  toDateKey,
} from "@/lib/format";

function weekdayHeaders(locale: "ko" | "en") {
  return Array.from({ length: 7 }, (_, index) =>
    new Date(2024, 0, index + 1).toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", { weekday: "narrow" }),
  );
}

function monthCells(year: number, month: number) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const pad = (firstWeekday + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: Array<number | null> = Array.from({ length: pad }, () => null);
  for (let day = 1; day <= days; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function HistoryScreen() {
  const { history, exercises, profile, ensureMonth, historyHasMore, loadMoreHistory } = useAppState();
  const { locale, t, exerciseName } = useI18n();
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => toDateKey(new Date()));
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const cells = monthCells(year, month);
  const trained = useMemo(() => new Set(history.map((workout) => workout.date)), [history]);
  const dayWorkouts = history
    .filter((workout) => workout.date === selected)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const nameOf = (id: string) => exercises.find((exercise) => exercise.id === id);
  const todayKey = toDateKey(new Date());

  useEffect(() => {
    void ensureMonth(year, month);
  }, [ensureMonth, month, year]);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <button
          type="button"
          aria-label={t("historyPrev")}
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bg-elevated)]"
        >
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-xl font-black">{monthLabel(cursor, locale)}</h1>
        <button
          type="button"
          aria-label={t("historyNext")}
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bg-elevated)]"
        >
          <ChevronRight size={18} />
        </button>
      </header>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-[var(--faint)]">
        {weekdayHeaders(locale).map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (!day) return <span key={`empty-${index}`} />;
          const key = toDateKey(new Date(year, month, day));
          const hasWorkout = trained.has(key);
          const active = key === selected;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(key)}
              className={cx(
                "flex h-11 flex-col items-center justify-center rounded-2xl text-sm font-bold",
                active ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--bg-elevated)]",
                key === todayKey && !active && "ring-1 ring-[var(--accent)]",
              )}
            >
              {day}
              {hasWorkout ? (
                <span className={cx("mt-0.5 h-1 w-1 rounded-full", active ? "bg-[var(--accent-ink)]" : "bg-[var(--accent)]")} />
              ) : (
                <span className="mt-0.5 h-1 w-1" />
              )}
            </button>
          );
        })}
      </div>

      {history.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[var(--line)] px-4 py-8 text-center">
          <p className="text-sm font-black tracking-wide">{t("historyNoneTitle")}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">{t("historyNoneBody")}</p>
          <Link href="/workout" className="mt-4 inline-flex h-12 items-center justify-center rounded-2xl bg-[var(--accent)] px-5 font-black text-[var(--accent-ink)]">
            {t("historyStart")}
          </Link>
        </div>
      ) : null}

      {dayWorkouts.length === 0 && history.length > 0 ? (
        <p className="rounded-3xl border border-dashed border-[var(--line)] px-4 py-8 text-center text-sm text-[var(--muted)]">
          {t("historyEmptyDay")}
        </p>
      ) : (
        dayWorkouts.map((workout) => {
          const stats = workoutStats(workout);
          return (
            <article key={workout.id} className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
              <p className="text-[11px] font-black tracking-wide text-[var(--faint)]">{t("historyWorkout")}</p>
              <h2 className="mt-1 text-xl font-black">{workout.routineName}</h2>
              <div className="mt-4 space-y-4">
                {workout.exercises.map((session) => {
                  const exercise = nameOf(session.exerciseId);
                  const prefixPlus = exercise ? isAddedLoad(exercise.equipment) : false;
                  const completed = session.sets.filter((set) => set.completed);
                  return (
                    <section key={session.id}>
                      <h3 className="font-bold">{exercise ? exerciseName(exercise.name) : t("exerciseFallback")}</h3>
                      <ul className="mt-1 space-y-0.5">
                        {completed.map((set) => (
                          <li key={set.id} className="text-sm tabular-nums text-[var(--muted)]">
                            {formatWeight(set.weight, profile.unit, { prefixPlus })} × {set.reps}
                          </li>
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[var(--line)] pt-3 text-sm">
                <p>
                  <span className="block text-[11px] font-bold text-[var(--faint)]">{t("historyDuration")}</span>
                  <span className="font-black">{formatDurationMinutes(stats.durationSec, locale)}</span>
                </p>
                <p>
                  <span className="block text-[11px] font-bold text-[var(--faint)]">{t("historyVolume")}</span>
                  <span className="font-black tabular-nums">
                    {formatVolume(stats.volume, profile.unit)} {profile.unit}
                  </span>
                </p>
              </div>
            </article>
          );
        })
      )}
      {historyHasMore ? (
        <button type="button" onClick={() => void loadMoreHistory()} className="h-12 w-full rounded-2xl bg-[var(--bg-elevated)] text-sm font-black">
          {t("historyLoadMore")}
        </button>
      ) : null}
    </div>
  );
}
