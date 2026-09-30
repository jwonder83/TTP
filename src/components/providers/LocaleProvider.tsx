"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { EXERCISE_KO, en, ko, type MessageKey } from "@/lib/i18n/messages";
import type { Equipment, ExerciseCategory, RecordType, SetType } from "@/lib/types";

export type Locale = "ko" | "en";

const STORAGE_KEY = "iron-log.locale";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  exerciseName: (name: string) => string;
  displayName: (name: string) => string;
  setLabel: (type: SetType) => string;
  setShort: (type: SetType) => string;
  categoryLabel: (category: ExerciseCategory) => string;
  equipmentLabel: (equipment: Equipment) => string;
  recordLabel: (type: RecordType | string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function fill(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}

const SET_LABEL: Record<SetType, MessageKey> = {
  warmup: "setWarmup",
  normal: "setNormal",
  top: "setTop",
  backoff: "setBackoff",
  drop: "setDrop",
  amrap: "setAmrap",
};

const SET_SHORT: Record<SetType, MessageKey> = {
  warmup: "setWarmupShort",
  normal: "setNormalShort",
  top: "setTopShort",
  backoff: "setBackoffShort",
  drop: "setDropShort",
  amrap: "setAmrapShort",
};

const CATEGORY: Record<ExerciseCategory, MessageKey> = {
  chest: "catChest",
  back: "catBack",
  leg: "catLeg",
  shoulder: "catShoulder",
  arms: "catArms",
};

const EQUIPMENT: Record<Equipment, MessageKey> = {
  barbell: "eqBarbell",
  dumbbell: "eqDumbbell",
  cable: "eqCable",
  machine: "eqMachine",
  bodyweight: "eqBodyweight",
  other: "eqOther",
};

const RECORD: Record<string, MessageKey> = {
  e1rm: "recordE1rm",
  "1rm": "record1rm",
  "3rm": "record3rm",
  "5rm": "record5rm",
  volume: "recordVolume",
  heaviest: "recordHeaviest",
};

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const next: Locale = stored === "ko" || stored === "en" ? stored : window.navigator.language.toLowerCase().startsWith("ko") ? "ko" : "en";
    setLocaleState(next);
    document.documentElement.lang = next;
  }, []);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
  };

  const value = useMemo<LocaleContextValue>(() => {
    const table = locale === "ko" ? ko : en;
    const t = (key: MessageKey, vars?: Record<string, string | number>) => fill(table[key], vars);
    return {
      locale,
      setLocale,
      t,
      exerciseName: (name) => (locale === "ko" ? (EXERCISE_KO[name] ?? name) : name),
      displayName: (name) => (name === "Athlete" ? t("athlete") : name),
      setLabel: (type) => t(SET_LABEL[type]),
      setShort: (type) => t(SET_SHORT[type]),
      categoryLabel: (category) => t(CATEGORY[category]),
      equipmentLabel: (equipment) => t(EQUIPMENT[equipment]),
      recordLabel: (type) => t(RECORD[type] ?? "recordE1rm"),
    };
  }, [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useI18n must be used within LocaleProvider");
  return value;
}
