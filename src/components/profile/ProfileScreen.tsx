"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useAppState } from "@/components/providers/AppStateProvider";
import { useI18n } from "@/components/providers/LocaleProvider";
import { cx, displayToKg, formatWeight, kgToDisplay, shortMonthDay, toDateKey } from "@/lib/format";
import type { ThemePreference, Unit } from "@/lib/types";

const ProgressChart = dynamic(() => import("@/components/progress/ProgressChart").then((mod) => mod.ProgressChart), {
  ssr: false,
});

export function ProfileScreen() {
  const { profile, bodyWeights, updateProfile, logBodyWeight, signOut } = useAppState();
  const { locale, t, displayName } = useI18n();
  const latest = [...bodyWeights].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  const [weightText, setWeightText] = useState(latest ? String(kgToDisplay(latest.weight, profile.unit)) : "");
  const points = [...bodyWeights]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => ({
      label: `${new Date(`${entry.date}T00:00:00`).getMonth() + 1}/${new Date(`${entry.date}T00:00:00`).getDate()}`,
      value: kgToDisplay(entry.weight, profile.unit),
    }));

  return (
    <div className="space-y-4">
      <header>
        <p className="text-[11px] font-black tracking-[0.16em] text-[var(--faint)]">{t("profileTitle")}</p>
        <h1 className="text-3xl font-black tracking-tight">{displayName(profile.name)}</h1>
      </header>

      <section className="space-y-3 rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
        <Field label={t("profileName")}>
          <input
            value={profile.name}
            onChange={(event) => updateProfile({ name: event.target.value })}
            className="h-12 w-full rounded-2xl bg-[var(--bg)] px-3 font-bold outline-none"
          />
        </Field>
        <Field label={t("profileHeight")}>
          <input
            inputMode="decimal"
            value={profile.heightCm}
            onChange={(event) => {
              const parsed = Number.parseFloat(event.target.value);
              if (Number.isFinite(parsed)) updateProfile({ heightCm: parsed });
            }}
            className="h-12 w-full rounded-2xl bg-[var(--bg)] px-3 font-bold outline-none"
          />
        </Field>
        <Field label={t("profileUnit")}>
          <div className="grid grid-cols-2 gap-2">
            {(["kg", "lb"] as Unit[]).map((unit) => (
              <button
                key={unit}
                type="button"
                onClick={() => {
                  updateProfile({ unit });
                  if (latest) setWeightText(String(kgToDisplay(latest.weight, unit)));
                }}
                className={cx(
                  "h-12 rounded-2xl font-black",
                  profile.unit === unit ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--bg)]",
                )}
              >
                {unit}
              </button>
            ))}
          </div>
        </Field>
      </section>

      <section className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
        <h2 className="text-sm font-black tracking-wide">{t("profileBody")}</h2>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const parsed = Number.parseFloat(weightText);
            if (!Number.isFinite(parsed) || parsed <= 0) return;
            void logBodyWeight(displayToKg(parsed, profile.unit), toDateKey(new Date()));
          }}
        >
          <input
            inputMode="decimal"
            value={weightText}
            onChange={(event) => setWeightText(event.target.value)}
            aria-label={t("profileWeightAria")}
            className="h-12 flex-1 rounded-2xl bg-[var(--bg)] px-3 text-center text-lg font-black tabular-nums outline-none"
          />
          <button type="submit" className="h-12 rounded-2xl bg-[var(--accent)] px-4 font-black text-[var(--accent-ink)]">
            {t("profileSave")}
          </button>
        </form>
        <div className="mt-3">
          {bodyWeights.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--muted)]">
              <span className="block font-black tracking-wide text-[var(--text)]">{t("profileNoWeight")}</span>
              {t("profileAddWeight")}
            </p>
          ) : (
            <ProgressChart points={points} suffix={profile.unit} />
          )}
        </div>
        <ul className="mt-2 space-y-2">
          {[...bodyWeights]
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 4)
            .map((entry) => (
              <li key={entry.id} className="flex items-center justify-between text-sm">
                <span className="font-bold tracking-wide text-[var(--muted)]">{shortMonthDay(entry.date, locale)}</span>
                <span className="font-black tabular-nums">
                  {formatWeight(entry.weight, profile.unit)} {profile.unit}
                </span>
              </li>
            ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
        <h2 className="text-sm font-black tracking-wide">{t("profileRest")}</h2>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t("profileCompound")}>
            <input
              inputMode="numeric"
              value={profile.compoundRestSec}
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value, 10);
                if (Number.isFinite(parsed)) updateProfile({ compoundRestSec: parsed });
              }}
              className="h-12 w-full rounded-2xl bg-[var(--bg)] px-3 text-center font-bold outline-none"
            />
          </Field>
          <Field label={t("profileAccessory")}>
            <input
              inputMode="numeric"
              value={profile.accessoryRestSec}
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value, 10);
                if (Number.isFinite(parsed)) updateProfile({ accessoryRestSec: parsed });
              }}
              className="h-12 w-full rounded-2xl bg-[var(--bg)] px-3 text-center font-bold outline-none"
            />
          </Field>
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
        <h2 className="text-sm font-black tracking-wide">{t("effortScale")}</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(["rpe", "rir"] as const).map((scale) => (
            <button
              key={scale}
              type="button"
              onClick={() => updateProfile({ effortScale: scale })}
              className={cx(
                "h-12 rounded-2xl text-sm font-black",
                profile.effortScale === scale ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--bg)]",
              )}
            >
              {scale.toUpperCase()}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
        <h2 className="text-sm font-black tracking-wide">{t("profileTheme")}</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(["dark", "light", "system"] as ThemePreference[]).map((theme) => (
            <button
              key={theme}
              type="button"
              onClick={() => updateProfile({ theme })}
              className={cx(
                "h-12 rounded-2xl text-sm font-black",
                profile.theme === theme ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--bg)]",
              )}
            >
              {t(theme === "dark" ? "themeDark" : theme === "light" ? "themeLight" : "themeSystem")}
            </button>
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={() => void signOut()}
        className="h-12 w-full rounded-2xl bg-[var(--bg-elevated)] font-bold"
      >
        {t("profileLogout")}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-bold tracking-wide text-[var(--faint)]">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
