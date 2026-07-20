import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { sendOpsAlert } from "@/lib/alert";

export const maxDuration = 60;

// Daily heartbeat (vercel.json cron) + on-demand check. Verifies the database
// and a real (text-only, tiny) AI round-trip; emails the owner on failure so
// silent outages like the gemini-flash-latest hang get caught within a day.
export async function GET(req: Request) {
  const status: Record<string, string> = {};

  try {
    const db = await getDb();
    await db.execute(sql.raw("select 1"));
    status.db = "ok";
  } catch (e) {
    status.db = `fail: ${String(e).slice(0, 120)}`;
  }

  status.storage = process.env.BLOB_READ_WRITE_TOKEN ? "ok" : "local-disk";

  if (process.env.GEMINI_API_KEY) {
    const model = process.env.GEMINI_MODEL ?? "gemini-3-flash-preview";
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(30_000),
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Reply with exactly: ok" }] }],
          }),
        }
      );
      status.ai = res.ok ? "ok" : `fail: HTTP ${res.status}`;
    } catch (e) {
      status.ai = `fail: ${String(e).slice(0, 120)}`;
    }
  } else {
    status.ai = "mock";
  }

  const ok = !Object.values(status).some((v) => v.startsWith("fail"));
  if (!ok) {
    await sendOpsAlert(
      "daily health check failed",
      `Health status:\n${JSON.stringify(status, null, 2)}\n\nChecked by: ${new URL(req.url).origin}/api/health`
    );
  }
  return NextResponse.json({ ok, ...status }, { status: ok ? 200 : 503 });
}
