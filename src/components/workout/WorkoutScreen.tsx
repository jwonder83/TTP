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
import { ConfirmDialog } from "@/components/ui/Sheet";
import { useAppState } from "@/components/providers/AppStateProvider";
import { sessionsForExercise } from "@/lib/calculations";
import { formatClock } from "@/lib/format";
import { recommendNextLoad } from "@/lib/recommendations";
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
  } = useAppState();
  const [mode, setMode] = useState<Mode>("hub");
  const [editing, setEditing] = useState<Routine | null>(null);
  const [summary, setSummary] = useState<FinishResult | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [rest, setRest] = useState<{ exerciseName: string; endsAt: number; total: number } | null>(null);
  const [finishing, setFinishing] = useState(false);
  const now = useNow(250);

  useEffect(() => {
    if (searchParams.get("resume") === "1" && activeWorkout) setMode("live");
  }, [activeWorkout, searchParams]);

  useEffect(() => {
    setChrome(mode === "live" ? "session" : "default");
    return () => setChrome("default");
  }, [mode, setChrome]);

  useEffect(() => {
    if (!rest) return;
    if (now < rest.endsAt) return;
    notifyRestComplete(rest.exerciseName);
    setRest(null);
  }, [now, rest]);

  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));

  const begin = async (routineId: string) => {
    if (activeWorkout) {
      setMode("live");
      return;
    }
    const started = await startWorkout(routineId);
    if (started) setMode("live");
  };

  const onToggleComplete = (sessionExerciseId: string, restSeconds: number, exerciseName: string, set: WorkoutSet) => {
    const completed = !set.completed;
    updateSet(sessionExerciseId, set.id, { completed });
    if (completed && typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(12);
    if (!completed) return;
    const total = Math.max(15, restSeconds);
    setRest({ exerciseName, endsAt: Date.now() + total * 1000, total });
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
        onDone={() => {
          setSummary(null);
          setMode("hub");
          router.push("/");
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
            const recommendation = recommendNextLoad(
              sessionsForExercise(history, exercise.id).map((item) => ({ weight: item.key.weight, reps: item.key.reps })),
              routineExercise?.defaultReps ?? previous?.key.reps ?? 8,
            );
            return (
              <ExerciseCard
                key={session.id}
                exercise={exercise}
                session={session}
                previous={previous}
                recommendation={recommendation}
                unit={profile.unit}
                records={records}
                onChangeSet={(setId, patch) => updateSet(session.id, setId, patch)}
                onToggleComplete={(set) => onToggleComplete(session.id, session.restSeconds, exercise.name, set)}
                onAddSet={() => addSet(session.id)}
                onRemoveLastSet={() => removeLastSet(session.id)}
                onRemoveExercise={() => removeWorkoutExercise(session.id)}
              />
            );
          })}
          <button type="button" onClick={() => setPickerOpen(true)} className="h-12 w-full rounded-2xl border border-dashed border-[var(--line-strong)] text-sm font-bold">
            Add exercise
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
              setRest(null);
              setSummary(result);
              setMode("summary");
            }}
            disabled={finishing}
            className="pointer-events-auto h-14 w-full rounded-2xl bg-[var(--accent)] text-base font-black tracking-wide text-[var(--accent-ink)] disabled:opacity-40"
          >
            {finishing ? "SAVING..." : "FINISH WORKOUT"}
          </button>
        </div>

        <AddExerciseSheet
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          excludeIds={activeWorkout.exercises.map((session) => session.exerciseId)}
          onPick={addWorkoutExercise}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <p className="text-[11px] font-black tracking-[0.18em] text-[var(--faint)]">WORKOUT</p>
        <h1 className="text-3xl font-black tracking-tight">Start</h1>
      </header>

      {activeWorkout ? <ResumeCard startedAt={activeWorkout.startedAt} name={activeWorkout.routineName} onResume={() => setMode("live")} onDiscard={() => setDiscardOpen(true)} /> : null}

      <div className="space-y-3">
        {routines.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--line)] px-4 py-8 text-center">
            <p className="text-sm font-black tracking-wide">NO ROUTINES</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Create your first routine.</p>
          </div>
        ) : null}
        {routines.map((routine) => (
          <RoutineCard
            key={routine.id}
            routine={routine}
            exercises={exercises}
            onStart={() => begin(routine.id)}
            onEdit={() => {
              setEditing(routine);
              setMode("builder");
            }}
            onDelete={() => setDeleteId(routine.id)}
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
        Create routine
      </button>

      <ConfirmDialog
        open={discardOpen}
        title="Discard workout?"
        body="This in-progress workout will be discarded."
        confirmLabel="Discard"
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
        title="Delete routine?"
        body="Past workouts stay in history. This only removes the template."
        confirmLabel="Delete"
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
  const elapsed = Math.max(0, Math.round((now - new Date(startedAt).getTime()) / 1000));
  return (
    <section className="rounded-3xl bg-[var(--accent)] p-4 text-[var(--accent-ink)]">
      <p className="text-[11px] font-black tracking-[0.16em]">WORKOUT IN PROGRESS</p>
      <h2 className="mt-1 text-2xl font-black">{name}</h2>
      <p className="mt-1 font-bold tabular-nums">{formatClock(elapsed)}</p>
      <button type="button" onClick={onResume} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent-ink)] font-black text-[var(--accent)]">
        <Play size={16} fill="currentColor" />
        RESUME WORKOUT
      </button>
      <button type="button" onClick={onDiscard} className="mt-2 h-10 w-full text-sm font-bold">
        Discard
      </button>
    </section>
  );
}
