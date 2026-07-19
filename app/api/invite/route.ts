import { NextResponse } from "next/server";
import crypto from "crypto";
import { invites } from "@/lib/schema";
import { requireBaby } from "@/lib/guard";

// Unambiguous characters only — this code is read aloud between parents.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function makeCode(): string {
  const bytes = crypto.randomBytes(6);
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");
}

export async function POST() {
  try {
    const { baby, db } = await requireBaby();
    const code = makeCode();
    await db.insert(invites).values({ code, babyId: baby.id });
    return NextResponse.json({ code });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
