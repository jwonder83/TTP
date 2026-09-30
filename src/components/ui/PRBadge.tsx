"use client";

import { Trophy } from "lucide-react";
import { useI18n } from "@/components/providers/LocaleProvider";

export function PRBadge({ label }: { label?: string }) {
  const { t } = useI18n();
  const text = label ?? t("prNew");
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent)] px-2 py-1 text-[10px] font-black tracking-wide text-[var(--accent-ink)]">
      <Trophy size={11} strokeWidth={2.5} />
      {text}
    </span>
  );
}
