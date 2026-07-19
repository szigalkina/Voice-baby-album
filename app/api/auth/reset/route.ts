import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { resetTokens, users } from "@/lib/schema";
import { hashPassword } from "@/lib/password";
import { createSession } from "@/lib/auth";

export async function POST(req: Request) {
  const { token, password } = await req.json();
  if (typeof token !== "string" || !token) {
    return NextResponse.json({ error: "Reset link required" }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "Password needs at least 8 characters" },
      { status: 400 }
    );
  }
  const db = await getDb();
  const [row] = await db.select().from(resetTokens).where(eq(resetTokens.token, token));
  if (!row || row.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "That reset link expired — request a fresh one" },
      { status: 400 }
    );
  }
  await db.delete(resetTokens).where(eq(resetTokens.token, token));
  const [user] = await db
    .update(users)
    .set({ passwordHash: hashPassword(password) })
    .where(eq(users.id, row.userId))
    .returning();
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
