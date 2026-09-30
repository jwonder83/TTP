"use client";

import { usePathname } from "next/navigation";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { LanguageSelect } from "@/components/layout/LanguageSelect";
import { PwaRegister } from "@/components/pwa/PwaRegister";
import { useAppState } from "@/components/providers/AppStateProvider";
import { useI18n } from "@/components/providers/LocaleProvider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const { ready, chrome, saveError, syncStatus, migrationOffer, migrationBusy, importLocalData, skipMigration } = useAppState();
  const authPage = pathname === "/login" || pathname === "/signup";
  const session = chrome === "session";

  return (
    <div className="min-h-dvh bg-[var(--backdrop)] text-[var(--text)]">
      <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-[var(--bg)] md:border-x md:border-[var(--line)] md:shadow-[var(--shadow)]">
        <div className="sticky top-0 z-40 flex justify-end bg-[var(--bg)]/95 px-4 py-2 backdrop-blur-md">
          <LanguageSelect />
        </div>
        {authPage || ready ? (
          <div className={session ? "px-4 pt-1 pb-36" : "px-4 pt-1 pb-32"}>
        {saveError && !authPage && syncStatus !== "OFFLINE" && syncStatus !== "PENDING" ? (
          <p className="mb-3 rounded-2xl bg-[var(--bg-elevated)] px-3 py-2 text-sm font-semibold text-[var(--danger)]">{t(saveError)}</p>
        ) : null}
        {syncStatus === "OFFLINE" || syncStatus === "PENDING" ? (
          <p className="mb-3 rounded-2xl bg-[var(--bg-elevated)] px-3 py-2 text-sm font-semibold">{syncStatus === "OFFLINE" ? t("offlineSaved") : t("syncPending")}</p>
        ) : null}
        <PwaRegister />
            {children}
          </div>
        ) : (
          <div className="space-y-3 px-4 pt-6">
            <div className="h-8 w-36 animate-pulse rounded-xl bg-[var(--bg-muted)]" />
            <div className="h-28 animate-pulse rounded-3xl bg-[var(--bg-muted)]" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-24 animate-pulse rounded-3xl bg-[var(--bg-muted)]" />
              <div className="h-24 animate-pulse rounded-3xl bg-[var(--bg-muted)]" />
            </div>
          </div>
        )}
      </div>
      {ready && !session && !authPage ? <BottomNavigation /> : null}
      {migrationOffer && !authPage ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-[430px] rounded-3xl bg-[var(--bg-elevated)] p-5">
            <p className="text-[11px] font-black tracking-[0.16em] text-[var(--faint)]">{t("migrationEyebrow")}</p>
            <h2 className="mt-2 text-2xl font-black">{t("migrationTitle")}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">{t("migrationBody")}</p>
            <button
              type="button"
              disabled={migrationBusy}
              onClick={() => void importLocalData()}
              className="mt-5 h-12 w-full rounded-2xl bg-[var(--accent)] font-black text-[var(--accent-ink)] disabled:opacity-40"
            >
              {migrationBusy ? t("migrationImporting") : t("migrationImport")}
            </button>
            <button type="button" disabled={migrationBusy} onClick={skipMigration} className="mt-2 h-12 w-full rounded-2xl font-bold">
              {t("migrationSkip")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
