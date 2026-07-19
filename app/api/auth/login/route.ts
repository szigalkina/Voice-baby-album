import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/schema";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export async function POST(req: Request) {
  if (!rateLimit(`login:${clientIp(req)}`)) {
    return NextResponse.json(
      { error: "Too many attempts — wait a few minutes and try again" },
      { status: 429 }
    );
  }
  const { email, password } = await req.json();
  if (!email || typeof password !== "string") {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }
  const db = await getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()));
  if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) {
    // Same message for unknown email and wrong password.
    return NextResponse.json({ error: "Wrong email or password" }, { status: 401 });
  }
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
