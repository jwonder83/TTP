"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { friendlyError } from "@/lib/api/errors";
import { signIn, signUp } from "@/lib/api/auth";
import { useAppState } from "@/components/providers/AppStateProvider";
import { useI18n } from "@/components/providers/LocaleProvider";
import type { MessageKey } from "@/lib/i18n/messages";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthScreen({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const { t } = useI18n();
  const { configured } = useAppState();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<MessageKey | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    if (!EMAIL_RE.test(email.trim())) {
      setError("errEmail");
      return;
    }
    if (password.length < 8) {
      setError("errPassword");
      return;
    }
    if (mode === "signup" && password !== confirm) {
      setError("errMatch");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setError("errName");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
        router.replace("/");
        router.refresh();
        return;
      }
      const result = await signUp({ name, email, password });
      if (!result.session) {
        setSuccess(true);
        setLoading(false);
        return;
      }
      router.replace("/");
      router.refresh();
    } catch (caught) {
      console.error("[iron-log] auth", caught);
      setError(friendlyError(caught));
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100dvh-2rem)] flex-col justify-center py-8">
      <p className="text-[11px] font-black tracking-[0.22em] text-[var(--faint)]">IRON LOG</p>
      <h1 className="mt-3 text-5xl font-black leading-none tracking-tight">
        {t("slogan1")}
        <br />
        {t("slogan2")}
        <br />
        {t("slogan3")}
      </h1>
      {!configured ? (
        <p className="mt-6 rounded-2xl bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--muted)]">{t("authEnv")}</p>
      ) : (
        <form onSubmit={(event) => void submit(event)} className="mt-8 space-y-3">
          {mode === "signup" ? <Field label={t("authName")} value={name} onChange={setName} autoComplete="name" /> : null}
          <Field label={t("authEmail")} value={email} onChange={setEmail} type="email" autoComplete="email" />
          <Field label={t("authPassword")} value={password} onChange={setPassword} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} />
          {mode === "signup" ? (
            <Field label={t("authConfirm")} value={confirm} onChange={setConfirm} type="password" autoComplete="new-password" />
          ) : null}
          {error ? <p className="text-sm font-semibold text-[var(--danger)]">{t(error)}</p> : null}
          {success ? <p className="text-sm font-semibold text-[var(--accent-text)]">{t("authCreated")}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="h-14 w-full rounded-2xl bg-[var(--accent)] text-base font-black tracking-wide text-[var(--accent-ink)] disabled:opacity-40"
          >
            {loading ? "..." : mode === "login" ? t("authLogin") : t("authCreate")}
          </button>
          {mode === "login" ? (
            <Link href="/signup" className="flex h-12 items-center justify-center text-sm font-black tracking-wide">
              {t("authCreate")}
            </Link>
          ) : (
            <Link href="/login" className="flex h-12 items-center justify-center text-sm font-black tracking-wide">
              {t("authLogin")}
            </Link>
          )}
        </form>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block text-[11px] font-black tracking-[0.16em] text-[var(--faint)]">
      {label}
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-12 w-full rounded-2xl bg-[var(--bg-elevated)] px-3 text-base font-bold tracking-normal text-[var(--text)] outline-none ring-1 ring-[var(--line)] focus:ring-[var(--accent)]"
      />
    </label>
  );
}
