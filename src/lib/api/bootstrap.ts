import { fetchBodyWeights } from "@/lib/api/bodyWeight";
import { fetchExercises } from "@/lib/api/exercises";
import { ensureAccount, fetchProfile } from "@/lib/api/profiles";
import { fetchRecords } from "@/lib/api/progress";
import { fetchRoutines } from "@/lib/api/routines";
import { mergeWorkouts } from "@/lib/api/rows";
import {
  fetchActiveWorkout,
  fetchCompletedBetween,
  fetchCompletedPage,
  monthRange,
  rangeFromDateKey,
} from "@/lib/api/workouts";
import { addDaysKey, toDateKey } from "@/lib/format";
import type { User } from "@supabase/supabase-js";

export async function loadAccount(user: User) {
  await ensureAccount(user);
  const today = new Date();
  const month = monthRange(today.getFullYear(), today.getMonth());
  const week = rangeFromDateKey(addDaysKey(toDateKey(today), -6), toDateKey(today));
  const [profile, exercises, routines, active, page, monthWorkouts, weekWorkouts, records, bodyWeights] = await Promise.all([
    fetchProfile(user.id),
    fetchExercises(),
    fetchRoutines(),
    fetchActiveWorkout(),
    fetchCompletedPage(0),
    fetchCompletedBetween(month.startIso, month.endIso),
    fetchCompletedBetween(week.startIso, week.endIso),
    fetchRecords(),
    fetchBodyWeights(),
  ]);

  return {
    profile,
    exercises,
    routines,
    active,
    history: mergeWorkouts([page.workouts, monthWorkouts, weekWorkouts]),
    historyPageCount: page.workouts.length,
    hasMore: page.hasMore,
    records: records.records,
    latestSetPr: records.latestSetPr,
    bodyWeights,
  };
}
