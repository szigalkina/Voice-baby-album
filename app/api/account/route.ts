import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { babyMembers, resetTokens, users } from "@/lib/schema";
import { getDb } from "@/lib/db";
import { ALBUM_COOKIE, getBabiesForUser, requireUser } from "@/lib/guard";
import { clearSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { deleteAlbumDeep } from "@/lib/albums";
import { clientIp, rateLimit } from "@/lib/ratelimit";

// GDPR right to erasure: deletes the account and everything it owns —
// albums with all recordings, transcripts, photos and stored files,
// memberships, reset tokens, the user row — then ends the session.
// Albums the user merely joined as a member are NOT deleted (they belong to
// their owner); only the membership link is removed.
export const maxDuration = 300; // many stored files may need deleting

export async function DELETE(req: Request) {
  try {
    if (!rateLimit(`accdel:${clientIp(req)}`, 3, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many attempts, try later" }, { status: 429 });
    }
    const userId = await requireUser();
    const db = await getDb();
    const [me] = await db.select().from(users).where(eq(users.id, userId));
    if (!me) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Deleting everything forever deserves a fresh proof it's really you.
    const { password } = await req.json().catch(() => ({}));
    if (me.passwordHash) {
      if (typeof password !== "string" || !verifyPassword(password, me.passwordHash)) {
        return NextResponse.json({ error: "Password is incorrect" }, { status: 403 });
      }
    }

    const owned = (await getBabiesForUser(db, userId)).filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (b: any) => b.userId === userId
    );
    for (const baby of owned) {
      await deleteAlbumDeep(db, baby.id);
    }
    await db.delete(babyMembers).where(eq(babyMembers.userId, userId));
    await db.delete(resetTokens).where(eq(resetTokens.userId, userId));
    await db.delete(users).where(eq(users.id, userId));

    await clearSession();
    (await cookies()).delete(ALBUM_COOKIE);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
