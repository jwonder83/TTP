"use client";

import { ChevronLeft } from "lucide-react";
import { formatClock } from "@/lib/format";
import { useI18n } from "@/components/providers/LocaleProvider";
import { useNow } from "@/hooks/useNow";

interface WorkoutHeaderProps {
  title: string;
  startedAt: string;
  onBack: () => void;
}

export function WorkoutHeader({ title, startedAt, onBack }: WorkoutHeaderProps) {
  const now = useNow();
  const { t } = useI18n();
  const elapsed = Math.max(0, Math.round((now - new Date(startedAt).getTime()) / 1000));

  return (
    <header className="sticky top-12 z-20 -mx-4 bg-[var(--bg)]/95 px-4 pt-1 pb-3 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} aria-label={t("headerBack")} className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bg-elevated)]">
          <ChevronLeft size={22} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-black tracking-wide">{title}</h1>
          <p className="text-xs font-semibold text-[var(--muted)]">
            {t("headerTime")} <span className="ml-1 font-black tabular-nums text-[var(--text)]">{formatClock(elapsed)}</span>
          </p>
        </div>
      </div>
      <p className="mt-2 text-[11px] font-semibold text-[var(--faint)]">{t("headerSaved")}</p>
    </header>
  );
}
