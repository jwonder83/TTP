"use client";

import { useEffect } from "react";
import { cx } from "@/lib/format";
import { useI18n } from "@/components/providers/LocaleProvider";

interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function Sheet({ open, title, onClose, children }: SheetProps) {
  const { t } = useI18n();
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-center">
      <button type="button" aria-label={t("sheetClose")} className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute bottom-0 flex max-h-[85dvh] w-full max-w-[430px] flex-col rounded-t-3xl border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="text-base font-black tracking-wide">{title}</h2>
          <button type="button" onClick={onClose} className="text-sm font-semibold text-[var(--muted)]">
            {t("sheetClose")}
          </button>
        </div>
        <div className="overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({ open, title, body, confirmLabel, danger, onConfirm, onClose }: ConfirmDialogProps) {
  const { t } = useI18n();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label={t("dialogClose")} className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative mb-[max(1rem,env(safe-area-inset-bottom))] w-[min(100%-2rem,24rem)] rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-5">
        <h2 className="text-lg font-black">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{body}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="h-12 rounded-2xl bg-[var(--bg-muted)] font-semibold">
            {t("dialogCancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cx(
              "h-12 rounded-2xl font-bold",
              danger ? "bg-[var(--danger)] text-white" : "bg-[var(--accent)] text-[var(--accent-ink)]",
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
