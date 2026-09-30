/** Approximate UI mapping. Not a physiological identity. */
export function rpeToRir(rpe: number) {
  return Math.max(0, Math.min(4, Math.round(10 - rpe)));
}

export function rirToRpe(rir: number) {
  return Math.max(6, Math.min(10, 10 - rir));
}

export function effortRpe(set: { rpe?: number | null; rir?: number | null }) {
  if (set.rpe != null && Number.isFinite(set.rpe)) return set.rpe;
  if (set.rir != null && Number.isFinite(set.rir)) return rirToRpe(set.rir);
  return null;
}
