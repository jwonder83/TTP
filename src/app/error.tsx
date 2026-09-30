"use client";

import { useEffect, useState } from "react";
import { useAppState } from "@/components/providers/AppStateProvider";
import { useI18n } from "@/components/providers/LocaleProvider";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  const { activeWorkout } = useAppState();
  const [stored, setStored] = useState(false);
  useEffect(() => {
    setStored(Boolean(activeWorkout) || Boolean(window.localStorage.getItem("iron-log.active.v1")));
  }, [activeWorkout]);
  return (
    <div className="space-y-3 py-10">
      <h1 className="text-2xl font-black">{t("errorTitle")}</h1>
      {stored ? <p className="text-sm text-[var(--muted)]">{t("errorStored")}</p> : null}
      <button type="button" onClick={reset} className="h-12 w-full rounded-2xl bg-[var(--accent)] font-black text-[var(--accent-ink)]">{t("errorRetry")}</button>
    </div>
  );
}
