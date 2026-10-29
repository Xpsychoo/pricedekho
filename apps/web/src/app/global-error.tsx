"use client";

/** Last-resort boundary when the root layout itself fails (e.g. a configuration error). */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-IN">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "3rem 1rem", textAlign: "center", color: "#0f172a" }}>
        <h1 style={{ fontSize: "1.25rem" }}>PriceDekho is temporarily unavailable</h1>
        <p style={{ color: "#475569" }}>Please try again in a few minutes.</p>
        <button type="button" onClick={reset} style={{ marginTop: "1rem", padding: "0.5rem 1rem", borderRadius: 8, border: "1px solid #cbd5e1" }}>
          Try again
        </button>
      </body>
    </html>
  );
}
