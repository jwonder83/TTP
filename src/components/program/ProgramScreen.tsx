"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppState } from "@/components/providers/AppStateProvider";
import { useI18n } from "@/components/providers/LocaleProvider";
import { ProgramPreview } from "@/components/program/ProgramPreview";
import { recordScheduleAction } from "@/lib/api/coaching";
import { decideAdaptation } from "@/lib/programming/adaptiveProgramming";
import { trackTrainingEvent } from "@/lib/coaching/coachMessageEngine";
import type { TrainingProgram } from "@/lib/api/programs";
import { uuid } from "@/lib/format";

export function ProgramScreen() {
  const { programs, exercises, history, saveProgram, saveProgramVersion, startProgramDay, userId, loadProgramVersions } = useAppState();
  const { t, exerciseName } = useI18n();
  const router = useRouter();
  const build = useSearchParams().get("build") === "1";
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

  if (build) return <ProgramPreview />;

  const weekDays = active?.days.filter((day) => day.weekNumber === (active.currentWeek ?? 1)) ?? [];
  const adjustmentLines = weekDays.flatMap((day) => day.exercises.flatMap((exercise) => {
    const sessions = history.flatMap((workout) => workout.exercises.filter((session) => session.exerciseId === exercise.exerciseId).flatMap((session) => {
      const top = session.sets.filter((set) => set.completed && set.setType !== "warmup").at(-1);
      if (!top) return [];
      return [{ weight: top.weight, reps: top.reps, rpe: top.rpe, hitTarget: top.reps >= exercise.minReps }];
    })).slice(0, 3);
    if (sessions.length === 0) return [];
    const decision = decideAdaptation({ sessions, minReps: exercise.minReps, maxReps: exercise.maxReps, increment: 2.5, priority: "PRIMARY" });
    if (decision.action === "NO_RECOMMENDATION" || decision.nextWeight == null) return [];
    return [{ name: exercises.find((item) => item.id === exercise.exerciseId)?.name ?? exercise.exerciseId, action: decision.action, from: exercise.targetWeight, to: decision.nextWeight, reason: decision.reason, exerciseId: exercise.exerciseId }];
  }));

  return (
    <div className="space-y-4">
      <a href="/program?build=1" className="block h-12 rounded-2xl bg-[var(--accent)] text-center text-sm font-black leading-[3rem] text-[var(--accent-ink)]">{t("onboardGenerate")}</a>
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
          {userId ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => void recordScheduleAction(userId, day.id, "MOVE_TOMORROW", null)} className="h-11 rounded-xl bg-[var(--bg)] text-xs font-bold">{t("scheduleTomorrow")}</button>
              <button type="button" onClick={() => void recordScheduleAction(userId, day.id, "SKIP", null)} className="h-11 rounded-xl bg-[var(--bg)] text-xs font-bold">{t("scheduleSkip")}</button>
            </div>
          ) : null}
        </article>
      ))}
      {adjustmentLines.length > 0 && active ? (
        <section className="rounded-3xl border border-[var(--line)] p-4">
          <h2 className="font-black">{t("weekAdjustTitle")}</h2>
          {adjustmentLines.some((line) => line.action === "DELOAD") ? <p className="mt-2 text-sm">{t("recoverySuggest")}</p> : null}
          {adjustmentLines.map((line) => (
            <p key={line.exerciseId} className="mt-2 text-sm">{exerciseName(line.name)} {line.from ?? "—"} → {line.to} · {line.reason}</p>
          ))}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={async () => {
                const next = {
                  ...active,
                  days: active.days.map((day) => day.weekNumber !== active.currentWeek + 1 ? day : {
                    ...day,
                    exercises: day.exercises.map((exercise) => {
                      const line = adjustmentLines.find((item) => item.exerciseId === exercise.exerciseId);
                      return line ? { ...exercise, targetWeight: line.to } : exercise;
                    }),
                  }),
                };
                await saveProgram(next);
                await saveProgramVersion(next, "WEEKLY_ADJUSTMENT", "Week adjustment");
                trackTrainingEvent("program_adjustment_applied");
              }}
              className="h-12 rounded-2xl bg-[var(--accent)] text-sm font-black text-[var(--accent-ink)]"
            >
              {t("weekApply")}
            </button>
            <button type="button" onClick={() => trackTrainingEvent("program_adjustment_rejected")} className="h-12 rounded-2xl bg-[var(--bg)] text-sm font-bold">{t("weekKeep")}</button>
          </div>
          <button
            type="button"
            onClick={async () => {
              const versions = await loadProgramVersions(active.id);
              const previous = versions[1]?.snapshot;
              if (previous) await saveProgram(previous);
            }}
            className="mt-2 h-11 w-full rounded-2xl bg-[var(--bg-muted)] text-sm font-bold"
          >
            {t("programUndo")}
          </button>
        </section>
      ) : null}
      {active && totalDays > 0 && doneCount >= totalDays ? (
        <section className="rounded-3xl border border-[var(--line)] p-4">
          <h2 className="font-black">{t("programComplete")}</h2>
          <p className="text-sm">{doneCount} / {totalDays}</p>
          <a href="/program?build=1&next=1" className="mt-3 block h-12 rounded-2xl bg-[var(--accent)] text-center font-black leading-[3rem] text-[var(--accent-ink)]">{t("nextBlock")}</a>
        </section>
      ) : null}
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
            plannedDays: null,
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
