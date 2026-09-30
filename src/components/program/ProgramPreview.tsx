"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppState } from "@/components/providers/AppStateProvider";
import { useI18n } from "@/components/providers/LocaleProvider";
import { trackTrainingEvent } from "@/lib/coaching/coachMessageEngine";
import { materializeProgram } from "@/lib/programming/materialize";
import { generateNextBlock } from "@/lib/programming/nextBlock";
import { generateProgram } from "@/lib/programming/programGenerator";
import { validateProgram } from "@/lib/programming/programValidator";
import { warmupSets } from "@/lib/programming/warmupCalculator";
import type { GeneratedProgram } from "@/lib/programming/types";

export function ProgramPreview() {
  const { exercises, history, trainingProfile, equipment, preferences, trainingMaxes, saveProgram, saveProgramVersion } = useAppState();
  const { t, exerciseName } = useI18n();
  const router = useRouter();
  const nextBlock = useSearchParams().get("next") === "1";
  const [variation, setVariation] = useState(nextBlock ? 1 : 0);
  const [custom, setCustom] = useState<GeneratedProgram | null>(null);
  const [warn, setWarn] = useState(false);
  const [showWarmup, setShowWarmup] = useState(true);
  const generated = useMemo(() => {
    if (!trainingProfile) return null;
    const payload = {
      profile: {
        goal: trainingProfile.goal,
        experience: trainingProfile.experience,
        daysPerWeek: trainingProfile.daysPerWeek,
        sessionMinutes: trainingProfile.sessionMinutes,
        equipment,
        preferredExerciseIds: preferences.filter((item) => item.preferenceType === "PREFERRED").map((item) => item.exerciseId),
        avoidExerciseIds: preferences.filter((item) => item.preferenceType === "AVOID").map((item) => item.exerciseId),
        scheduleMode: trainingProfile.scheduleMode,
        variation,
      },
      exercises,
      baselines: trainingMaxes,
      history: history.flatMap((workout) => workout.exercises.flatMap((session) => session.sets.filter((set) => set.completed).map((set) => ({
        exerciseId: session.exerciseId,
        weight: set.weight,
        reps: set.reps,
        rpe: set.rpe,
        completed: true,
        date: workout.date,
      })))),
    };
    return nextBlock ? generateNextBlock(payload) : generateProgram(payload);
  }, [equipment, exercises, history, nextBlock, preferences, trainingMaxes, trainingProfile, variation]);
  const program = custom ?? generated;

  if (!trainingProfile) {
    return <a href="/onboarding" className="block h-12 rounded-2xl bg-[var(--accent)] text-center leading-[3rem] font-black text-[var(--accent-ink)]">{t("setupTraining")}</a>;
  }
  if (!program) {
    return (
      <section className="space-y-3 rounded-3xl border border-[var(--line)] p-4">
        <h1 className="text-2xl font-black">{t("programCouldNot")}</h1>
        <p className="text-sm text-[var(--muted)]">{t("programCouldNotBody")}</p>
        <a href="/onboarding" className="block h-12 rounded-2xl bg-[var(--bg-elevated)] text-center leading-[3rem] font-black">{t("programEditProfile")}</a>
        <button type="button" onClick={() => setVariation((value) => value + 1)} className="h-12 w-full rounded-2xl bg-[var(--accent)] font-black text-[var(--accent-ink)]">{t("programRegenerate")}</button>
      </section>
    );
  }
  const validation = validateProgram(program);
  const first = program.weeks[0]?.days[0]?.exercises.find((exercise) => exercise.priority === "PRIMARY" && exercise.targetWeight);

  return (
    <div className="space-y-4">
      <header>
        <p className="text-[11px] font-black tracking-[0.16em] text-[var(--faint)]">{t("programPreview")}</p>
        <h1 className="text-3xl font-black">{program.name}</h1>
        <p className="text-sm text-[var(--muted)]">{program.durationWeeks} WEEKS · {program.daysPerWeek} DAYS · {program.split}</p>
      </header>
      {program.explanation.map((line) => <p key={line} className="text-sm leading-6 text-[var(--muted)]">{line}</p>)}
      {program.weeks[0]?.days.map((day) => (
        <article key={day.name} className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
          <h2 className="font-black">{day.name}</h2>
          <p className="text-xs text-[var(--faint)]">{day.focus} · {day.estimatedDuration} MIN</p>
          <ul className="mt-2 space-y-2">
            {day.exercises.map((exercise) => (
              <li key={exercise.exerciseId}>
                <p className="font-bold">{exerciseName(exercise.name)}</p>
                <p className="text-sm text-[var(--muted)]">{exercise.setType === "top" ? "Top" : exercise.sets} {exercise.setType === "top" ? `1 × ${exercise.minReps}-${exercise.maxReps}` : `${exercise.sets} × ${exercise.minReps}-${exercise.maxReps}`}{exercise.targetWeight != null ? ` · ${exercise.targetWeight}` : ""}</p>
                {exercise.startingNote ? <p className="text-xs">{t("startingWeight")}</p> : null}
              </li>
            ))}
          </ul>
        </article>
      ))}
      {showWarmup && first?.targetWeight ? (
        <section className="rounded-3xl border border-[var(--line)] p-4">
          <p className="font-black">{t("warmupTitle")}</p>
          <ul className="mt-2 text-sm">
            {warmupSets(first.targetWeight).map((set) => <li key={`${set.weight}-${set.reps}`}>{set.weight} × {set.reps}</li>)}
          </ul>
          <button type="button" onClick={() => setShowWarmup(false)} className="mt-2 h-11 font-bold">{t("warmupSkip")}</button>
        </section>
      ) : null}
      {warn && validation.warnings.length > 0 ? (
        <section className="rounded-3xl border border-[var(--line)] p-4">
          <p className="font-black">{t("programHighVolume")}</p>
          {validation.warnings.map((warning) => <p key={warning.muscle} className="text-sm">{warning.muscle} {warning.sets}</p>)}
          <button type="button" onClick={() => setWarn(false)} className="mt-2 h-11 font-bold">{t("programKeepChanges")}</button>
        </section>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setVariation((value) => value + 1)} className="h-12 rounded-2xl bg-[var(--bg-elevated)] font-black">{t("programRegenerate")}</button>
        <button
          type="button"
          onClick={() => {
            const next = structuredClone(program);
            const exercise = next.weeks[0]?.days[0]?.exercises[0];
            if (exercise) exercise.sets += 1;
            setCustom(next);
            if (validateProgram(next).warnings.length > 0) setWarn(true);
          }}
          className="h-12 rounded-2xl bg-[var(--bg-elevated)] font-black"
        >
          {t("programCustomize")}
        </button>
      </div>
      <button
        type="button"
        onClick={async () => {
          const stored = materializeProgram(program);
          await saveProgram(stored);
          await saveProgramVersion(stored, "GENERATED", program.split);
          trackTrainingEvent("program_started");
          router.push("/program");
        }}
        className="h-14 w-full rounded-2xl bg-[var(--accent)] font-black text-[var(--accent-ink)]"
      >
        {t("programStartPlan")}
      </button>
    </div>
  );
}
