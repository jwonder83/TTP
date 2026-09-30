import { roundToIncrement } from "@/lib/training/rounding";

export function calculateBackoffWeight(topWeight: number, percentage: number, increment: number) {
  if (topWeight <= 0 || percentage <= 0) return 0;
  const raw = topWeight * (percentage / 100);
  return roundToIncrement(raw, increment);
}
