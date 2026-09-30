"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { currentUser, signOut as authSignOut } from "@/lib/api/auth";
import { saveBodyWeight } from "@/lib/api/bodyWeight";
import { loadAccount } from "@/lib/api/bootstrap";
import { friendlyError, logError } from "@/lib/api/errors";
import type { MessageKey } from "@/lib/i18n/messages";
import { insertCustomExercise } from "@/lib/api/exercises";
import { hasUserLocalData, importLocalState } from "@/lib/api/migration";
import { saveProfile } from "@/lib/api/profiles";
import { fetchRecords } from "@/lib/api/progress";
import { deleteRoutine as removeRoutine, saveRoutine as persistRoutine } from "@/lib/api/routines";
import { mergeWorkouts } from "@/lib/api/rows";
import { saveExerciseNote, saveProgram, type TrainingProgram } from "@/lib/api/programs";
import { saveGoal, saveReadiness, saveRecommendation, saveTrainingConfig } from "@/lib/api/training";
import { clearOfflineWorkout, loadOfflineWorkout, saveOfflineWorkout, writeQueueItem } from "@/lib/offline/db";
import { isTransientNetwork, queueId, type SyncStatus } from "@/lib/offline/model";
import { rememberFinish, runSync } from "@/lib/offline/runSync";
import { sessionFromProgramExercise } from "@/lib/program/buildWorkout";
import {
  cancelWorkout,
  completeWorkout,
  deleteSession,
  deleteSet,
  fetchCompletedBetween,
  fetchCompletedPage,
  fetchExerciseWorkouts,
  insertPrs,
  insertSession,
  insertSet,
  monthRange,
  persistActiveWorkout,
  updateSessionExercise,
  upsertSets,
} from "@/lib/api/workouts";
import { prHitsAgainstRecords, workoutStats } from "@/lib/calculations";
import { toDateKey, uuid } from "@/lib/format";
import { clearActiveBackup, loadActiveBackup, loadState, migrationChoice, saveActiveBackup, setMigrationChoice } from "@/lib/storage";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";
import type {
  ActiveWorkout,
  BodyWeightEntry,
  ChromeMode,
  CompletedWorkout,
  Exercise,
  FinishResult,
  PersonalRecord,
  PrHit,
  Profile,
  RecentPr,
  Routine,
  WorkoutSet,
} from "@/lib/types";
import { coachSessions, resolveConfig } from "@/lib/training/history";
import { recommendExercise } from "@/lib/training/recommendationEngine";
import { blankSet, createActiveWorkout, createSessionExercise, type ActivePlanOptions } from "@/lib/workout-plan";
import type { TrainingConfig, TrainingGoal } from "@/lib/training/types";

interface RemoteState {
  userId: string;
  profile: Profile;
  exercises: Exercise[];
  routines: Routine[];
  history: CompletedWorkout[];
  activeWorkout: ActiveWorkout | null;
  bodyWeights: BodyWeightEntry[];
  records: PersonalRecord[];
  latestSetPr: RecentPr | null;
  trainingConfigs: TrainingConfig[];
  goals: TrainingGoal[];
  programs: TrainingProgram[];
  exerciseNotes: Array<{ exerciseId: string; body: string }>;
}

interface AppStateContextValue {
  ready: boolean;
  configured: boolean;
  profile: Profile;
  exercises: Exercise[];
  routines: Routine[];
  history: CompletedWorkout[];
  activeWorkout: ActiveWorkout | null;
  bodyWeights: BodyWeightEntry[];
  records: PersonalRecord[];
  latestSetPr: RecentPr | null;
  trainingConfigs: TrainingConfig[];
  goals: TrainingGoal[];
  programs: TrainingProgram[];
  exerciseNotes: Array<{ exerciseId: string; body: string }>;
  syncStatus: SyncStatus;
  chrome: ChromeMode;
  setChrome: (chrome: ChromeMode) => void;
  saveError: MessageKey | null;
  historyHasMore: boolean;
  loadMoreHistory: () => Promise<void>;
  ensureMonth: (year: number, month: number) => Promise<void>;
  loadExerciseHistory: (exerciseId: string, sinceDate: string) => Promise<CompletedWorkout[]>;
  migrationOffer: boolean;
  migrationBusy: boolean;
  importLocalData: () => Promise<void>;
  skipMigration: () => void;
  updateProfile: (patch: Partial<Profile>) => void;
  logBodyWeight: (weightKg: number, date?: string) => Promise<void>;
  addCustomExercise: (input: Omit<Exercise, "id" | "isCustom">) => Promise<string>;
  saveRoutine: (routine: Routine) => Promise<void>;
  deleteRoutine: (routineId: string) => Promise<void>;
  startWorkout: (routineId: string, options?: ActivePlanOptions) => Promise<boolean>;
  saveTrainingConfig: (config: TrainingConfig) => Promise<void>;
  saveGoal: (goal: TrainingGoal) => Promise<void>;
  saveProgram: (program: TrainingProgram) => Promise<void>;
  saveExerciseNote: (exerciseId: string, body: string) => Promise<void>;
  startProgramDay: (programId: string, dayId: string) => Promise<boolean>;
  replaceWorkoutExercise: (sessionId: string, exerciseId: string) => Promise<void>;
  updateSet: (sessionExerciseId: string, setId: string, patch: Partial<WorkoutSet>) => void;
  addSet: (sessionExerciseId: string) => Promise<void>;
  removeLastSet: (sessionExerciseId: string) => Promise<void>;
  addWorkoutExercise: (exerciseId: string) => Promise<void>;
  removeWorkoutExercise: (sessionExerciseId: string) => Promise<void>;
  finishWorkout: () => Promise<FinishResult | null>;
  discardWorkout: () => Promise<void>;
  signOut: () => Promise<void>;
}

const EMPTY_PROFILE: Profile = {
  name: "Athlete",
  heightCm: 0,
  unit: "kg",
  theme: "dark",
  compoundRestSec: 180,
  accessoryRestSec: 90,
  weeklyGoal: 4,
  effortScale: "rpe",
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

function applyHits(records: PersonalRecord[], hits: PrHit[]) {
  const next = [...records];
  for (const hit of hits) {
    const record: PersonalRecord = {
      exerciseId: hit.exerciseId,
      recordType: hit.recordType,
      value: hit.value,
      weight: hit.weight,
      reps: hit.reps,
      date: hit.date,
    };
    const index = next.findIndex((item) => item.exerciseId === hit.exerciseId && item.recordType === hit.recordType);
    if (index === -1) next.push(record);
    else if (hit.value > next[index].value) next[index] = record;
  }
  return next;
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<RemoteState | null>(null);
  const [ready, setReady] = useState(false);
  const [chrome, setChrome] = useState<ChromeMode>("default");
  const [saveError, setSaveError] = useState<MessageKey | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("SYNCED");
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [migrationOffer, setMigrationOffer] = useState(false);
  const [migrationBusy, setMigrationBusy] = useState(false);
  const stateRef = useRef<RemoteState | null>(null);
  const workoutRef = useRef<ActiveWorkout | null>(null);
  const userIdRef = useRef("");
  const profileRef = useRef<Profile>(EMPTY_PROFILE);
  const savedProfileRef = useRef<Profile>(EMPTY_PROFILE);
  const pendingSets = useRef(new Map<string, { workoutExerciseId: string; set: WorkoutSet }>());
  const saveTimer = useRef<number | null>(null);
  const profileTimer = useRef<number | null>(null);
  const historyOffsetRef = useRef(0);
  const loadedMonthsRef = useRef(new Set<string>());
  const loadingMoreRef = useRef(false);
  const runRef = useRef(0);
  const finishRef = useRef<Promise<FinishResult | null> | null>(null);
  const loadedRef = useRef(false);
  stateRef.current = state;

  const report = useCallback((scope: string, error: unknown) => {
    logError(scope, error);
    setSaveError(friendlyError(error));
  }, []);

  const flushSets = useCallback(async () => {
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const batch = [...pendingSets.current.values()];
    pendingSets.current.clear();
    if (batch.length === 0) return;
    try {
      await upsertSets(batch);
      setSaveError(null);
      setSyncStatus("SYNCED");
    } catch (error) {
      await Promise.all(
        batch.map((item) =>
          writeQueueItem({
            id: queueId("SET_UPSERT", item.set.id),
            type: "SET_UPSERT",
            entityId: item.set.id,
            payload: item,
            createdAt: new Date().toISOString(),
            retryCount: 0,
            status: "pending",
          }),
        ),
      );
      if (isTransientNetwork(error)) setSyncStatus(typeof navigator !== "undefined" && navigator.onLine === false ? "OFFLINE" : "PENDING");
      else report("set-save", error);
    }
  }, [report]);

  const scheduleSet = useCallback(
    (workoutExerciseId: string, set: WorkoutSet) => {
      pendingSets.current.set(set.id, { workoutExerciseId, set });
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        void flushSets();
      }, 450);
    },
    [flushSets],
  );

  const commitWorkout = useCallback((workout: ActiveWorkout | null) => {
    workoutRef.current = workout;
    setState((current) => (current ? { ...current, activeWorkout: workout } : current));
  }, []);

  const bootstrap = useCallback(
    async (force = false) => {
      const run = ++runRef.current;
      const stale = () => run !== runRef.current;
      if (!hasSupabaseConfig()) {
        setReady(true);
        return;
      }
      try {
        const user = await currentUser();
        if (stale()) return;
        if (!user) {
          userIdRef.current = "";
          loadedRef.current = false;
          workoutRef.current = null;
          setState(null);
          setReady(true);
          return;
        }
        if (!force && userIdRef.current === user.id && stateRef.current) {
          setReady(true);
          return;
        }
        const account = await loadAccount(user);
        if (stale()) return;
        let active = account.active;
        const backup = loadActiveBackup();
        if (backup && backup.userId === user.id) {
          const newer = Boolean(active && backup.workout.id === active.workout.id && backup.savedAt > active.updatedAt);
          const missing = !active;
          if (newer || missing) {
            try {
              await persistActiveWorkout(user.id, backup.workout);
              active = { workout: backup.workout, updatedAt: backup.savedAt };
            } catch (error) {
              report("workout-restore", error);
              if (missing) active = { workout: backup.workout, updatedAt: backup.savedAt };
            }
          }
        }
        if (stale()) return;
        if (!active) {
          const stored = await loadOfflineWorkout(user.id).catch(() => null);
          if (stored) active = { workout: stored, updatedAt: new Date().toISOString() };
        }
        const today = new Date();
        loadedMonthsRef.current = new Set([`${today.getFullYear()}-${today.getMonth()}`]);
        historyOffsetRef.current = account.historyPageCount;
        userIdRef.current = user.id;
        workoutRef.current = active?.workout ?? null;
        profileRef.current = account.profile;
        savedProfileRef.current = account.profile;
        loadedRef.current = true;
        setHistoryHasMore(account.hasMore);
        setState({
          userId: user.id,
          profile: account.profile,
          exercises: account.exercises,
          routines: account.routines,
          history: account.history,
          activeWorkout: active?.workout ?? null,
          bodyWeights: account.bodyWeights,
          records: account.records,
          latestSetPr: account.latestSetPr,
          trainingConfigs: account.trainingConfigs,
          goals: account.goals,
          programs: account.programs,
          exerciseNotes: account.exerciseNotes,
        });
        const local = loadState();
        setMigrationOffer(Boolean(local && hasUserLocalData(local) && !migrationChoice(user.id)));
        if (typeof window !== "undefined") window.localStorage.setItem("iron-log.theme", account.profile.theme);
        setReady(true);
      } catch (error) {
        if (stale()) return;
        report("bootstrap", error);
        setReady(true);
      }
    },
    [report],
  );

  useEffect(() => {
    void bootstrap(false);
    if (!hasSupabaseConfig()) return;
    const supabase = createClient();
    const { data } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === "SIGNED_IN") {
        window.setTimeout(() => void bootstrap(false), 0);
      }
      if (event === "SIGNED_OUT") {
        window.setTimeout(() => {
          userIdRef.current = "";
          loadedRef.current = false;
          workoutRef.current = null;
          setState(null);
          setReady(true);
        }, 0);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [bootstrap]);

  useEffect(() => {
    const sync = () => {
      const userId = userIdRef.current;
      if (!userId) return;
      setSyncStatus("SYNCING");
      void runSync(userId).then((status) => setSyncStatus(status));
    };
    window.addEventListener("online", sync);
    const onOffline = () => setSyncStatus("OFFLINE");
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    const onHide = () => void flushSets();
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [flushSets]);

  useEffect(() => {
    if (!loadedRef.current || !state?.userId) return;
    if (state.activeWorkout) {
      saveActiveBackup({ userId: state.userId, savedAt: new Date().toISOString(), workout: state.activeWorkout });
      void saveOfflineWorkout(state.userId, state.activeWorkout).catch(() => undefined);
      return;
    }
    clearActiveBackup();
    void clearOfflineWorkout(state.userId).catch(() => undefined);
  }, [state?.activeWorkout, state?.userId]);

  useEffect(() => {
    if (!state) return;
    const apply = () => {
      const preference = state.profile.theme;
      const resolved =
        preference === "system"
          ? window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
          : preference;
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "light" ? "#f5f5f6" : "#0e0e11");
    };
    apply();
    if (state.profile.theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [state]);

  const loadMoreHistory = useCallback(async () => {
    if (loadingMoreRef.current || !historyHasMore) return;
    loadingMoreRef.current = true;
    try {
      const page = await fetchCompletedPage(historyOffsetRef.current);
      historyOffsetRef.current += page.workouts.length;
      setHistoryHasMore(page.hasMore);
      setState((current) => (current ? { ...current, history: mergeWorkouts([current.history, page.workouts]) } : current));
      setSaveError(null);
    } catch (error) {
      report("history", error);
    } finally {
      loadingMoreRef.current = false;
    }
  }, [historyHasMore, report]);

  const ensureMonth = useCallback(
    async (year: number, month: number) => {
      const key = `${year}-${month}`;
      if (loadedMonthsRef.current.has(key) || !userIdRef.current) return;
      loadedMonthsRef.current.add(key);
      try {
        const range = monthRange(year, month);
        const workouts = await fetchCompletedBetween(range.startIso, range.endIso);
        setState((current) => (current ? { ...current, history: mergeWorkouts([current.history, workouts]) } : current));
      } catch (error) {
        loadedMonthsRef.current.delete(key);
        report("history-month", error);
      }
    },
    [report],
  );

  const loadExerciseHistory = useCallback(async (exerciseId: string, sinceDate: string) => {
    const since = new Date(`${sinceDate}T00:00:00`).toISOString();
    return fetchExerciseWorkouts(exerciseId, since);
  }, []);

  const skipMigration = useCallback(() => {
    if (userIdRef.current) setMigrationChoice(userIdRef.current, "skipped");
    setMigrationOffer(false);
  }, []);

  const importLocalData = useCallback(async () => {
    const local = loadState();
    if (!local || !userIdRef.current) return;
    setMigrationBusy(true);
    try {
      await importLocalState(userIdRef.current, local);
      setMigrationChoice(userIdRef.current, "imported");
      setMigrationOffer(false);
      setSaveError(null);
      await bootstrap(true);
    } catch (error) {
      report("migration", error);
    } finally {
      setMigrationBusy(false);
    }
  }, [bootstrap, report]);

  const signOut = useCallback(async () => {
    try {
      await flushSets();
      clearActiveBackup();
      await authSignOut();
      userIdRef.current = "";
      loadedRef.current = false;
      workoutRef.current = null;
      setState(null);
      window.location.href = "/login";
    } catch (error) {
      report("sign-out", error);
    }
  }, [flushSets, report]);

  const updateProfile = useCallback(
    (patch: Partial<Profile>) => {
      if (!stateRef.current) return;
      const profile = { ...profileRef.current, ...patch };
      profileRef.current = profile;
      setState((current) => (current ? { ...current, profile } : current));
      if (profileTimer.current) window.clearTimeout(profileTimer.current);
      profileTimer.current = window.setTimeout(() => {
        const next = profileRef.current;
        const userId = userIdRef.current;
        if (!userId) return;
        void saveProfile(userId, next)
          .then(() => {
            savedProfileRef.current = next;
            setSaveError(null);
          })
          .catch((error) => {
            profileRef.current = savedProfileRef.current;
            setState((snapshot) => (snapshot ? { ...snapshot, profile: savedProfileRef.current } : snapshot));
            report("profile", error);
          });
      }, 450);
    },
    [report],
  );

  const value = useMemo<AppStateContextValue>(() => {
    const profile = state?.profile ?? EMPTY_PROFILE;
    return {
      ready,
      configured: hasSupabaseConfig(),
      profile,
      exercises: state?.exercises ?? [],
      routines: state?.routines ?? [],
      history: state?.history ?? [],
      activeWorkout: state?.activeWorkout ?? null,
      bodyWeights: state?.bodyWeights ?? [],
      records: state?.records ?? [],
      latestSetPr: state?.latestSetPr ?? null,
      trainingConfigs: state?.trainingConfigs ?? [],
      goals: state?.goals ?? [],
      programs: state?.programs ?? [],
      exerciseNotes: state?.exerciseNotes ?? [],
      syncStatus,
      chrome,
      setChrome,
      saveError,
      historyHasMore,
      loadMoreHistory,
      ensureMonth,
      loadExerciseHistory,
      migrationOffer,
      migrationBusy,
      importLocalData,
      skipMigration,
      updateProfile,
      signOut,
      logBodyWeight: async (weightKg, date = toDateKey(new Date())) => {
        const userId = userIdRef.current;
        const current = stateRef.current;
        if (!userId || !current) return;
        const optimistic: BodyWeightEntry = { id: uuid(), weight: weightKg, date };
        const without = current.bodyWeights.filter((entry) => entry.date !== date);
        without.push(optimistic);
        without.sort((a, b) => a.date.localeCompare(b.date));
        setState({ ...current, bodyWeights: without });
        try {
          const saved = await saveBodyWeight(userId, weightKg, date);
          setState((snapshot) => {
            if (!snapshot) return snapshot;
            const next = snapshot.bodyWeights.filter((entry) => entry.date !== date);
            next.push(saved);
            next.sort((a, b) => a.date.localeCompare(b.date));
            return { ...snapshot, bodyWeights: next };
          });
          setSaveError(null);
        } catch (error) {
          setState((snapshot) => (snapshot ? { ...snapshot, bodyWeights: current.bodyWeights } : snapshot));
          report("body-weight", error);
        }
      },
      addCustomExercise: async (input) => {
        const userId = userIdRef.current;
        if (!userId) throw new Error("Not signed in");
        const exercise: Exercise = { ...input, id: uuid(), name: input.name.trim(), isCustom: true };
        try {
          await insertCustomExercise(userId, exercise);
          setState((current) => (current ? { ...current, exercises: [...current.exercises, exercise] } : current));
          setSaveError(null);
          return exercise.id;
        } catch (error) {
          report("exercise", error);
          throw error;
        }
      },
      saveRoutine: async (routine) => {
        const userId = userIdRef.current;
        if (!userId) throw new Error("Not signed in");
        try {
          const saved = await persistRoutine(userId, routine);
          setState((current) => {
            if (!current) return current;
            const exists = current.routines.some((item) => item.id === routine.id || item.id === saved.id);
            return {
              ...current,
              routines: exists
                ? current.routines.map((item) => (item.id === routine.id || item.id === saved.id ? saved : item))
                : [saved, ...current.routines],
            };
          });
          setSaveError(null);
        } catch (error) {
          report("routine", error);
          throw error;
        }
      },
      deleteRoutine: async (routineId) => {
        const current = stateRef.current;
        if (!current) return;
        setState({ ...current, routines: current.routines.filter((routine) => routine.id !== routineId) });
        try {
          await removeRoutine(routineId);
          setSaveError(null);
        } catch (error) {
          setState((snapshot) => (snapshot ? { ...snapshot, routines: current.routines } : snapshot));
          report("routine-delete", error);
        }
      },
      startWorkout: async (routineId, options) => {
        const current = stateRef.current;
        if (!current || workoutRef.current || !userIdRef.current) return false;
        const routine = current.routines.find((item) => item.id === routineId);
        if (!routine) return false;
        const activeWorkout = createActiveWorkout(routine, current.exercises, current.history, new Date(), {
          ...options,
          configs: current.trainingConfigs,
        });
        commitWorkout(activeWorkout);
        try {
          await persistActiveWorkout(userIdRef.current, activeWorkout);
          if (options?.readiness) await saveReadiness(userIdRef.current, activeWorkout.id, options.readiness);
          try {
            const cleared = current.trainingConfigs.filter((config) => config.pendingDeload);
            if (cleared.length > 0) {
              const nextConfigs = current.trainingConfigs.map((config) => (config.pendingDeload ? { ...config, pendingDeload: false } : config));
              setState((snapshot) => (snapshot ? { ...snapshot, trainingConfigs: nextConfigs } : snapshot));
              await Promise.all(cleared.map((config) => saveTrainingConfig(userIdRef.current, { ...config, pendingDeload: false })));
            }
            await Promise.all(
              routine.exercises.map(async (item) => {
                const exercise = current.exercises.find((entry) => entry.id === item.exerciseId);
                if (!exercise) return;
                const recommendation = recommendExercise({
                  config: resolveConfig(current.trainingConfigs, exercise, item.defaultReps),
                  sessionsNewestFirst: coachSessions(current.history, exercise.id),
                  readiness: options?.readiness,
                });
                if (recommendation.status === "NO_HISTORY") return;
                await saveRecommendation(userIdRef.current, activeWorkout.id, recommendation, options?.useRecovery ? false : null);
              }),
            );
          } catch (error) {
            report("recommendation", error);
          }
          setSaveError(null);
          return true;
        } catch (error) {
          commitWorkout(null);
          report("workout-start", error);
          return false;
        }
      },
      saveTrainingConfig: async (config) => {
        const current = stateRef.current;
        if (!current || !userIdRef.current) return;
        const next = current.trainingConfigs.some((item) => item.exerciseId === config.exerciseId)
          ? current.trainingConfigs.map((item) => (item.exerciseId === config.exerciseId ? config : item))
          : [...current.trainingConfigs, config];
        setState({ ...current, trainingConfigs: next });
        try {
          await saveTrainingConfig(userIdRef.current, config);
          setSaveError(null);
        } catch (error) {
          setState((snapshot) => (snapshot ? { ...snapshot, trainingConfigs: current.trainingConfigs } : snapshot));
          report("training-config", error);
        }
      },
      saveGoal: async (goal) => {
        const current = stateRef.current;
        if (!current || !userIdRef.current) return;
        const next = current.goals.some((item) => item.id === goal.id)
          ? current.goals.map((item) => (item.id === goal.id ? goal : item))
          : [...current.goals, goal];
        setState({ ...current, goals: next });
        try {
          await saveGoal(userIdRef.current, goal);
          setSaveError(null);
        } catch (error) {
          setState((snapshot) => (snapshot ? { ...snapshot, goals: current.goals } : snapshot));
          report("goal", error);
        }
      },
      updateSet: (sessionExerciseId, setId, patch) => {
        const current = workoutRef.current;
        const exercise = current?.exercises.find((item) => item.id === sessionExerciseId);
        const set = exercise?.sets.find((item) => item.id === setId);
        if (!current || !exercise || !set) return;
        const nextSet = { ...set, ...patch };
        const exercises = current.exercises.map((item) =>
          item.id === sessionExerciseId
            ? { ...item, sets: item.sets.map((entry) => (entry.id === setId ? nextSet : entry)) }
            : item,
        );
        commitWorkout({ ...current, exercises });
        scheduleSet(exercise.id, nextSet);
      },
      addSet: async (sessionExerciseId) => {
        const current = workoutRef.current;
        if (!current) return;
        const previous = current;
        const exercises = current.exercises.map((exercise) => {
          if (exercise.id !== sessionExerciseId) return exercise;
          const next = blankSet(exercise.sets[exercise.sets.length - 1], exercise.sets.length + 1);
          return { ...exercise, sets: [...exercise.sets, next] };
        });
        const added = exercises.find((exercise) => exercise.id === sessionExerciseId)?.sets.at(-1);
        commitWorkout({ ...current, exercises });
        if (!added) return;
        try {
          await insertSet(sessionExerciseId, added);
          setSaveError(null);
        } catch (error) {
          commitWorkout(previous);
          report("set-add", error);
        }
      },
      removeLastSet: async (sessionExerciseId) => {
        const current = workoutRef.current;
        if (!current) return;
        const exercise = current.exercises.find((item) => item.id === sessionExerciseId);
        if (!exercise || exercise.sets.length <= 1) return;
        const removed = exercise.sets[exercise.sets.length - 1];
        const previous = current;
        pendingSets.current.delete(removed.id);
        const exercises = current.exercises.map((item) => {
          if (item.id !== sessionExerciseId) return item;
          return {
            ...item,
            sets: item.sets.slice(0, -1).map((set, index) => ({ ...set, setNumber: index + 1 })),
          };
        });
        commitWorkout({ ...current, exercises });
        try {
          await deleteSet(removed.id);
          const renumbered = exercises.find((item) => item.id === sessionExerciseId)?.sets ?? [];
          await upsertSets(renumbered.map((set) => ({ workoutExerciseId: sessionExerciseId, set })));
          setSaveError(null);
        } catch (error) {
          commitWorkout(previous);
          report("set-remove", error);
        }
      },
      addWorkoutExercise: async (exerciseId) => {
        const current = stateRef.current;
        const workout = workoutRef.current;
        if (!current || !workout) return;
        const exercise = current.exercises.find((item) => item.id === exerciseId);
        if (!exercise || workout.exercises.some((item) => item.exerciseId === exerciseId)) return;
        const session = createSessionExercise(
          {
            id: uuid(),
            exerciseId,
            orderIndex: workout.exercises.length,
            defaultSets: exercise.kind === "compound" ? 5 : 3,
            defaultReps: exercise.kind === "compound" ? 5 : 10,
            restSeconds: exercise.kind === "compound" ? current.profile.compoundRestSec : current.profile.accessoryRestSec,
          },
          exercise,
          current.history,
          { configs: current.trainingConfigs },
        );
        const previous = workout;
        const next = { ...workout, exercises: [...workout.exercises, session] };
        commitWorkout(next);
        try {
          await insertSession(workout.id, session);
          setSaveError(null);
        } catch (error) {
          if (isTransientNetwork(error)) {
            await writeQueueItem({
              id: queueId("SESSION_INSERT", session.id),
              type: "SESSION_INSERT",
              entityId: session.id,
              payload: { workoutId: workout.id, session },
              createdAt: new Date().toISOString(),
              retryCount: 0,
              status: "pending",
            });
            setSyncStatus("PENDING");
            return;
          }
          commitWorkout(previous);
          report("exercise-add", error);
        }
      },
      removeWorkoutExercise: async (sessionExerciseId) => {
        const workout = workoutRef.current;
        if (!workout) return;
        const previous = workout;
        const exercises = workout.exercises
          .filter((exercise) => exercise.id !== sessionExerciseId)
          .map((exercise, index) => ({ ...exercise, orderIndex: index }));
        commitWorkout({ ...workout, exercises });
        try {
          await deleteSession(sessionExerciseId);
          setSaveError(null);
        } catch (error) {
          commitWorkout(previous);
          report("exercise-remove", error);
        }
      },
      finishWorkout: () => {
        if (finishRef.current) return finishRef.current;
        const run = (async () => {
          const current = stateRef.current;
          const active = workoutRef.current;
          if (!current || !active || !userIdRef.current) return null;
          await flushSets();
          const finishedAt = new Date().toISOString();
          const workout: CompletedWorkout = {
            id: active.id,
            routineId: active.routineId || null,
            routineName: active.routineName,
            date: toDateKey(new Date(active.startedAt)),
            startedAt: active.startedAt,
            finishedAt,
            exercises: active.exercises,
            programId: active.programId ?? null,
            programDayId: active.programDayId ?? null,
          };
          try {
            const outcome = await completeWorkout(userIdRef.current, workout);
            const hits = outcome.alreadyFinished ? [] : prHitsAgainstRecords(current.records, workout);
            if (!outcome.alreadyFinished) await insertPrs(userIdRef.current, workout, hits);
            const latest = hits.find((hit) => hit.recordType === "e1rm" && hit.weight && hit.reps);
            workoutRef.current = null;
            clearActiveBackup();
            void clearOfflineWorkout(userIdRef.current);
            setState((snapshot) => {
              if (!snapshot) return snapshot;
              const history = snapshot.history.some((item) => item.id === workout.id) ? snapshot.history : [workout, ...snapshot.history];
              return {
                ...snapshot,
                history,
                activeWorkout: null,
                records: applyHits(snapshot.records, hits),
                latestSetPr:
                  latest && latest.weight && latest.reps
                    ? { exerciseId: latest.exerciseId, weight: latest.weight, reps: latest.reps, e1rm: latest.value, date: latest.date }
                    : snapshot.latestSetPr,
              };
            });
            setSaveError(null);
            const fresh = await fetchRecords().catch(() => null);
            if (fresh) {
              setState((snapshot) => (snapshot ? { ...snapshot, records: fresh.records, latestSetPr: fresh.latestSetPr ?? snapshot.latestSetPr } : snapshot));
            }
            return { workout, prs: hits, stats: outcome.stats ?? workoutStats(workout) };
          } catch (error) {
            if (!isTransientNetwork(error) || !userIdRef.current) {
              report("workout-finish", error);
              return null;
            }
            const hits = prHitsAgainstRecords(current.records, workout);
            await rememberFinish(workout);
            await writeQueueItem({
              id: queueId("WORKOUT_FINISH", workout.id),
              type: "WORKOUT_FINISH",
              entityId: workout.id,
              payload: { workout },
              createdAt: new Date().toISOString(),
              retryCount: 0,
              status: "pending",
            });
            workoutRef.current = null;
            clearActiveBackup();
            setSyncStatus("PENDING");
            setState((snapshot) => {
              if (!snapshot) return snapshot;
              const history = snapshot.history.some((item) => item.id === workout.id) ? snapshot.history : [workout, ...snapshot.history];
              return { ...snapshot, history, activeWorkout: null, records: applyHits(snapshot.records, hits) };
            });
            return { workout, prs: hits, stats: workoutStats(workout) };
          }
        })().finally(() => {
          finishRef.current = null;
        });
        finishRef.current = run;
        return run;
      },
      replaceWorkoutExercise: async (sessionId, exerciseId) => {
        const current = stateRef.current;
        const active = workoutRef.current;
        if (!current || !active) return;
        const next = {
          ...active,
          exercises: active.exercises.map((session) => (session.id === sessionId ? { ...session, exerciseId } : session)),
        };
        commitWorkout(next);
        try {
          await updateSessionExercise(sessionId, exerciseId);
          setSyncStatus("SYNCED");
        } catch (error) {
          if (!isTransientNetwork(error)) {
            report("replace", error);
            return;
          }
          await writeQueueItem({
            id: queueId("EXERCISE_REPLACE", sessionId),
            type: "EXERCISE_REPLACE",
            entityId: sessionId,
            payload: { sessionId, exerciseId },
            createdAt: new Date().toISOString(),
            retryCount: 0,
            status: "pending",
          });
          setSyncStatus(navigator.onLine ? "PENDING" : "OFFLINE");
        }
      },
      saveExerciseNote: async (exerciseId, body) => {
        const current = stateRef.current;
        if (!current || !userIdRef.current) return;
        const notes = current.exerciseNotes.some((item) => item.exerciseId === exerciseId)
          ? current.exerciseNotes.map((item) => (item.exerciseId === exerciseId ? { exerciseId, body } : item))
          : [...current.exerciseNotes, { exerciseId, body }];
        setState({ ...current, exerciseNotes: notes });
        try {
          await saveExerciseNote(userIdRef.current, exerciseId, body);
        } catch (error) {
          if (!isTransientNetwork(error)) report("note", error);
        }
      },
      saveProgram: async (program) => {
        const current = stateRef.current;
        if (!current || !userIdRef.current) return;
        const programs = current.programs.some((item) => item.id === program.id)
          ? current.programs.map((item) => (item.id === program.id ? program : item))
          : [program, ...current.programs];
        setState({ ...current, programs });
        try {
          await saveProgram(userIdRef.current, program);
        } catch (error) {
          report("program", error);
        }
      },
      startProgramDay: async (programId, dayId) => {
        const current = stateRef.current;
        if (!current || workoutRef.current || !userIdRef.current) return false;
        const program = current.programs.find((item) => item.id === programId);
        const day = program?.days.find((item) => item.id === dayId);
        if (!program || !day) return false;
        const exercises = day.exercises.flatMap((plan) => {
          const exercise = current.exercises.find((item) => item.id === plan.exerciseId);
          if (!exercise) return [];
          return [sessionFromProgramExercise(plan, exercise, current.history, current.trainingConfigs)];
        });
        const activeWorkout: ActiveWorkout = {
          id: uuid(),
          routineId: "",
          routineName: day.name,
          startedAt: new Date().toISOString(),
          exercises,
          programId: program.id,
          programDayId: day.id,
        };
        commitWorkout(activeWorkout);
        try {
          await persistActiveWorkout(userIdRef.current, activeWorkout);
          setSaveError(null);
          return true;
        } catch (error) {
          if (!isTransientNetwork(error)) {
            commitWorkout(null);
            report("workout-start", error);
            return false;
          }
          await writeQueueItem({
            id: queueId("WORKOUT_PERSIST", activeWorkout.id),
            type: "WORKOUT_PERSIST",
            entityId: activeWorkout.id,
            payload: { workout: activeWorkout },
            createdAt: new Date().toISOString(),
            retryCount: 0,
            status: "pending",
          });
          setSyncStatus("PENDING");
          return true;
        }
      },
      discardWorkout: async () => {
        const workout = workoutRef.current;
        commitWorkout(null);
        pendingSets.current.clear();
        try {
          if (workout) await cancelWorkout(workout.id);
          clearActiveBackup();
          if (userIdRef.current) void clearOfflineWorkout(userIdRef.current);
          setSaveError(null);
        } catch (error) {
          commitWorkout(workout);
          report("workout-discard", error);
        }
      },
    };
  }, [
    chrome,
    commitWorkout,
    ensureMonth,
    flushSets,
    historyHasMore,
    importLocalData,
    loadExerciseHistory,
    loadMoreHistory,
    migrationBusy,
    migrationOffer,
    ready,
    report,
    saveError,
    scheduleSet,
    signOut,
    skipMigration,
    state,
    syncStatus,
    updateProfile,
  ]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error("useAppState must be used within AppStateProvider");
  return context;
}
