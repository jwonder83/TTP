"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "sans-serif", padding: 24 }}>
        <h1>SOMETHING WENT WRONG</h1>
        <button type="button" onClick={reset}>TRY AGAIN</button>
      </body>
    </html>
  );
}
