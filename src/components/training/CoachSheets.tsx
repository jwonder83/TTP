"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { useAppState } from "@/components/providers/AppStateProvider";
import { useI18n } from "@/components/providers/LocaleProvider";
import { displayToKg, formatWeight, isAddedLoad, kgToDisplay } from "@/lib/format";
import { coachSessions, resolveConfig } from "@/lib/training/history";
import { recommendExercise } from "@/lib/training/recommendationEngine";
import { RPE_STEPS, RIR_STEPS } from "@/lib/training/config";
import type { ReadinessInput } from "@/lib/training/types";
import type { MessageKey } from "@/lib/i18n/messages";
import type { Routine } from "@/lib/types";

const REASONS: Record<string, MessageKey> = {
  "no-history": "reasonNoHistory",
  "no-work": "reasonNoWork",
  manual: "reasonManual",
  "double-up": "reasonDoubleUp",
  "double-keep": "reasonDoubleKeep",
  "double-hard": "reasonDoubleHard",
  "linear-up": "reasonLinearUp",
  "linear-easy": "reasonLinearEasy",
  "linear-hard": "reasonLinearHard",
  "linear-miss": "reasonLinearMiss",
  deload: "reasonDeload",
};

export function reasonText(t: (key: MessageKey) => string, code: string) {
  const key = REASONS[code];
  return key ? t(key) : code;
}

export function TodayPlan({
  routine,
  onClose,
  onStart,
}: {
  routine: Routine;
  onClose: () => void;
  onStart: (options: { readiness: ReadinessInput; useRecovery: boolean; weightOverrides: Record<string, number> }) => void;
}) {
  const { exercises, history, trainingConfigs, profile } = useAppState();
  const { t, exerciseName } = useI18n();
  const [readiness, setReadiness] = useState<ReadinessInput>({ energy: "NORMAL", sleep: "GOOD", soreness: "LOW" });
  const [useRecovery, setUseRecovery] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [whyId, setWhyId] = useState<string | null>(null);

  const rows = routine.exercises
    .map((item) => {
      const exercise = exercises.find((entry) => entry.id === item.exerciseId);
      if (!exercise) return null;
      const recommendation = recommendExercise({
        config: resolveConfig(trainingConfigs, exercise, item.defaultReps),
        sessionsNewestFirst: coachSessions(history, exercise.id),
        readiness,
      });
      return { exercise, recommendation };
    })
    .filter((row) => row !== null);

  const why = rows.find((row) => row.exercise.id === whyId) ?? null;

  return (
    <div className="space-y-4">
      <header>
        <button type="button" onClick={onClose} className="text-sm font-bold text-[var(--muted)]">
          {t("headerBack")}
        </button>
        <p className="mt-3 text-[11px] font-black tracking-[0.16em] text-[var(--faint)]">{t("coachPlan")}</p>
        <h1 className="text-3xl font-black tracking-tight">{routine.name}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{t("coachSuggest")}</p>
      </header>

      <section className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
        <h2 className="text-sm font-black tracking-wide">{t("coachReadiness")}</h2>
        <Choice label={t("coachEnergy")} value={readiness.energy} options={["LOW", "NORMAL", "HIGH"]} labels={[t("levelLow"), t("levelNormal"), t("levelHigh")]} onChange={(energy) => setReadiness((current) => ({ ...current, energy: energy as ReadinessInput["energy"] }))} />
        <Choice label={t("coachSleep")} value={readiness.sleep} options={["POOR", "OK", "GOOD"]} labels={[t("sleepPoor"), t("sleepOk"), t("sleepGood")]} onChange={(sleep) => setReadiness((current) => ({ ...current, sleep: sleep as ReadinessInput["sleep"] }))} />
        <Choice label={t("coachSoreness")} value={readiness.soreness} options={["LOW", "MODERATE", "HIGH"]} labels={[t("levelLow"), t("levelModerate"), t("levelHigh")]} onChange={(soreness) => setReadiness((current) => ({ ...current, soreness: soreness as ReadinessInput["soreness"] }))} />
      </section>

      {rows.some((row) => row.recommendation.recoveryWeight != null) ? (
        <button type="button" onClick={() => setUseRecovery((value) => !value)} className="w-full rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4 text-left">
          <p className="text-sm font-black">{useRecovery ? t("coachRecoveryOn") : t("coachRecoveryOff")}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">{t("coachRecoveryBody")}</p>
        </button>
      ) : null}

      <div className="space-y-3">
        {rows.map(({ exercise, recommendation }) => {
          const plus = isAddedLoad(exercise.equipment);
          const planned = useRecovery && recommendation.recoveryWeight != null ? recommendation.recoveryWeight : recommendation.recommendedWeight;
          return (
            <article key={exercise.id} className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
              <h2 className="text-lg font-black">{exerciseName(exercise.name)}</h2>
              {recommendation.status === "NO_HISTORY" ? (
                <p className="mt-2 text-sm text-[var(--muted)]">{t("reasonNoHistory")}</p>
              ) : (
                <p className="mt-2 text-xl font-black tabular-nums">
                  {planned != null ? formatWeight(planned, profile.unit, { prefixPlus: plus }) : "—"}
                  {recommendation.recommendedReps != null ? ` × ${recommendation.recommendedReps}` : ""}
                </p>
              )}
              {recommendation.backoffWeight != null ? (
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {t("coachBackoff")} {formatWeight(recommendation.backoffWeight, profile.unit, { prefixPlus: plus })} × {recommendation.backoffReps} · {recommendation.backoffSets}
                </p>
              ) : null}
              <p className="mt-2 text-xs font-bold tracking-wide text-[var(--faint)]">
                {t("coachConfidence")} · {t(recommendation.confidence === "HIGH" ? "confidenceHigh" : recommendation.confidence === "MEDIUM" ? "confidenceMedium" : "confidenceLow")}
              </p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => setWhyId(exercise.id)} className="h-10 rounded-xl bg-[var(--bg-muted)] px-3 text-sm font-bold">
                  {t("coachWhy")}
                </button>
              </div>
              <label className="mt-3 block text-[11px] font-bold tracking-wide text-[var(--faint)]">
                {t("coachEditWeight")}
                <input
                  inputMode="decimal"
                  value={overrides[exercise.id] ?? ""}
                  placeholder={planned != null ? String(kgToDisplay(planned, profile.unit)) : ""}
                  onChange={(event) => setOverrides((current) => ({ ...current, [exercise.id]: event.target.value }))}
                  className="mt-1 h-11 w-full rounded-xl bg-[var(--bg)] px-3 text-base font-bold outline-none"
                />
              </label>
            </article>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => {
          const weightOverrides: Record<string, number> = {};
          for (const [id, raw] of Object.entries(overrides)) {
            const parsed = Number.parseFloat(raw);
            if (Number.isFinite(parsed) && parsed >= 0) weightOverrides[id] = displayToKg(parsed, profile.unit);
          }
          onStart({ readiness, useRecovery, weightOverrides });
        }}
        className="h-14 w-full rounded-2xl bg-[var(--accent)] text-base font-black text-[var(--accent-ink)]"
      >
        {t("homeStart")}
      </button>

      <Sheet open={why !== null} title={t("coachWhyTitle")} onClose={() => setWhyId(null)}>
        {why ? (
          <div className="space-y-3 pb-4 text-sm leading-6">
            <p className="font-black">{exerciseName(why.exercise.name)}</p>
            <p>
              {t("coachLast")}: {why.recommendation.lastWeight ?? "—"} × {why.recommendation.lastReps ?? "—"}
              {why.recommendation.lastRpe != null ? ` @ RPE ${why.recommendation.lastRpe}` : ""}
            </p>
            <p>{reasonText(t, why.recommendation.reason)}</p>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}

function Choice({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  labels: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-3">
      <p className="text-[11px] font-bold tracking-wide text-[var(--faint)]">{label}</p>
      <div className="mt-1 grid grid-cols-3 gap-2">
        {options.map((option, index) => (
          <button key={option} type="button" onClick={() => onChange(option)} className={`h-10 rounded-xl text-xs font-black ${value === option ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--bg)] text-[var(--muted)]"}`}>
            {labels[index]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function EffortSheet({
  open,
  scale,
  onClose,
  onPick,
}: {
  open: boolean;
  scale: "rpe" | "rir";
  onClose: () => void;
  onPick: (value: number) => void;
}) {
  const { t } = useI18n();
  const rpeLabel = (value: number) => {
    if (value <= 6) return t("rpeEasy");
    if (value <= 7) return t("rpeComfort");
    if (value <= 8) return t("rpeHard");
    if (value <= 9) return t("rpeVery");
    return t("rpeMax");
  };
  return (
    <Sheet open={open} title={t("coachHowHard")} onClose={onClose}>
      <div className="grid grid-cols-1 gap-2 pb-2">
        {scale === "rir"
          ? RIR_STEPS.map((value) => (
              <button key={value} type="button" onClick={() => onPick(value)} className="h-12 rounded-2xl bg-[var(--bg-muted)] text-left px-4 font-black">
                {value === 4 ? "4+" : value}
              </button>
            ))
          : RPE_STEPS.map((value) => (
              <button key={value} type="button" onClick={() => onPick(value)} className="flex h-12 items-center justify-between rounded-2xl bg-[var(--bg-muted)] px-4">
                <span className="font-black">RPE {value}</span>
                <span className="text-sm text-[var(--muted)]">{rpeLabel(value)}</span>
              </button>
            ))}
        <button type="button" onClick={onClose} className="h-12 rounded-2xl font-bold text-[var(--muted)]">
          {t("coachSkip")}
        </button>
      </div>
    </Sheet>
  );
}
