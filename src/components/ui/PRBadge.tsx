import { Trophy } from "lucide-react";

export function PRBadge({ label = "NEW PR" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent)] px-2 py-1 text-[10px] font-black tracking-wide text-[var(--accent-ink)]">
      <Trophy size={11} strokeWidth={2.5} />
      {label}
    </span>
  );
}
