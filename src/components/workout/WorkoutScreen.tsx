"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Play } from "lucide-react";
import { AddExerciseSheet } from "@/components/workout/AddExerciseSheet";
import { ExerciseCard } from "@/components/workout/ExerciseCard";
import { RestTimer, notifyRestComplete } from "@/components/workout/RestTimer";
import { RoutineBuilder } from "@/components/workout/RoutineBuilder";
import { RoutineCard } from "@/components/workout/RoutineCard";
import { WorkoutHeader } from "@/components/workout/WorkoutHeader";
import { WorkoutSummary } from "@/components/workout/WorkoutSummary";
import { EffortSheet, TodayPlan, reasonText } from "@/components/training/CoachSheets";
import { ConfirmDialog, Sheet } from "@/components/ui/Sheet";
import { useAppState } from "@/components/providers/AppStateProvider";
import { useI18n } from "@/components/providers/LocaleProvider";
import { sessionsForExercise } from "@/lib/calculations";
import { formatClock, uuid } from "@/lib/format";
import { exerciseAlternatives } from "@/lib/program/alternatives";
import { recommendNextLoad } from "@/lib/recommendations";
import { calculateBackoffWeight } from "@/lib/training/backoffCalculator";
import { coachSessions, resolveConfig } from "@/lib/training/history";
import { recommendExercise } from "@/lib/training/recommendationEngine";
import { useNow } from "@/hooks/useNow";
import type { FinishResult, Routine, WorkoutSet } from "@/lib/types";

type Mode = "hub" | "builder" | "live" | "summary";

export function WorkoutScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    routines,
    exercises,
    history,
    activeWorkout,
    records,
    profile,
    setChrome,
    startWorkout,
    updateSet,
    addSet,
    removeLastSet,
    addWorkoutExercise,
    removeWorkoutExercise,
    finishWorkout,
    discardWorkout,
    deleteRoutine,
    saveRoutine,
    replaceWorkoutExercise,
    programs,
    saveProgram,
    trainingConfigs,
  } = useAppState();
  const { t, exerciseName } = useI18n();
  const [mode, setMode] = useState<Mode>("hub");
  const [editing, setEditing] = useState<Routine | null>(null);
  const [summary, setSummary] = useState<FinishResult | null>(null);
  const [summaryRecovery, setSummaryRecovery] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [rest, setRest] = useState<{ exerciseName: string; endsAt: number; total: number } | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [effort, setEffort] = useState<{ sessionId: string; setId: string } | null>(null);
  const [why, setWhy] = useState<{ name: string; text: string; last: string } | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [replaceSessionId, setReplaceSessionId] = useState<string | null>(null);
  const [restPrompt, setRestPrompt] = useState(false);
  const now = useNow(250);

  useEffect(() => {
    if (searchParams.get("resume") === "1" && activeWorkout) setMode("live");
  }, [activeWorkout, searchParams]);

  useEffect(() => {
    if (mode !== "live" || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    if (window.localStorage.getItem("iron-log.wake") === "off") return;
    let released = false;
    let current: WakeLockSentinel | null = null;
    const request = () => {
      void navigator.wakeLock.request("screen").then((lock) => {
        if (released) void lock.release();
        else current = lock;
      }).catch(() => undefined);
    };
    request();
    const onVisible = () => {
      if (document.visibilityState === "visible") request();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisible);
      void current?.release();
    };
  }, [mode]);

  useEffect(() => {
    setChrome(mode === "live" ? "session" : "default");
    return () => setChrome("default");
  }, [mode, setChrome]);

  useEffect(() => {
    if (!rest) return;
    if (now < rest.endsAt) return;
    notifyRestComplete(t("restComplete"), t("restNext", { name: exerciseName(rest.exerciseName) }));
    setRest(null);
  }, [exerciseName, now, rest, t]);

  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));

  const onToggleComplete = (sessionExerciseId: string, restSeconds: number, name: string, set: WorkoutSet) => {
    const completed = !set.completed;
    updateSet(sessionExerciseId, set.id, { completed });
    if (completed && typeof navigator !== "undefined" && "vibrate" in navigator && window.localStorage.getItem("iron-log.haptics") !== "off") navigator.vibrate(12);
    if (!completed) return;
    if (set.setType !== "warmup" && set.rpe == null && set.rir == null) setEffort({ sessionId: sessionExerciseId, setId: set.id });
    const total = Math.max(15, restSeconds);
    setRest({ exerciseName: name, endsAt: Date.now() + total * 1000, total });
    if (typeof Notification !== "undefined" && Notification.permission === "default" && window.localStorage.getItem("iron-log.rest-asked") !== "1") {
      setRestPrompt(true);
    }
  };

  if (mode === "builder") {
    return <RoutineBuilder initial={editing} onClose={() => setMode("hub")} />;
  }

  if (mode === "summary" && summary) {
    return (
      <WorkoutSummary
        result={summary}
        exercises={exercises}
        unit={profile.unit}
        history={history}
        trainingConfigs={trainingConfigs}
        recovery={summaryRecovery}
        onDone={() => {
          setSummary(null);
          setMode("hub");
          router.push("/");
        }}
        onSaveTemplate={() => {
          void saveRoutine({
            id: uuid(),
            name: summary.workout.routineName,
            exercises: summary.workout.exercises.map((session, index) => ({
              id: uuid(),
              exerciseId: session.exerciseId,
              orderIndex: index,
              defaultSets: Math.max(1, session.sets.filter((set) => set.setType !== "warmup").length),
              defaultReps: session.sets.find((set) => set.setType !== "warmup")?.reps ?? session.sets[0]?.reps ?? 5,
              restSeconds: session.restSeconds,
            })),
          });
        }}
      />
    );
  }

  if (mode === "live" && activeWorkout) {
    const secondsLeft = rest ? Math.ceil((rest.endsAt - now) / 1000) : 0;
    return (
      <div>
        <WorkoutHeader title={activeWorkout.routineName} startedAt={activeWorkout.startedAt} onBack={() => setMode("hub")} />
        <div className="mt-2 space-y-3">
          {activeWorkout.exercises.map((session) => {
            const exercise = exerciseById.get(session.exerciseId);
            if (!exercise) return null;
            const previous = sessionsForExercise(history, exercise.id)[0] ?? null;
            const routineExercise = routines
              .find((routine) => routine.id === activeWorkout.routineId)
              ?.exercises.find((item) => item.exerciseId === exercise.id);
            const coach = recommendExercise({
              config: resolveConfig(trainingConfigs, exercise, routineExercise?.defaultReps ?? previous?.key.reps ?? 8),
              sessionsNewestFirst: coachSessions(history, exercise.id),
            });
            const recommendation = recommendNextLoad(
              sessionsForExercise(history, exercise.id).map((item) => ({ weight: item.key.weight, reps: item.key.reps })),
              routineExercise?.defaultReps ?? previous?.key.reps ?? 8,
            );
            const mapped = recommendation
              ? {
                  ...recommendation,
                  reason: coach.recommendationType === "INCREASE" ? "progress" as const : coach.recommendationType === "DELOAD" || coach.recommendationType === "DECREASE" ? "deload" as const : recommendation.reason,
                }
              : coach.recommendedWeight != null && coach.recommendedReps != null
                ? {
                    weight: coach.recommendedWeight,
                    reps: coach.recommendedReps,
                    reason: coach.recommendationType === "INCREASE" ? "progress" as const : coach.recommendationType === "DELOAD" ? "deload" as const : "hold" as const,
                    previousWeight: coach.lastWeight ?? coach.recommendedWeight,
                    previousReps: coach.lastReps ?? coach.recommendedReps,
                    failStreak: 0,
                  }
                : null;
            const topDone = session.sets.some((set) => set.setType === "top" && set.completed);
            const backoffOpen = session.sets.some((set) => set.setType === "backoff" && !set.completed);
            const config = resolveConfig(trainingConfigs, exercise, routineExercise?.defaultReps ?? 5);
            return (
              <ExerciseCard
                key={session.id}
                exercise={exercise}
                session={session}
                previous={previous}
                recommendation={mapped}
                coachReason={reasonText(t, coach.reason)}
                unit={profile.unit}
                records={records}
                onChangeSet={(setId, patch) => updateSet(session.id, setId, patch)}
                onToggleComplete={(set) => onToggleComplete(session.id, session.restSeconds, exerciseName(exercise.name), set)}
                onAddSet={() => addSet(session.id)}
                onRemoveLastSet={() => removeLastSet(session.id)}
                onRemoveExercise={() => removeWorkoutExercise(session.id)}
                onReplace={() => setReplaceSessionId(session.id)}
                onWhy={() =>
                  setWhy({
                    name: exerciseName(exercise.name),
                    text: reasonText(t, coach.reason),
                    last: `${coach.lastWeight ?? "—"} × ${coach.lastReps ?? "—"}${coach.lastRpe != null ? ` @ RPE ${coach.lastRpe}` : ""}`,
                  })
                }
                onRecalcBackoff={
                  topDone && backoffOpen
                    ? () => {
                        const top = session.sets.find((set) => set.setType === "top" && set.completed);
                        if (!top) return;
                        const weight = calculateBackoffWeight(top.weight, config.backoffPercentage, config.weightIncrement);
                        session.sets
                          .filter((set) => set.setType === "backoff" && !set.completed)
                          .forEach((set) => updateSet(session.id, set.id, { weight, reps: config.backoffMinReps }));
                      }
                    : undefined
                }
              />
            );
          })}
          <button type="button" onClick={() => setPickerOpen(true)} className="h-12 w-full rounded-2xl border border-dashed border-[var(--line-strong)] text-sm font-bold">
            {t("workoutAdd")}
          </button>
        </div>

        {rest && secondsLeft > 0 ? (
          <RestTimer
            secondsLeft={secondsLeft}
            total={rest.total}
            exerciseName={rest.exerciseName}
            onAdd={() => setRest((current) => (current ? { ...current, endsAt: current.endsAt + 30_000, total: current.total + 30 } : current))}
            onSkip={() => setRest(null)}
          />
        ) : null}

        <div className="pointer-events-none fixed bottom-0 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 bg-gradient-to-t from-[var(--bg)] from-40% to-transparent px-4 pt-8 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={async () => {
              if (finishing) return;
              setFinishing(true);
              const result = await finishWorkout();
              setFinishing(false);
              if (!result) return;
              setSummaryRecovery(Boolean(activeWorkout.recoveryMode));
              setRest(null);
              setSummary(result);
              setMode("summary");
            }}
            disabled={finishing}
            className="pointer-events-auto h-14 w-full rounded-2xl bg-[var(--accent)] text-base font-black tracking-wide text-[var(--accent-ink)] disabled:opacity-40"
          >
            {finishing ? t("workoutSaving") : t("workoutFinish")}
          </button>
        </div>

        <AddExerciseSheet
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          excludeIds={activeWorkout.exercises.map((session) => session.exerciseId)}
          onPick={addWorkoutExercise}
        />
        <EffortSheet
          open={effort !== null}
          scale={profile.effortScale}
          onClose={() => setEffort(null)}
          onPick={(value) => {
            if (!effort) return;
            updateSet(effort.sessionId, effort.setId, profile.effortScale === "rir" ? { rir: value } : { rpe: value });
            setEffort(null);
          }}
        />
        <Sheet open={why !== null} title={t("coachWhyTitle")} onClose={() => setWhy(null)}>
          {why ? (
            <div className="space-y-2 pb-4 text-sm leading-6">
              <p className="font-black">{why.name}</p>
              <p>{t("coachLast")}: {why.last}</p>
              <p>{why.text}</p>
            </div>
          ) : null}
        </Sheet>
        <Sheet open={restPrompt} title={t("restAlertTitle")} onClose={() => { window.localStorage.setItem("iron-log.rest-asked", "1"); setRestPrompt(false); }}>
          <p className="text-sm leading-6 text-[var(--muted)]">{t("restAlertBody")}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 pb-2">
            <button type="button" onClick={() => { window.localStorage.setItem("iron-log.rest-asked", "1"); setRestPrompt(false); void Notification.requestPermission(); }} className="h-12 rounded-2xl bg-[var(--accent)] font-black text-[var(--accent-ink)]">{t("restAlertEnable")}</button>
            <button type="button" onClick={() => { window.localStorage.setItem("iron-log.rest-asked", "1"); setRestPrompt(false); }} className="h-12 rounded-2xl bg-[var(--bg)] font-bold">{t("restAlertLater")}</button>
          </div>
        </Sheet>
        <Sheet open={replaceSessionId !== null} title={t("replaceExercise")} onClose={() => setReplaceSessionId(null)}>
          <div className="space-y-2 pb-4">
            {exerciseAlternatives(
              exercises.find((item) => item.id === activeWorkout.exercises.find((session) => session.id === replaceSessionId)?.exerciseId) ?? exercises[0],
              exercises,
            ).map((choice) => (
              <div key={choice.id} className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!replaceSessionId) return;
                    void replaceWorkoutExercise(replaceSessionId, choice.id);
                    setReplaceSessionId(null);
                  }}
                  className="h-12 rounded-2xl bg-[var(--bg)] px-3 text-xs font-black"
                >
                  {exerciseName(choice.name)} · {t("thisWorkout")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!replaceSessionId || !activeWorkout.programDayId) return;
                    const program = programs.find((item) => item.id === activeWorkout.programId);
                    const fromId = activeWorkout.exercises.find((session) => session.id === replaceSessionId)?.exerciseId;
                    if (!program || !fromId) return;
                    void saveProgram({
                      ...program,
                      days: program.days.map((day) => day.id !== activeWorkout.programDayId ? day : {
                        ...day,
                        exercises: day.exercises.map((item) => item.exerciseId === fromId ? { ...item, exerciseId: choice.id } : item),
                      }),
                    });
                    void replaceWorkoutExercise(replaceSessionId, choice.id);
                    setReplaceSessionId(null);
                  }}
                  className="h-12 rounded-2xl bg-[var(--bg-muted)] px-3 text-xs font-black"
                >
                  {t("updateProgram")}
                </button>
              </div>
            ))}
          </div>
        </Sheet>
      </div>
    );
  }

  const planning = routines.find((routine) => routine.id === planId) ?? null;
  if (planning) {
    return (
      <TodayPlan
        routine={planning}
        onClose={() => setPlanId(null)}
        onStart={async (options) => {
          const started = await startWorkout(planning.id, options);
          if (!started) return;
          setPlanId(null);
          setMode("live");
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <p className="text-[11px] font-black tracking-[0.18em] text-[var(--faint)]">{t("navWorkout")}</p>
        <h1 className="text-3xl font-black tracking-tight">{t("workoutTitle")}</h1>
      </header>

      {activeWorkout ? <ResumeCard startedAt={activeWorkout.startedAt} name={activeWorkout.routineName} onResume={() => setMode("live")} onDiscard={() => setDiscardOpen(true)} /> : null}

      <div className="space-y-3">
        {routines.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--line)] px-4 py-8 text-center">
            <p className="text-sm font-black tracking-wide">{t("workoutNoneTitle")}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{t("workoutNoneBody")}</p>
          </div>
        ) : null}
        {routines.map((routine) => (
          <RoutineCard
            key={routine.id}
            routine={routine}
            exercises={exercises}
            onStart={() => setPlanId(routine.id)}
            onEdit={() => {
              setEditing(routine);
              setMode("builder");
            }}
            onDelete={() => setDeleteId(routine.id)}
            onDuplicate={() =>
              void saveRoutine({
                ...routine,
                id: uuid(),
                name: `${routine.name} B`,
                exercises: routine.exercises.map((item) => ({ ...item, id: uuid() })),
              })
            }
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          setEditing(null);
          setMode("builder");
        }}
        className="h-12 w-full rounded-2xl border border-dashed border-[var(--line-strong)] font-bold"
      >
        {t("workoutCreate")}
      </button>

      <ConfirmDialog
        open={discardOpen}
        title={t("workoutDiscardTitle")}
        body={t("workoutDiscardBody")}
        confirmLabel={t("workoutDiscard")}
        danger
        onClose={() => setDiscardOpen(false)}
        onConfirm={() => {
          discardWorkout();
          setDiscardOpen(false);
          setMode("hub");
        }}
      />
      <ConfirmDialog
        open={deleteId !== null}
        title={t("workoutDeleteTitle")}
        body={t("workoutDeleteBody")}
        confirmLabel={t("workoutDelete")}
        danger
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deleteRoutine(deleteId);
          setDeleteId(null);
        }}
      />
      </div>
  );
}

function ResumeCard({
  startedAt,
  name,
  onResume,
  onDiscard,
}: {
  startedAt: string;
  name: string;
  onResume: () => void;
  onDiscard: () => void;
}) {
  const now = useNow();
  const { t } = useI18n();
  const elapsed = Math.max(0, Math.round((now - new Date(startedAt).getTime()) / 1000));
  return (
    <section className="rounded-3xl bg-[var(--accent)] p-4 text-[var(--accent-ink)]">
      <p className="text-[11px] font-black tracking-[0.16em]">{t("homeInProgress")}</p>
      <h2 className="mt-1 text-2xl font-black">{name}</h2>
      <p className="mt-1 font-bold tabular-nums">{formatClock(elapsed)}</p>
      <button type="button" onClick={onResume} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent-ink)] font-black text-[var(--accent)]">
        <Play size={16} fill="currentColor" />
        {t("workoutResume")}
      </button>
      <button type="button" onClick={onDiscard} className="mt-2 h-10 w-full text-sm font-bold">
        {t("workoutDiscard")}
      </button>
    </section>
  );
}
