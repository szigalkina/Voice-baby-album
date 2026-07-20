import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { babies, entries, users } from "@/lib/schema";
import { ALBUM_COOKIE, getBabiesForUser, getBabyForUser, requireUser } from "@/lib/guard";

export async function GET() {
  try {
    const userId = await requireUser();
    const db = await getDb();
    const list = await getBabiesForUser(db, userId);
    const active = await getBabyForUser(db, userId);
    const [me] = await db.select().from(users).where(eq(users.id, userId));

    const ids = list.map((b: typeof babies.$inferSelect) => b.id);
    const allEntries = ids.length
      ? await db
          .select({ id: entries.id, babyId: entries.babyId })
          .from(entries)
          .where(inArray(entries.babyId, ids))
      : [];
    const withCounts = list.map((b: typeof babies.$inferSelect) => ({
      id: b.id,
      name: b.name,
      birthdate: b.birthdate,
      title: b.title,
      entryCount: allEntries.filter(
        (e: { babyId: string }) => e.babyId === b.id
      ).length,
    }));
    return NextResponse.json({
      albums: withCounts,
      activeId: active?.id ?? null,
      email: me?.email ?? null,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUser();
    const { name, birthdate } = await req.json();
    if (!name?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(birthdate ?? "")) {
      return NextResponse.json(
        { error: "Name and birthdate (YYYY-MM-DD) required" },
        { status: 400 }
      );
    }
    const db = await getDb();
    const [baby] = await db
      .insert(babies)
      .values({ userId, name: name.trim(), birthdate })
      .returning();
    (await cookies()).set(ALBUM_COOKIE, baby.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
    return NextResponse.json({ album: baby });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
