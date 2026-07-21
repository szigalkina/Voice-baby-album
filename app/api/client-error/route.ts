import { NextResponse } from "next/server";
import { sendOpsAlert } from "@/lib/alert";
import { clientIp, rateLimit } from "@/lib/ratelimit";

// Browser-side errors land here and become ops emails (per-subject 1/hour
// cooldown in sendOpsAlert keeps the volume sane). Without this, phone-only
// failures are invisible until the owner happens to screenshot one.
export async function POST(req: Request) {
  try {
    if (!rateLimit(`cerr:${clientIp(req)}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json({ ok: true });
    }
    const body = await req.json().catch(() => null);
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    if (!message) return NextResponse.json({ error: "message required" }, { status: 400 });
    const page = typeof body?.url === "string" ? body.url.slice(0, 200) : "?";
    await sendOpsAlert(
      "client-side error",
      `A browser hit an error in the app:\n\n"${message.slice(0, 500)}"\n\npage: ${page}\nuser-agent: ${(req.headers.get("user-agent") ?? "?").slice(0, 200)}`
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // error reporting must never error
  }
}
