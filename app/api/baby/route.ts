import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { babies } from "@/lib/schema";
import { getBabyForUser, requireBaby, requireUser } from "@/lib/guard";

// The ACTIVE album (see /api/albums for the full list).
export async function GET() {
  try {
    const userId = await requireUser();
    const db = await getDb();
    const baby = await getBabyForUser(db, userId);
    return NextResponse.json({ baby: baby ?? null });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Edit the active album's cover title (empty string resets to the default).
export async function PATCH(req: Request) {
  try {
    const { baby, db } = await requireBaby();
    const body = await req.json();
    if (typeof body.title !== "string") {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }
    const title = body.title.trim() || null;
    const [updated] = await db
      .update(babies)
      .set({ title })
      .where(eq(babies.id, baby.id))
      .returning();
    return NextResponse.json({ baby: updated });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
