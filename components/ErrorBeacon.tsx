"use client";

import { useEffect } from "react";

// Reports uncaught browser errors to /api/client-error so phone-only failures
// reach the owner as ops emails. At most 2 reports per page load, known-benign
// noise filtered out.
const IGNORE = /ResizeObserver|Script error\.?$|Load failed|Failed to fetch|NetworkError|AbortError/;

export default function ErrorBeacon() {
  useEffect(() => {
    let sent = 0;
    const report = (message: string) => {
      if (sent >= 2 || !message || IGNORE.test(message)) return;
      sent++;
      fetch("/api/client-error", {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.slice(0, 500), url: location.pathname }),
      }).catch(() => {});
    };
    const onError = (e: ErrorEvent) => report(e.message ?? "unknown error");
    const onRejection = (e: PromiseRejectionEvent) => report(String(e.reason ?? "unhandled rejection"));
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
