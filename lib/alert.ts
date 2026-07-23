import { eq } from "drizzle-orm";

// Ops alerts: email the owner when something breaks in production.
// Rate-limited so an outage sends a few emails, not hundreds.
const OWNER_EMAIL = "szigalkina@gmail.com";

// Cooldowns are PER SUBJECT and stored in the DATABASE — an in-memory
// cooldown resets on every serverless cold start, which re-sent the same
// warning many times a day. Memory remains as fallback so a database outage
// can still alert (deduped only per instance, better than silence).
export const FAILURE_COOLDOWN_MS = 6 * 60 * 60 * 1000;
export const WARNING_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const g = globalThis as typeof globalThis & { __vbaLastAlert?: Record<string, number> };

async function shouldSend(subject: string, now: number, cooldownMs: number): Promise<boolean> {
  try {
    const { getDb } = await import("./db");
    const { opsAlerts } = await import("./schema");
    const db = await getDb();
    const [row] = await db.select().from(opsAlerts).where(eq(opsAlerts.subject, subject));
    if (row && now - row.lastSentAt.getTime() < cooldownMs) return false;
    await db
      .insert(opsAlerts)
      .values({ subject, lastSentAt: new Date(now) })
      .onConflictDoUpdate({
        target: opsAlerts.subject,
        set: { lastSentAt: new Date(now) },
      });
    return true;
  } catch {
    const last = (g.__vbaLastAlert ??= {});
    if (last[subject] && now - last[subject] < cooldownMs) return false;
    last[subject] = now;
    return true;
  }
}

export async function sendOpsAlert(
  subject: string,
  detail: string,
  cooldownMs: number = FAILURE_COOLDOWN_MS
): Promise<void> {
  try {
    if (!process.env.RESEND_API_KEY) return;
    if (!(await shouldSend(subject, Date.now(), cooldownMs))) return;
    const hours = Math.round(cooldownMs / 3_600_000);
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? "Voice Memory Album <onboarding@resend.dev>",
        to: OWNER_EMAIL,
        subject: `[Voice Memory Album alert] ${subject}`,
        text: `${detail}\n\nTime: ${new Date().toISOString()}\nAt most one of these every ${hours}h is sent.`,
      }),
    });
  } catch {
    /* alerting must never break the request it reports on */
  }
}
