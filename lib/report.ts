// Client-side: tell the owner about an error the user just saw on screen.
// Fire-and-forget; server side rate-limits and dedupes into 1 email/hour.
export function reportClientError(message: string): void {
  try {
    fetch("/api/client-error", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: message.slice(0, 500),
        url: typeof location !== "undefined" ? location.pathname : "?",
      }),
    }).catch(() => {});
  } catch {
    /* never break the UI over reporting */
  }
}
