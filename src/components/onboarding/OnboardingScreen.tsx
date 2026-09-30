"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/providers/AppStateProvider";
import { useI18n } from "@/components/providers/LocaleProvider";
import { estimate1RM } from "@/lib/calculations";
import { trackTrainingEvent } from "@/lib/coaching/coachMessageEngine";
import type { EquipmentChoice, ExperienceLevel, ScheduleMode, TrainingGoalId, TrainingMaxSource } from "@/lib/programming/types";

const GOALS: Array<{ id: TrainingGoalId; title: "goalStrength" | "goalMuscle" | "goalPower" | "goalGeneral"; body: "goalStrengthBody" | "goalMuscleBody" | "goalPowerBody" | "goalGeneralBody" }> = [
  { id: "STRENGTH", title: "goalStrength", body: "goalStrengthBody" },
  { id: "HYPERTROPHY", title: "goalMuscle", body: "goalMuscleBody" },
  { id: "POWERBUILDING", title: "goalPower", body: "goalPowerBody" },
  { id: "GENERAL", title: "goalGeneral", body: "goalGeneralBody" },
];

const EXPERIENCE: Array<{ id: ExperienceLevel; title: "expBeginner" | "expIntermediate" | "expAdvanced"; body: "expBeginnerBody" | "expIntermediateBody" | "expAdvancedBody" }> = [
  { id: "BEGINNER", title: "expBeginner", body: "expBeginnerBody" },
  { id: "INTERMEDIATE", title: "expIntermediate", body: "expIntermediateBody" },
  { id: "ADVANCED", title: "expAdvanced", body: "expAdvancedBody" },
];

const EQUIPMENT: EquipmentChoice[] = ["BARBELL", "DUMBBELLS", "POWER_RACK", "BENCH", "CABLE", "MACHINES", "PULLUP_BAR", "DIP_STATION", "LEG_PRESS", "SMITH", "BODYWEIGHT"];
const BASELINE_NAMES = ["Squat", "Bench Press", "Deadlift", "Overhead Press"];

export function OnboardingScreen() {
  const { exercises, history, programs, trainingProfile, equipment, preferences, saveCoachingSetup } = useAppState();
  const { t, exerciseName } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState<TrainingGoalId>(trainingProfile?.goal ?? "POWERBUILDING");
  const [experience, setExperience] = useState<ExperienceLevel>(trainingProfile?.experience ?? "INTERMEDIATE");
  const [days, setDays] = useState(trainingProfile?.daysPerWeek ?? 3);
  const [minutes, setMinutes] = useState(trainingProfile?.sessionMinutes ?? 60);
  const [owned, setOwned] = useState<EquipmentChoice[]>(equipment.length ? equipment : ["BARBELL", "POWER_RACK", "BENCH"]);
  const [preferred, setPreferred] = useState<string[]>(preferences.filter((item) => item.preferenceType === "PREFERRED").map((item) => item.exerciseId));
  const [avoid, setAvoid] = useState<string[]>(preferences.filter((item) => item.preferenceType === "AVOID").map((item) => item.exerciseId));
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>(trainingProfile?.scheduleMode ?? "FLEXIBLE");
  const [baselineText, setBaselineText] = useState<Record<string, string>>({});
  const [askRebuild, setAskRebuild] = useState(false);
  const lifts = useMemo(() => BASELINE_NAMES.map((name) => exercises.find((exercise) => exercise.name === name)).filter((exercise) => exercise != null), [exercises]);

  async function finish(rebuild: boolean) {
    const maxes = lifts.flatMap((exercise) => {
      const raw = baselineText[exercise.id];
      if (!raw) return [];
      const [weightText, repsText] = raw.split("x");
      const weight = Number(weightText);
      const reps = Number(repsText ?? 1);
      if (!Number.isFinite(weight) || weight <= 0) return [];
      const source: TrainingMaxSource = reps === 1 ? "ACTUAL" : "ESTIMATED";
      const value = reps === 1 ? weight : estimate1RM(weight, reps);
      return [{ exerciseId: exercise.id, value, source }];
    });
    await saveCoachingSetup(
      { goal, experience, daysPerWeek: days, sessionMinutes: minutes, scheduleMode, effortScale: "rpe" },
      owned,
      [
        ...preferred.filter((id) => !avoid.includes(id)).map((exerciseId) => ({ exerciseId, preferenceType: "PREFERRED" as const })),
        ...avoid.map((exerciseId) => ({ exerciseId, preferenceType: "AVOID" as const })),
      ],
      maxes,
    );
    trackTrainingEvent("onboarding_completed");
    const active = programs.find((program) => program.status === "active");
    if (active && active.plannedDays && active.plannedDays !== days && !rebuild) {
      setAskRebuild(true);
      return;
    }
    router.push(rebuild || !active ? "/program?build=1" : "/");
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-black tracking-[0.16em] text-[var(--faint)]">{t("onboardProgress", { step })}</p>
      {step === 1 ? (
        <Step title={t("onboardGoal")}>
          {GOALS.map((item) => (
            <Card key={item.id} title={t(item.title)} body={t(item.body)} selected={goal === item.id} onClick={() => setGoal(item.id)} />
          ))}
        </Step>
      ) : null}
      {step === 2 ? (
        <Step title={t("onboardExperience")}>
          {EXPERIENCE.map((item) => (
            <Card key={item.id} title={t(item.title)} body={t(item.body)} selected={experience === item.id} onClick={() => setExperience(item.id)} />
          ))}
        </Step>
      ) : null}
      {step === 3 ? (
        <Step title={t("onboardDays")}>
          {[2, 3, 4, 5, 6].map((value) => (
            <Card key={value} title={`${value}`} body="" selected={days === value} onClick={() => setDays(value)} />
          ))}
        </Step>
      ) : null}
      {step === 4 ? (
        <Step title={t("onboardMinutes")}>
          {[30, 45, 60, 75, 90].map((value) => (
            <Card key={value} title={`${value}`} body="MIN" selected={minutes === value} onClick={() => setMinutes(value)} />
          ))}
        </Step>
      ) : null}
      {step === 5 ? (
        <Step title={t("onboardEquipment")}>
          {EQUIPMENT.map((item) => (
            <Card key={item} title={item} body="" selected={owned.includes(item)} onClick={() => setOwned((current) => current.includes(item) ? current.filter((entry) => entry !== item) : [...current, item])} />
          ))}
        </Step>
      ) : null}
      {step === 6 ? (
        <Step title={t("onboardPreferred")}>
          <p className="text-xs font-black text-[var(--faint)]">{t("onboardAvoid")}</p>
          {exercises.slice(0, 18).map((exercise) => (
            <div key={exercise.id} className="grid grid-cols-2 gap-2">
              <Card title={exerciseName(exercise.name)} body="" selected={preferred.includes(exercise.id)} onClick={() => setPreferred((current) => current.includes(exercise.id) ? current.filter((id) => id !== exercise.id) : [...current, exercise.id])} />
              <Card title={t("onboardAvoid")} body="" selected={avoid.includes(exercise.id)} onClick={() => setAvoid((current) => current.includes(exercise.id) ? current.filter((id) => id !== exercise.id) : [...current, exercise.id])} />
            </div>
          ))}
        </Step>
      ) : null}
      {step === 7 ? (
        <Step title={t("onboardBaseline")}>
          <p className="text-sm text-[var(--muted)]">{t("onboardBaselineBody")}</p>
          {lifts.map((exercise) => {
            const previous = history.flatMap((workout) => workout.exercises).filter((session) => session.exerciseId === exercise.id).at(-1);
            return (
              <label key={exercise.id} className="block text-sm font-bold">
                {exerciseName(exercise.name)}
                <input
                  value={baselineText[exercise.id] ?? ""}
                  placeholder={previous ? `${previous.sets.find((set) => set.completed)?.weight ?? ""}x${previous.sets.find((set) => set.completed)?.reps ?? ""}` : "100x5"}
                  onChange={(event) => setBaselineText((current) => ({ ...current, [exercise.id]: event.target.value }))}
                  className="mt-1 h-12 w-full rounded-2xl bg-[var(--bg)] px-3"
                />
              </label>
            );
          })}
        </Step>
      ) : null}
      {step === 8 ? (
        <Step title={t("onboardSummary")}>
          <p className="font-black">{goal}</p>
          <p>{experience}</p>
          <p>{days} / {minutes} MIN</p>
          <p>{owned.join(" · ")}</p>
          <div className="grid grid-cols-2 gap-2">
            <Card title={t("scheduleFlexible")} body="" selected={scheduleMode === "FLEXIBLE"} onClick={() => setScheduleMode("FLEXIBLE")} />
            <Card title={t("scheduleFixed")} body="" selected={scheduleMode === "FIXED"} onClick={() => setScheduleMode("FIXED")} />
          </div>
        </Step>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={step === 1} onClick={() => setStep((value) => Math.max(1, value - 1))} className="h-12 rounded-2xl bg-[var(--bg-elevated)] font-bold disabled:opacity-40">{t("onboardBack")}</button>
        {step < 8 ? (
          <button type="button" onClick={() => setStep((value) => value + 1)} className="h-12 rounded-2xl bg-[var(--accent)] font-black text-[var(--accent-ink)]">{t("onboardNext")}</button>
        ) : (
          <button type="button" onClick={() => void finish(false)} className="h-12 rounded-2xl bg-[var(--accent)] font-black text-[var(--accent-ink)]">{t("onboardGenerate")}</button>
        )}
      </div>
      {askRebuild ? (
        <section className="rounded-3xl border border-[var(--line)] p-4">
          <p className="text-sm leading-6">{t("rebuildAsk")}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => router.push("/")} className="h-12 rounded-2xl bg-[var(--bg)] font-bold">{t("rebuildLater")}</button>
            <button type="button" onClick={() => router.push("/program?build=1")} className="h-12 rounded-2xl bg-[var(--accent)] font-black text-[var(--accent-ink)]">{t("rebuildNow")}</button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-black">{title}</h1>
      {children}
    </section>
  );
}

function Card({ title, body, selected, onClick }: { title: string; body: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`min-h-14 w-full rounded-2xl px-4 py-3 text-left ${selected ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--bg-elevated)]"}`}>
      <span className="block font-black">{title}</span>
      {body ? <span className="mt-1 block text-sm">{body}</span> : null}
    </button>
  );
}
