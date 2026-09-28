import type { PersistedState } from "@/lib/types";

export const STORAGE_KEY = "forge.v1";

export function loadState(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (!parsed?.profile || !Array.isArray(parsed.history) || !Array.isArray(parsed.routines)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveState(state: PersistedState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode or a full disk should not block logging in memory.
  }
}

export function clearState() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

const ACTIVE_BACKUP_KEY = "iron-log.active.v1";

export interface ActiveBackup {
  userId: string;
  savedAt: string;
  workout: import("@/lib/types").ActiveWorkout;
}

export function loadActiveBackup(): ActiveBackup | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_BACKUP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveBackup;
    if (!parsed?.userId || !parsed.workout?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveActiveBackup(backup: ActiveBackup) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACTIVE_BACKUP_KEY, JSON.stringify(backup));
  } catch {
    // The in-memory workout still exists if storage is unavailable.
  }
}

export function clearActiveBackup() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACTIVE_BACKUP_KEY);
}

export function migrationChoice(userId: string) {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(`iron-log.migration.${userId}`);
  return value === "imported" || value === "skipped" ? value : null;
}

export function setMigrationChoice(userId: string, choice: "imported" | "skipped") {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`iron-log.migration.${userId}`, choice);
}
