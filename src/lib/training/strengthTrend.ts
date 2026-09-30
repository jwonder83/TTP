import { E1RM_NOISE_PERCENT, TREND_SESSION_COUNT } from "@/lib/training/config";
import { sessionE1rm } from "@/lib/training/plateauDetector";
import type { LoggedSession, StrengthDirection } from "@/lib/training/types";

export function strengthSeries(sessionsOldestFirst: LoggedSession[]) {
  return sessionsOldestFirst.map(sessionE1rm).filter((value) => value > 0).slice(-TREND_SESSION_COUNT);
}

/** Least-squares slope across the series. Ignores a single noisy jump. */
export function strengthTrend(sessionsNewestFirst: LoggedSession[]): {
  direction: StrengthDirection;
  changePercent: number;
  series: number[];
} | null {
  const series = strengthSeries([...sessionsNewestFirst].reverse());
  if (series.length < 4) return null;
  const n = series.length;
  const meanX = (n - 1) / 2;
  const meanY = series.reduce((sum, value) => sum + value, 0) / n;
  let num = 0;
  let den = 0;
  series.forEach((value, index) => {
    num += (index - meanX) * (value - meanY);
    den += (index - meanX) ** 2;
  });
  const slope = den === 0 ? 0 : num / den;
  const start = meanY - slope * meanX;
  const end = start + slope * (n - 1);
  const changePercent = start <= 0 ? 0 : ((end - start) / start) * 100;
  const direction: StrengthDirection =
    changePercent > E1RM_NOISE_PERCENT ? "TRENDING_UP" : changePercent < -E1RM_NOISE_PERCENT ? "TRENDING_DOWN" : "STABLE";
  return { direction, changePercent, series };
}
