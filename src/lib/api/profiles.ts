import { isUniqueViolation } from "@/lib/api/errors";
import { mapProfile } from "@/lib/api/rows";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

function displayName(user: User) {
  const meta = user.user_metadata?.name;
  if (typeof meta === "string" && meta.trim()) return meta.trim();
  return user.email?.split("@")[0] || "Athlete";
}

export async function ensureAccount(user: User) {
  const supabase = createClient();
  const profileResult = await supabase.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (profileResult.error) throw profileResult.error;
  if (!profileResult.data) {
    const inserted = await supabase.from("profiles").insert({ user_id: user.id, name: displayName(user) });
    if (inserted.error && !isUniqueViolation(inserted.error)) throw inserted.error;
  }

  const settingsResult = await supabase.from("user_settings").select("id").eq("user_id", user.id).maybeSingle();
  if (settingsResult.error) throw settingsResult.error;
  if (!settingsResult.data) {
    const inserted = await supabase.from("user_settings").insert({ user_id: user.id });
    if (inserted.error && !isUniqueViolation(inserted.error)) throw inserted.error;
  }
}

export async function fetchProfile(userId: string): Promise<Profile> {
  const supabase = createClient();
  const [profileResult, settingsResult] = await Promise.all([
    supabase.from("profiles").select("name, height, unit").eq("user_id", userId).maybeSingle(),
    supabase
      .from("user_settings")
      .select("unit, theme, compound_rest_seconds, accessory_rest_seconds, weekly_goal, effort_scale")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (settingsResult.error) throw settingsResult.error;
  return mapProfile(profileResult.data, settingsResult.data);
}

export async function saveProfile(userId: string, profile: Profile) {
  const supabase = createClient();
  const profileResult = await supabase
    .from("profiles")
    .update({
      name: profile.name.trim() || "Athlete",
      height: profile.heightCm > 0 ? profile.heightCm : null,
      unit: profile.unit,
    })
    .eq("user_id", userId);
  if (profileResult.error) throw profileResult.error;

  const settingsResult = await supabase
    .from("user_settings")
    .update({
      unit: profile.unit,
      theme: profile.theme,
      compound_rest_seconds: Math.min(900, Math.max(15, Math.round(profile.compoundRestSec))),
      accessory_rest_seconds: Math.min(900, Math.max(15, Math.round(profile.accessoryRestSec))),
      weekly_goal: Math.min(14, Math.max(1, Math.round(profile.weeklyGoal))),
      effort_scale: profile.effortScale === "rir" ? "rir" : "rpe",
    })
    .eq("user_id", userId);
  if (settingsResult.error) throw settingsResult.error;
  if (typeof window !== "undefined") window.localStorage.setItem("iron-log.theme", profile.theme);
}
