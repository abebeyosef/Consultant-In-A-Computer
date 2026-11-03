"use client";

/** Last-resort fallback when the root layout itself fails. Plain HTML, no providers. */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#F8F7F3", color: "#17191D" }}>
        <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600 }}>Something went wrong</h1>
            <p style={{ color: "#5E6470", fontSize: 14 }}>Your sessions are saved in this browser.</p>
            <button
              onClick={() => retry()}
              style={{ marginTop: 12, padding: "8px 14px", borderRadius: 8, border: 0, background: "#2F45D8", color: "#fff", fontSize: 14 }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
