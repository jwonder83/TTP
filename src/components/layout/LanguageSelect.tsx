"use client";

import { useI18n, type Locale } from "@/components/providers/LocaleProvider";
import { cx } from "@/lib/format";

const OPTIONS: Array<{ value: Locale; label: string }> = [
  { value: "ko", label: "Korea" },
  { value: "en", label: "English" },
];

export function LanguageSelect() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t("languageLabel")}
      className="inline-flex h-9 items-center rounded-full bg-[var(--bg-elevated)] p-1 ring-1 ring-[var(--line)]"
    >
      {OPTIONS.map((option) => {
        const active = locale === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => setLocale(option.value)}
            className={cx(
              "h-7 rounded-full px-3 text-[11px] font-black tracking-wide",
              active ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "text-[var(--faint)]",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
