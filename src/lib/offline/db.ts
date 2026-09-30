import { queueId, type QueueItem } from "@/lib/offline/model";
import type { ActiveWorkout, CompletedWorkout } from "@/lib/types";

const DB_NAME = "iron-log-offline";
const DB_VERSION = 1;

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("active")) db.createObjectStore("active");
      if (!db.objectStoreNames.contains("queue")) db.createObjectStore("queue");
      if (!db.objectStoreNames.contains("finished")) db.createObjectStore("finished");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineWorkout(userId: string, workout: ActiveWorkout) {
  const db = await openDb();
  const tx = db.transaction("active", "readwrite");
  tx.objectStore("active").put({ userId, savedAt: new Date().toISOString(), workout }, userId);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadOfflineWorkout(userId: string): Promise<ActiveWorkout | null> {
  const db = await openDb();
  const value = await requestToPromise<{ workout?: ActiveWorkout } | undefined>(db.transaction("active").objectStore("active").get(userId));
  db.close();
  return value?.workout ?? null;
}

export async function clearOfflineWorkout(userId: string) {
  const db = await openDb();
  const tx = db.transaction("active", "readwrite");
  tx.objectStore("active").delete(userId);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function readQueue(): Promise<QueueItem[]> {
  const db = await openDb();
  const rows = await requestToPromise<QueueItem[]>(db.transaction("queue").objectStore("queue").getAll());
  db.close();
  return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function writeQueueItem(item: QueueItem) {
  const db = await openDb();
  const tx = db.transaction("queue", "readwrite");
  tx.objectStore("queue").put({ ...item, id: queueId(item.type, item.entityId) }, queueId(item.type, item.entityId));
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function deleteQueueItem(id: string) {
  const db = await openDb();
  const tx = db.transaction("queue", "readwrite");
  tx.objectStore("queue").delete(id);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function savePendingFinish(workout: CompletedWorkout) {
  const db = await openDb();
  const tx = db.transaction("finished", "readwrite");
  tx.objectStore("finished").put(workout, workout.id);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadPendingFinish(id: string): Promise<CompletedWorkout | null> {
  const db = await openDb();
  const value = await requestToPromise<CompletedWorkout | undefined>(db.transaction("finished").objectStore("finished").get(id));
  db.close();
  return value ?? null;
}

export async function clearPendingFinish(id: string) {
  const db = await openDb();
  const tx = db.transaction("finished", "readwrite");
  tx.objectStore("finished").delete(id);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
