import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { babies } from "@/lib/schema";
import { getBabyForUser, requireUser } from "@/lib/guard";

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
    const existing = await getBabyForUser(db, userId);
    if (existing) {
      return NextResponse.json({ error: "Baby already exists" }, { status: 409 });
    }
    const [baby] = await db
      .insert(babies)
      .values({ userId, name: name.trim(), birthdate })
      .returning();
    return NextResponse.json({ baby });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
