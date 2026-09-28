"use client";

import { useEffect, useState } from "react";
import { formatTimer } from "@/lib/format";

interface RestTimerProps {
  secondsLeft: number;
  total: number;
  exerciseName: string;
  onAdd: () => void;
  onSkip: () => void;
}

function playBeep() {
  const Context = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) return;
  const context = new Context();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = 880;
  oscillator.connect(gain);
  gain.connect(context.destination);
  gain.gain.setValueAtTime(0.04, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.25);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.25);
}

export function notifyRestComplete(exerciseName: string) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate([180, 80, 180]);
  }
  playBeep();
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    new Notification("Rest complete", { body: `${exerciseName} · next set` });
  }
}

export function RestTimer({ secondsLeft, total, exerciseName, onAdd, onSkip }: RestTimerProps) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    setPermission(Notification.permission);
  }, []);

  const progress = total <= 0 ? 0 : Math.min(1, Math.max(0, secondsLeft / total));

  return (
    <div className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] left-1/2 z-30 w-[min(100%-2rem,398px)] -translate-x-1/2 rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-black tracking-[0.18em] text-[var(--accent-text)]">REST</p>
          <p className="text-4xl font-black tabular-nums tracking-tight">{formatTimer(secondsLeft)}</p>
          <p className="text-xs text-[var(--muted)]">{exerciseName}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onAdd} className="h-12 rounded-2xl bg-[var(--bg-muted)] px-3 text-sm font-bold">
            +30 SEC
          </button>
          <button type="button" onClick={onSkip} className="h-12 rounded-2xl bg-[var(--accent)] px-4 text-sm font-black text-[var(--accent-ink)]">
            SKIP
          </button>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--bg-muted)]">
        <div className="h-full bg-[var(--accent)]" style={{ width: `${progress * 100}%` }} />
      </div>
      {permission === "default" ? (
        <button
          type="button"
          onClick={async () => {
            const result = await Notification.requestPermission();
            setPermission(result);
          }}
          className="mt-3 text-xs font-semibold text-[var(--muted)]"
        >
          Enable rest alerts
        </button>
      ) : null}
    </div>
  );
}
