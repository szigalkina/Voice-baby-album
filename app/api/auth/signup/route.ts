import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/schema";
import { hashPassword } from "@/lib/password";
import { createSession } from "@/lib/auth";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "Password needs at least 8 characters" },
      { status: 400 }
    );
  }
  const db = await getDb();
  const normalized = email.toLowerCase();
  const [existing] = await db.select().from(users).where(eq(users.email, normalized));
  if (existing?.passwordHash) {
    return NextResponse.json(
      { error: "An account with this email already exists — sign in instead" },
      { status: 409 }
    );
  }
  let user = existing;
  if (existing) {
    // Legacy magic-link account without a password: set one now.
    [user] = await db
      .update(users)
      .set({ passwordHash: hashPassword(password) })
      .where(eq(users.id, existing.id))
      .returning();
  } else {
    [user] = await db
      .insert(users)
      .values({ email: normalized, passwordHash: hashPassword(password) })
      .returning();
  }
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
