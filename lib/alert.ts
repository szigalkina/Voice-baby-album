// Ops alerts: email the owner when something breaks in production.
// Rate-limited so an outage sends one email, not hundreds.
const OWNER_EMAIL = "szigalkina@gmail.com";
const ALERT_COOLDOWN_MS = 60 * 60 * 1000;

const g = globalThis as typeof globalThis & { __vbaLastAlert?: number };

export async function sendOpsAlert(subject: string, detail: string): Promise<void> {
  try {
    if (!process.env.RESEND_API_KEY) return;
    const now = Date.now();
    if (g.__vbaLastAlert && now - g.__vbaLastAlert < ALERT_COOLDOWN_MS) return;
    g.__vbaLastAlert = now;
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
        text: `${detail}\n\nTime: ${new Date().toISOString()}\nAt most one of these per hour is sent.`,
      }),
    });
  } catch {
    /* alerting must never break the request it reports on */
  }
}
