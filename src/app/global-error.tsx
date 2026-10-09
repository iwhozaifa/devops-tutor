"use client"; // Error boundaries must be Client Components

// Replaces the root layout when it fails, so it cannot rely on globals.css
// or the theme provider; inline styles follow the OS color scheme.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          colorScheme: "light dark",
          display: "grid",
          placeItems: "center",
          minHeight: "100vh",
          margin: 0,
          textAlign: "center",
        }}
      >
        <title>Something went wrong | DevOps Tutor</title>
        <main>
          <h1 style={{ fontSize: "1.25rem" }}>Something went wrong</h1>
          <p>DevOps Tutor is having trouble right now. Please try again shortly.</p>
          {error.digest && (
            <p style={{ fontFamily: "monospace", fontSize: "0.75rem", opacity: 0.7 }}>
              Reference: {error.digest}
            </p>
          )}
          <button onClick={() => retry()} style={{ padding: "0.5rem 1rem", cursor: "pointer" }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
