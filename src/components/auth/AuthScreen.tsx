"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { friendlyError } from "@/lib/api/errors";
import { signIn, signUp } from "@/lib/api/auth";
import { useAppState } from "@/components/providers/AppStateProvider";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthScreen({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const { configured } = useAppState();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (!EMAIL_RE.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (mode === "signup" && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setError("Enter your name.");
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
        setSuccess("Account created. Check your email to confirm, then log in.");
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
        TRAIN.
        <br />
        TRACK.
        <br />
        PROGRESS.
      </h1>
      {!configured ? (
        <p className="mt-6 rounded-2xl bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--muted)]">
          Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then restart the dev server.
        </p>
      ) : (
        <form onSubmit={(event) => void submit(event)} className="mt-8 space-y-3">
          {mode === "signup" ? <Field label="NAME" value={name} onChange={setName} autoComplete="name" /> : null}
          <Field label="EMAIL" value={email} onChange={setEmail} type="email" autoComplete="email" />
          <Field label="PASSWORD" value={password} onChange={setPassword} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} />
          {mode === "signup" ? (
            <Field label="CONFIRM PASSWORD" value={confirm} onChange={setConfirm} type="password" autoComplete="new-password" />
          ) : null}
          {error ? <p className="text-sm font-semibold text-[var(--danger)]">{error}</p> : null}
          {success ? <p className="text-sm font-semibold text-[var(--accent-text)]">{success}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="h-14 w-full rounded-2xl bg-[var(--accent)] text-base font-black tracking-wide text-[var(--accent-ink)] disabled:opacity-40"
          >
            {loading ? "..." : mode === "login" ? "LOGIN" : "CREATE ACCOUNT"}
          </button>
          {mode === "login" ? (
            <Link href="/signup" className="flex h-12 items-center justify-center text-sm font-black tracking-wide">
              CREATE ACCOUNT
            </Link>
          ) : (
            <Link href="/login" className="flex h-12 items-center justify-center text-sm font-black tracking-wide">
              LOGIN
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
