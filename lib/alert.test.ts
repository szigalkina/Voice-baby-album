import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, like } from "drizzle-orm";
import { sendOpsAlert } from "./alert";
import { getDb } from "./db";
import { opsAlerts } from "./schema";

// The cooldown must live in the DATABASE: in-memory cooldowns reset on every
// serverless cold start and spammed the owner with duplicate alert emails.
const SUBJECT = `test-alert-${Date.now()}`;
const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));

beforeAll(() => {
  process.env.RESEND_API_KEY = "re_dummy_for_test";
  vi.stubGlobal("fetch", fetchMock);
});

afterAll(async () => {
  vi.unstubAllGlobals();
  delete process.env.RESEND_API_KEY;
  const db = await getDb();
  await db.delete(opsAlerts).where(like(opsAlerts.subject, "test-alert-%"));
});

describe("sendOpsAlert durable cooldown", () => {
  it("sends once, then suppresses repeats within the cooldown", async () => {
    await sendOpsAlert(SUBJECT, "first");
    await sendOpsAlert(SUBJECT, "second (should be suppressed)");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("records the send in the ops_alerts table (survives restarts)", async () => {
    const db = await getDb();
    const [row] = await db.select().from(opsAlerts).where(eq(opsAlerts.subject, SUBJECT));
    expect(row).toBeTruthy();
  });

  it("sends again once the cooldown has passed", async () => {
    const db = await getDb();
    await db
      .update(opsAlerts)
      .set({ lastSentAt: new Date(Date.now() - 7 * 60 * 60 * 1000) })
      .where(eq(opsAlerts.subject, SUBJECT));
    await sendOpsAlert(SUBJECT, "third (cooldown expired)");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("a different subject is not suppressed by the first one", async () => {
    await sendOpsAlert(`${SUBJECT}-other`, "different problem");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
