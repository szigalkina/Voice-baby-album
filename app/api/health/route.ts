import { NextResponse } from "next/server";
import { and, eq, lt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { entries } from "@/lib/schema";
import { sendOpsAlert } from "@/lib/alert";
import { analyzeVoiceNote, MODEL_CHAIN } from "@/lib/ai";
import { CANARY_AUDIO_B64, CANARY_MIME } from "@/lib/canary";

// The AI canary runs the real fallback chain, which may legitimately take
// minutes when models misbehave — the check must survive to report it.
export const maxDuration = 300;

// Two audio-path outages slipped past a text-only ping, so this check now
// exercises the REAL pipeline. Two depths:
// - quick (default; the every-30-min GitHub Actions ping): db + zombie
//   auto-heal + one real audio canary through the model chain.
// - full (?full=1, or the daily Vercel cron): also pings every chain model
//   individually and round-trips a file through storage.
// Failures 503 + email; degradations (slow AI, dead fallbacks, healed
// zombies) email but stay 200 — the app still works, the owner should know.
const SLOW_AI_MS = 25_000;
const ZOMBIE_AGE_MS = 15 * 60 * 1000;

export async function GET(req: Request) {
  const full =
    new URL(req.url).searchParams.has("full") ||
    (req.headers.get("user-agent") ?? "").includes("vercel-cron");
  const status: Record<string, string> = {};
  const warnings: string[] = [];

  // Database, plus self-healing: a "processing" entry older than the route
  // timeout is a corpse from a killed function — flip it to failed so the
  // user gets a retry button instead of an eternal spinner.
  try {
    const db = await getDb();
    await db.execute(sql.raw("select 1"));
    const healed = await db
      .update(entries)
      .set({ status: "failed" })
      .where(
        and(
          eq(entries.status, "processing"),
          lt(entries.recordedAt, new Date(Date.now() - ZOMBIE_AGE_MS))
        )
      )
      .returning({ id: entries.id });
    status.db = "ok";
    status.healedZombies = String(healed.length);
    if (healed.length > 0) {
      warnings.push(
        `${healed.length} stuck note(s) auto-marked failed — the user can retry them`
      );
    }
  } catch (e) {
    status.db = `fail: ${String(e).slice(0, 120)}`;
  }

  // Real audio through the real chain — transcribing a known 1.5s sample.
  if (process.env.GEMINI_API_KEY) {
    const t0 = Date.now();
    try {
      const a = await analyzeVoiceNote(
        Buffer.from(CANARY_AUDIO_B64, "base64"),
        CANARY_MIME
      );
      if (!a.transcript.trim()) throw new Error("empty transcript");
      const ms = Date.now() - t0;
      status.ai = `ok (${(ms / 1000).toFixed(1)}s)`;
      if (ms > SLOW_AI_MS) {
        warnings.push(`AI is slow: audio canary took ${Math.round(ms / 1000)}s`);
      }
    } catch (e) {
      status.ai = `fail: ${String(e).slice(0, 160)}`;
    }
  } else {
    status.ai = "mock";
  }

  // Full mode: is every model in the chain alive? Losing the fallbacks is
  // invisible day-to-day (the primary answers) until the primary stumbles.
  if (full && process.env.GEMINI_API_KEY) {
    const perModel: string[] = [];
    let liveFallbacks = 0;
    for (let i = 0; i < MODEL_CHAIN.length; i++) {
      const m = MODEL_CHAIN[i];
      let verdict: string;
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/${m.api}/models/${m.model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(10_000),
            body: JSON.stringify({
              contents: [{ parts: [{ text: "Reply with exactly: ok" }] }],
            }),
          }
        );
        verdict = res.ok ? "ok" : `HTTP ${res.status}`;
        if (res.ok && i > 0) liveFallbacks++;
      } catch (e) {
        verdict = e instanceof Error && e.name === "TimeoutError" ? "timeout" : "error";
      }
      perModel.push(`${m.model}=${verdict}`);
    }
    status.models = perModel.join(" ");
    if (MODEL_CHAIN.length > 1 && liveFallbacks === 0) {
      warnings.push(
        "no living fallback models — the primary is a single point of failure"
      );
    }
  }

  // Storage: full mode does a real write→read→delete round-trip; quick mode
  // just reports the configuration.
  if (full) {
    try {
      const { saveFile, readStoredFile, deleteStoredFile } = await import("@/lib/storage");
      const probe = Buffer.from(`health-${Date.now()}`);
      const url = await saveFile("audio", "wav", probe, "audio/wav");
      const back = await readStoredFile(url);
      if (!back || !back.data.equals(probe)) throw new Error("read-back mismatch");
      await deleteStoredFile(url);
      status.storage = "ok (round-trip)";
    } catch (e) {
      status.storage = `fail: ${String(e).slice(0, 120)}`;
    }
  } else {
    status.storage = process.env.BLOB_READ_WRITE_TOKEN ? "ok" : "local-disk";
  }

  const ok = !Object.values(status).some((v) => v.startsWith("fail"));
  const origin = new URL(req.url).origin;
  if (!ok) {
    await sendOpsAlert(
      "health check failed",
      `Health status:\n${JSON.stringify(status, null, 2)}\n\nChecked by: ${origin}/api/health`
    );
  } else if (warnings.length) {
    await sendOpsAlert(
      "health warning (app still working)",
      `${warnings.join("\n")}\n\nFull status:\n${JSON.stringify(status, null, 2)}\n\nChecked by: ${origin}/api/health`
    );
  }
  return NextResponse.json({ ok, warnings, ...status }, { status: ok ? 200 : 503 });
}
