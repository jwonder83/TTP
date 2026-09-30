import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-3 py-10">
      <h1 className="text-2xl font-black">NOT FOUND</h1>
      <Link href="/" className="inline-flex h-12 items-center rounded-2xl bg-[var(--accent)] px-4 font-black text-[var(--accent-ink)]">
        HOME
      </Link>
    </div>
  );
}
