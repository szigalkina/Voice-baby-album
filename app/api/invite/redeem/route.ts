import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { babyMembers, invites } from "@/lib/schema";
import { getBabyForUser, requireUser } from "@/lib/guard";

export async function POST(req: Request) {
  try {
    const userId = await requireUser();
    const { code } = await req.json();
    if (typeof code !== "string" || !code.trim()) {
      return NextResponse.json({ error: "Invite code required" }, { status: 400 });
    }
    const db = await getDb();
    const existing = await getBabyForUser(db, userId);
    if (existing) {
      return NextResponse.json(
        { error: "You already have an album on this account" },
        { status: 409 }
      );
    }
    const [invite] = await db
      .select()
      .from(invites)
      .where(eq(invites.code, code.trim().toUpperCase()));
    if (!invite) {
      return NextResponse.json({ error: "That code doesn't look right" }, { status: 404 });
    }
    await db.insert(babyMembers).values({ babyId: invite.babyId, userId });
    await db.delete(invites).where(eq(invites.code, invite.code));
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
