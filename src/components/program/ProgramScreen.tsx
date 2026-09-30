"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/providers/AppStateProvider";
import { useI18n } from "@/components/providers/LocaleProvider";
import type { TrainingProgram } from "@/lib/api/programs";
import { uuid } from "@/lib/format";

export function ProgramScreen() {
  const { programs, exercises, history, saveProgram, startProgramDay } = useAppState();
  const { t, exerciseName } = useI18n();
  const router = useRouter();
  const active = programs.find((program) => program.status === "active") ?? programs[0] ?? null;
  const [viewWeek, setViewWeek] = useState(active?.currentWeek ?? 1);
  const [name, setName] = useState("");
  const [weeks, setWeeks] = useState(8);
  const [dayName, setDayName] = useState("DAY 1");
  const [picked, setPicked] = useState<string[]>([]);

  const days = active?.days.filter((day) => day.weekNumber === viewWeek) ?? [];
  const done = new Set(history.filter((workout) => workout.programId === active?.id).map((workout) => workout.programDayId));
  const totalDays = active?.days.length ?? 0;
  const doneCount = active ? active.days.filter((day) => done.has(day.id)).length : 0;

  return (
    <div className="space-y-4">
      <header>
        <p className="text-[11px] font-black tracking-[0.16em] text-[var(--faint)]">{t("programTitle")}</p>
        <h1 className="text-3xl font-black">{active ? active.name : t("programCreate")}</h1>
      </header>
      {active ? (
        <section className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
          <p className="text-sm font-black">{t("programWeek")} {active.currentWeek} / {active.durationWeeks}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">{doneCount} / {totalDays}</p>
          <p className="mt-1 font-black">{t("programProgress")} {totalDays === 0 ? 0 : Math.round((doneCount / totalDays) * 100)}%</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => setViewWeek((week) => Math.max(1, week - 1))} className="h-11 flex-1 rounded-2xl bg-[var(--bg)] font-bold">{t("programView")} −</button>
            <button type="button" onClick={() => setViewWeek((week) => Math.min(active.durationWeeks, week + 1))} className="h-11 flex-1 rounded-2xl bg-[var(--bg)] font-bold">{viewWeek}</button>
            <button type="button" onClick={() => void saveProgram({ ...active, currentWeek: viewWeek })} className="h-11 flex-1 rounded-2xl bg-[var(--bg-muted)] text-xs font-black">{t("programCurrent")}</button>
          </div>
        </section>
      ) : null}
      {days.map((day) => (
        <article key={day.id} className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
          <p className="text-[11px] font-black text-[var(--faint)]">{done.has(day.id) ? "✓" : "○"}</p>
          <h2 className="text-xl font-black">{day.name}</h2>
          <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
            {day.exercises.map((item) => {
              const exercise = exercises.find((entry) => entry.id === item.exerciseId);
              return <li key={item.id}>{exercise ? exerciseName(exercise.name) : item.exerciseId} · {item.sets} × {item.maxReps}{item.percentage1rm ? ` · ${item.percentage1rm}%` : ""}</li>;
            })}
          </ul>
          <button
            type="button"
            onClick={async () => {
              const started = await startProgramDay(active!.id, day.id);
              if (started) router.push("/workout?resume=1");
            }}
            className="mt-3 h-12 w-full rounded-2xl bg-[var(--accent)] font-black text-[var(--accent-ink)]"
          >
            {t("programStart")}
          </button>
        </article>
      ))}
      <form
        className="space-y-2 rounded-3xl border border-[var(--line)] p-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim() || picked.length === 0) return;
          const dayId = uuid();
          const program: TrainingProgram = {
            id: uuid(),
            name: name.trim(),
            description: "",
            durationWeeks: weeks,
            currentWeek: 1,
            status: "active",
            startedAt: new Date().toISOString(),
            days: Array.from({ length: weeks }, (_, index) => ({
              id: index === 0 ? dayId : uuid(),
              weekNumber: index + 1,
              dayNumber: 1,
              name: dayName || "DAY 1",
              scheduledDay: null,
              orderIndex: 0,
              exercises: picked.map((exerciseId, orderIndex) => ({
                id: uuid(),
                exerciseId,
                orderIndex,
                sets: 4,
                minReps: 5,
                maxReps: 5,
                targetWeight: null,
                percentage1rm: null,
                setType: "top" as const,
                restSeconds: 180,
              })),
            })),
          };
          void saveProgram(program);
          setName("");
          setPicked([]);
        }}
      >
        <p className="font-black">{t("programCreate")}</p>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("programTitle")} className="h-12 w-full rounded-2xl bg-[var(--bg)] px-3 font-bold" />
        <input inputMode="numeric" value={weeks} onChange={(event) => setWeeks(Math.min(52, Math.max(1, Number(event.target.value) || 1)))} className="h-12 w-full rounded-2xl bg-[var(--bg)] px-3 font-bold" />
        <input value={dayName} onChange={(event) => setDayName(event.target.value)} className="h-12 w-full rounded-2xl bg-[var(--bg)] px-3 font-bold" />
        <div className="flex max-h-40 flex-wrap gap-2 overflow-auto">
          {exercises.slice(0, 24).map((exercise) => {
            const on = picked.includes(exercise.id);
            return (
              <button key={exercise.id} type="button" onClick={() => setPicked((current) => on ? current.filter((id) => id !== exercise.id) : [...current, exercise.id])} className={`h-10 rounded-full px-3 text-xs font-bold ${on ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--bg)]"}`}>
                {exerciseName(exercise.name)}
              </button>
            );
          })}
        </div>
        <button type="submit" className="h-12 w-full rounded-2xl bg-[var(--text)] font-black text-[var(--bg)]">{t("configSave")}</button>
      </form>
      <p className="text-sm text-[var(--muted)]">{t("pushUnsupported")}</p>
    </div>
  );
}
