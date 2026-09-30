export const APP_VERSION = "0.4.0";
export const SCHEMA_VERSION = 4;
export const MAX_SYNC_RETRIES = 8;

export type SyncStatus = "SYNCED" | "SYNCING" | "OFFLINE" | "PENDING" | "ERROR";

export type QueueType = "SET_UPSERT" | "SESSION_INSERT" | "WORKOUT_PERSIST" | "WORKOUT_FINISH" | "SESSION_DELETE" | "EXERCISE_REPLACE";

export interface QueueItem {
  id: string;
  type: QueueType;
  entityId: string;
  payload: unknown;
  createdAt: string;
  retryCount: number;
  status: "pending" | "error";
}

export function queueId(type: QueueType, entityId: string) {
  return `${type}:${entityId}`;
}

export function upsertQueue(items: QueueItem[], next: QueueItem) {
  const id = queueId(next.type, next.entityId);
  const rest = items.filter((item) => item.id !== id);
  return [...rest, { ...next, id }];
}

export function markRetry(item: QueueItem): QueueItem | null {
  const retryCount = item.retryCount + 1;
  if (retryCount > MAX_SYNC_RETRIES) return null;
  return { ...item, retryCount, status: "error" };
}

export function isTransientNetwork(error: unknown) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const message = error instanceof Error ? error.message : "";
  return /failed to fetch|network|offline/i.test(message);
}

export function remainingSeconds(endsAt: number, now: number) {
  if (!Number.isFinite(endsAt) || !Number.isFinite(now)) return 0;
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}
