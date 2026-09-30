/** Nearest plate. Exact midpoints round down so a tie does not add load. */
export function roundToIncrement(weight: number, increment: number) {
  if (!Number.isFinite(weight)) return 0;
  if (!Number.isFinite(increment) || increment <= 0) return Math.round(weight * 1000) / 1000;
  const scale = 1000;
  const value = Math.round(weight * scale);
  const step = Math.round(increment * scale);
  const units = value / step;
  const lower = Math.floor(units);
  const fraction = units - lower;
  const picked = fraction > 0.5 + 1e-9 ? lower + 1 : lower;
  return Math.round(picked * step) / scale;
}
