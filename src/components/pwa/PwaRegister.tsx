"use client";

import { useEffect, useState } from "react";
import { APP_VERSION } from "@/lib/offline/model";
import { useAppState } from "@/components/providers/AppStateProvider";
import { useI18n } from "@/components/providers/LocaleProvider";

export function PwaRegister() {
  const { activeWorkout } = useAppState();
  const { t } = useI18n();
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let reg: ServiceWorkerRegistration | undefined;
    const watch = () => {
      const worker = reg?.waiting;
      if (worker) setWaiting(worker);
    };
    void navigator.serviceWorker.register("/sw.js").then((registration) => {
      reg = registration;
      watch();
      registration.addEventListener("updatefound", () => {
        const next = registration.installing;
        next?.addEventListener("statechange", () => {
          if (next.state === "installed" && navigator.serviceWorker.controller) setWaiting(next);
        });
      });
    }).catch(() => undefined);
  }, []);

  if (!waiting || activeWorkout) return null;
  return (
    <div className="mb-3 rounded-2xl bg-[var(--bg-elevated)] p-3">
      <p className="text-sm font-black">{t("updateReady")}</p>
      <p className="text-xs text-[var(--muted)]">{APP_VERSION}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            waiting.postMessage({ type: "SKIP_WAITING" });
            window.location.reload();
          }}
          className="h-11 rounded-xl bg-[var(--accent)] text-sm font-black text-[var(--accent-ink)]"
        >
          {t("updateNow")}
        </button>
        <button type="button" onClick={() => setWaiting(null)} className="h-11 rounded-xl bg-[var(--bg)] text-sm font-bold">
          {t("updateLater")}
        </button>
      </div>
    </div>
  );
}

export function InstallButton() {
  const { t } = useI18n();
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHelp, setIosHelp] = useState(false);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const installed = media.matches || ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    setStandalone(installed);
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (standalone) return null;
  const ios = typeof navigator !== "undefined" && /iphone|ipad/i.test(navigator.userAgent);
  if (!prompt && !ios) return null;
  return (
    <section className="rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
      <p className="font-black">{t("installTitle")}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{t("installBody")}</p>
      <button
        type="button"
        onClick={() => {
          if (prompt) void prompt.prompt();
          else setIosHelp(true);
        }}
        className="mt-3 h-12 w-full rounded-2xl bg-[var(--accent)] font-black text-[var(--accent-ink)]"
      >
        {t("installAction")}
      </button>
      {iosHelp ? <p className="mt-3 text-sm leading-6">{t("installIos")}</p> : null}
    </section>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}
