import { NextResponse } from "next/server";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { babies } from "@/lib/schema";
import { requireBaby } from "@/lib/guard";

function shareUrl(req: Request, token: string) {
  const base = process.env.APP_URL ?? new URL(req.url).origin;
  return `${base}/shared/${token}`;
}

export async function GET(req: Request) {
  try {
    const { baby } = await requireBaby();
    return NextResponse.json({
      url: baby.shareToken ? shareUrl(req, baby.shareToken) : null,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { baby, db } = await requireBaby();
    const token = crypto.randomBytes(16).toString("hex");
    await db.update(babies).set({ shareToken: token }).where(eq(babies.id, baby.id));
    return NextResponse.json({ url: shareUrl(req, token) });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { baby, db } = await requireBaby();
    await db.update(babies).set({ shareToken: null }).where(eq(babies.id, baby.id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
