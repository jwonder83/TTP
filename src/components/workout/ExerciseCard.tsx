"use client";

import { useState } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import { SetRow } from "@/components/workout/SetRow";
import { PRBadge } from "@/components/ui/PRBadge";
import { Sheet } from "@/components/ui/Sheet";
import { useI18n } from "@/components/providers/LocaleProvider";
import { isLiveE1rmPr, estimate1RM } from "@/lib/calculations";
import {
  SET_TYPE_ORDER,
  formatRoundedWeight,
  formatWeight,
  isAddedLoad,
} from "@/lib/format";
import type { Exercise, ExerciseSession, LoadRecommendation, PersonalRecord, Unit, WorkoutSet, SessionExercise } from "@/lib/types";

interface ExerciseCardProps {
  exercise: Exercise;
  session: SessionExercise;
  previous: ExerciseSession | null;
  recommendation: LoadRecommendation | null;
  unit: Unit;
  records: PersonalRecord[];
  onChangeSet: (setId: string, patch: Partial<WorkoutSet>) => void;
  onToggleComplete: (set: WorkoutSet) => void;
  onAddSet: () => void;
  onRemoveLastSet: () => void;
  onRemoveExercise: () => void;
  onWhy?: () => void;
  onRecalcBackoff?: () => void;
  coachReason?: string | null;
}

export function ExerciseCard({
  exercise,
  session,
  previous,
  recommendation,
  unit,
  records,
  onChangeSet,
  onToggleComplete,
  onAddSet,
  onRemoveLastSet,
  onRemoveExercise,
  onWhy,
  onRecalcBackoff,
  coachReason,
}: ExerciseCardProps) {
  const { t, exerciseName, setLabel, setShort } = useI18n();
  const [typeSetId, setTypeSetId] = useState<string | null>(null);
  const [showLast, setShowLast] = useState(false);
  const prefixPlus = isAddedLoad(exercise.equipment);
  const completedWorking = session.sets.filter((set) => set.completed && set.setType !== "warmup" && set.weight > 0 && set.reps > 0);
  const todayBest = completedWorking.reduce((best, set) => Math.max(best, estimate1RM(set.weight, set.reps)), 0);
  const previousBest = previous ? estimate1RM(previous.key.weight, previous.key.reps) : 0;
  const display1rm = todayBest || previousBest;
  const livePr = isLiveE1rmPr(records, exercise.id, session.sets);
  const typeSet = session.sets.find((set) => set.id === typeSetId) ?? null;
  const plannedTop = session.sets.find((set) => set.setType === "top");
  const todayWeight = plannedTop?.weight ?? recommendation?.weight;
  const todayReps = plannedTop?.reps ?? recommendation?.reps;

  return (
    <article className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black tracking-wide">{exerciseName(exercise.name)}</h2>
          {livePr ? (
            <div className="mt-2">
              <PRBadge />
            </div>
          ) : null}
        </div>
        <button type="button" onClick={onRemoveExercise} aria-label={t("cardRemove", { name: exerciseName(exercise.name) })} className="text-[var(--faint)]">
          <X size={18} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-wide text-[var(--faint)]">{t("cardPrevious")}</p>
          <p className="mt-1 text-xl font-black tabular-nums">
            {previous
              ? `${formatWeight(previous.key.weight, unit, { prefixPlus })} × ${previous.key.reps}`
              : "—"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold tracking-wide text-[var(--faint)]">{t("cardE1rm")}</p>
          <p className="mt-1 text-xl font-black tabular-nums">
            {display1rm > 0 ? `${formatRoundedWeight(display1rm, unit)} ${unit}` : "—"}
          </p>
        </div>
      </div>

      {recommendation && todayWeight !== undefined && todayReps !== undefined ? (
        <p className="mt-3 rounded-2xl bg-[var(--bg-muted)] px-3 py-2 text-sm leading-5 text-[var(--muted)]">
          <span className="font-bold text-[var(--text)]">
            {t("cardToday", { weight: formatWeight(todayWeight, unit, { prefixPlus }), reps: todayReps })}
          </span>
          {recommendation.reason === "progress"
            ? t("cardReasonProgress", {
                weight: formatWeight(recommendation.previousWeight, unit, { prefixPlus }),
                reps: recommendation.previousReps,
              })
            : recommendation.reason === "deload"
              ? t("cardReasonDeload")
              : coachReason ?? t("cardReasonKeep")}
        </p>
      ) : null}

      {onWhy || onRecalcBackoff ? (
        <div className="mt-3 flex gap-2">
          {onWhy ? (
            <button type="button" onClick={onWhy} className="h-10 rounded-xl bg-[var(--bg-muted)] px-3 text-sm font-bold">
              {t("coachWhy")}
            </button>
          ) : null}
          {onRecalcBackoff ? (
            <button type="button" onClick={onRecalcBackoff} className="h-10 rounded-xl bg-[var(--bg-muted)] px-3 text-sm font-bold">
              {t("coachApplyBackoff")}
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="mt-4 grid grid-cols-[22px_minmax(68px,1fr)_68px_52px_44px] gap-1 px-1 text-[10px] font-bold tracking-wide text-[var(--faint)]">
        <span className="text-center">{t("cardSet")}</span>
        <span>{t("cardType")}</span>
        <span className="text-center">{unit.toUpperCase()}</span>
        <span className="text-center">{t("cardReps")}</span>
        <span className="text-center">{t("cardDone")}</span>
      </div>

      <div className="mt-1 space-y-1">
        {session.sets.map((set) => (
          <SetRow
            key={set.id}
            set={set}
            unit={unit}
            onChange={(patch) => onChangeSet(set.id, patch)}
            onToggleComplete={() => onToggleComplete(set)}
            onPickType={() => setTypeSetId(set.id)}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <button type="button" onClick={onAddSet} className="inline-flex h-11 items-center gap-1 text-sm font-bold text-[var(--accent-text)]">
          <Plus size={16} />
          {t("cardAddSet")}
        </button>
        {session.sets.length > 1 ? (
          <button type="button" onClick={onRemoveLastSet} className="text-sm font-semibold text-[var(--muted)]">
            {t("cardRemoveLast")}
          </button>
        ) : null}
      </div>

      {previous ? (
        <div className="mt-3 border-t border-[var(--line)] pt-3">
          <button type="button" onClick={() => setShowLast((open) => !open)} className="flex w-full items-center justify-between text-left">
            <span className="text-[11px] font-black tracking-wide text-[var(--faint)]">{t("cardLast")}</span>
            <ChevronDown size={16} className={showLast ? "rotate-180 text-[var(--muted)]" : "text-[var(--muted)]"} />
          </button>
          {showLast ? (
            <ul className="mt-2 space-y-1">
              {previous.sets.map((set) => (
                <li key={set.id} className="flex items-center justify-between text-sm">
                  <span className={`badge badge-${set.setType}`}>{setShort(set.setType)}</span>
                  <span className="font-bold tabular-nums">
                    {formatWeight(set.weight, unit, { prefixPlus })} × {set.reps}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <Sheet open={typeSet !== null} title={t("cardSetType")} onClose={() => setTypeSetId(null)}>
        <div className="grid grid-cols-2 gap-2 pb-2">
          {SET_TYPE_ORDER.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                if (typeSet) onChangeSet(typeSet.id, { setType: type });
                setTypeSetId(null);
              }}
              className="flex h-14 items-center justify-center rounded-2xl bg-[var(--bg-muted)]"
            >
              <span className={`badge badge-${type}`}>{setLabel(type)}</span>
            </button>
          ))}
        </div>
      </Sheet>
    </article>
  );
}
