"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Dumbbell, House, TrendingUp, UserRound } from "lucide-react";
import { cx } from "@/lib/format";
import { useI18n } from "@/components/providers/LocaleProvider";
import type { MessageKey } from "@/lib/i18n/messages";

const TABS = [
  { href: "/", label: "navHome", icon: House },
  { href: "/history", label: "navHistory", icon: CalendarDays },
  { href: "/workout", label: "navWorkout", icon: Dumbbell, center: true },
  { href: "/progress", label: "navProgress", icon: TrendingUp },
  { href: "/profile", label: "navProfile", icon: UserRound },
] as const satisfies ReadonlyArray<{ href: string; label: MessageKey; icon: typeof House; center?: boolean }>;

export function BottomNavigation() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2">
      <nav className="grid grid-cols-5 border-t border-[var(--line)] bg-[var(--bg)]/95 px-1 pt-1 backdrop-blur-md pb-[max(0.4rem,env(safe-area-inset-bottom))]">
        {TABS.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          if ("center" in tab && tab.center) {
            return (
              <Link key={tab.href} href={tab.href} className="flex flex-col items-center" aria-current={active ? "page" : undefined}>
                <span
                  className={cx(
                    "-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_8px_24px_rgba(216,255,62,0.28)]",
                    active && "ring-4 ring-[var(--accent-soft)]",
                  )}
                >
                  <Icon size={26} strokeWidth={2.4} />
                </span>
                <span className="mt-1 text-[10px] font-black tracking-wide text-[var(--accent-text)]">{t(tab.label)}</span>
              </Link>
            );
          }
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cx(
                "flex flex-col items-center justify-end gap-1 pb-1 text-[10px] font-bold tracking-wide",
                active ? "text-[var(--accent-text)]" : "text-[var(--faint)]",
              )}
            >
              <Icon size={21} strokeWidth={active ? 2.5 : 2} />
              {t(tab.label)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
