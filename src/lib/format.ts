import type { Equipment, ExerciseCategory, SetType, Unit } from "@/lib/types";

export function uid(prefix = "id") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function uuid() {
  return crypto.randomUUID();
}

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function roundTo(value: number, step: number) {
  if (step <= 0) return value;
  const rounded = Math.round(value / step) * step;
  return Math.round(rounded * 1000) / 1000;
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addDaysKey(dateKey: string, days: number) {
  return toDateKey(addDays(parseDateKey(dateKey), days));
}

export const LB_PER_KG = 2.2046226218;

export function kgToDisplay(kg: number, unit: Unit) {
  const value = unit === "lb" ? kg * LB_PER_KG : kg;
  return Math.round(value * 10) / 10;
}

export function displayToKg(value: number, unit: Unit) {
  const kg = unit === "lb" ? value / LB_PER_KG : value;
  return Math.round(kg * 1000) / 1000;
}

export function formatNumber(value: number, digits = 1) {
  const factor = 10 ** digits;
  const rounded = Math.round(value * factor) / factor;
  if (Number.isInteger(rounded)) return rounded.toLocaleString("en-US");
  return rounded.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatWeight(kg: number, unit: Unit, options?: { prefixPlus?: boolean }) {
  const display = kgToDisplay(kg, unit);
  const text = formatNumber(display, 1);
  const prefix = options?.prefixPlus && kg > 0 ? "+" : "";
  return `${prefix}${text}`;
}

export function formatRoundedWeight(kg: number, unit: Unit) {
  return Math.round(kgToDisplay(kg, unit)).toLocaleString("en-US");
}

export function formatVolume(kg: number, unit: Unit) {
  const display = unit === "lb" ? kg * LB_PER_KG : kg;
  return Math.round(display).toLocaleString("en-US");
}

export function formatEditValue(value: number) {
  if (!Number.isFinite(value)) return "";
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function weekdayShort(dateKey: string, locale: "ko" | "en" = "en") {
  const tag = locale === "ko" ? "ko-KR" : "en-US";
  const label = parseDateKey(dateKey).toLocaleDateString(tag, { weekday: "short" });
  return locale === "ko" ? label : label.toUpperCase();
}

export function monthLabel(date: Date, locale: "ko" | "en" = "en") {
  return date.toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", { month: "long", year: "numeric" });
}

export function shortMonthDay(dateKey: string, locale: "ko" | "en" = "en") {
  const label = parseDateKey(dateKey).toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", { month: "short", day: "numeric" });
  return locale === "ko" ? label : label.toUpperCase();
}

export function greeting(date: Date, locale: "ko" | "en" = "en") {
  const hour = date.getHours();
  if (locale === "ko") {
    if (hour < 12) return "좋은 아침이에요";
    if (hour < 18) return "좋은 오후예요";
    return "좋은 저녁이에요";
  }
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

export function formatClock(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

export function formatTimer(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatDurationMinutes(totalSeconds: number, locale: "ko" | "en" = "en") {
  const minutes = Math.max(1, Math.round(totalSeconds / 60));
  return locale === "ko" ? `${minutes}분` : `${minutes} min`;
}

export function weightStep(equipment: Equipment) {
  if (equipment === "dumbbell") return 1;
  if (equipment === "bodyweight") return 1.25;
  return 2.5;
}

export function isAddedLoad(equipment: Equipment) {
  return equipment === "bodyweight";
}

export const SET_TYPE_META: Record<SetType, { label: string; short: string }> = {
  warmup: { label: "Warm-up", short: "WARMUP" },
  normal: { label: "Normal", short: "NORMAL" },
  top: { label: "Top Set", short: "TOP" },
  backoff: { label: "Back-off", short: "BACKOFF" },
  drop: { label: "Drop Set", short: "DROP" },
  amrap: { label: "AMRAP", short: "AMRAP" },
};

export const SET_TYPE_ORDER: SetType[] = ["warmup", "normal", "top", "backoff", "drop", "amrap"];

export const CATEGORY_ORDER: ExerciseCategory[] = ["chest", "back", "leg", "shoulder", "arms"];

export const CATEGORY_LABEL: Record<ExerciseCategory, string> = {
  chest: "Chest",
  back: "Back",
  leg: "Leg",
  shoulder: "Shoulder",
  arms: "Arms",
};

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  barbell: "Barbell",
  dumbbell: "Dumbbell",
  cable: "Cable",
  machine: "Machine",
  bodyweight: "Bodyweight",
  other: "Other",
};

export const RECORD_LABEL: Record<string, string> = {
  e1rm: "Est. 1RM",
  "1rm": "1RM",
  "3rm": "3RM",
  "5rm": "5RM",
  volume: "Best Volume",
  heaviest: "Heaviest",
};
