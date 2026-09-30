import { roundToIncrement } from "@/lib/training/rounding";

export function weightFromPercentage(estimated1rm: number, percent: number, increment: number) {
  if (!Number.isFinite(estimated1rm) || estimated1rm <= 0) return null;
  if (!Number.isFinite(percent) || percent <= 0) return null;
  return roundToIncrement((estimated1rm * percent) / 100, increment);
}
