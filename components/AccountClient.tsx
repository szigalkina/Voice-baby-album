"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { monthNumber } from "@/lib/months";
import WaveMark from "./WaveMark";

interface Album {
  id: string;
  name: string;
  birthdate: string;
  title: string | null;
  entryCount: number;
}

const OWNER_EMAIL = "szigalkina@gmail.com";

function ageLabel(birthdate: string): string {
  const months = monthNumber(birthdate, new Date()) - 1;
  if (months < 1) return "brand new";
  if (months === 1) return "one month old";
  return `${months} months old`;
}

export default function AccountClient() {
  const router = useRouter();
  const [albums, setAlbums] = useState<Album[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [supportState, setSupportState] = useState<"idle" | "busy" | "sent">("idle");
  const [supportError, setSupportError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/albums")
      .then((r) => r.json())
      .then((d) => {
        setAlbums(d.albums ?? []);
        setActiveId(d.activeId ?? null);
        setEmail(d.email ?? null);
      })
      .catch(() => setAlbums([]));
  }, []);

  async function openAlbum(id: string) {
    const res = await fetch("/api/albums/active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      router.push("/");
      router.refresh();
    }
  }

  async function sendSupport(e: React.FormEvent) {
    e.preventDefault();
    setSupportState("busy");
    setSupportError(null);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (res.ok) {
        setSupportState("sent");
        setMessage("");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (data.error === "email_not_configured") {
        // Fall back to the user's own mail app with the message prefilled.
        const subject = encodeURIComponent("Voice Baby Album — support");
        const body = encodeURIComponent(message);
        window.location.href = `mailto:${OWNER_EMAIL}?subject=${subject}&body=${body}`;
        setSupportState("idle");
        return;
      }
      throw new Error(data.error ?? "Couldn't send");
    } catch (err) {
      setSupportError(err instanceof Error ? err.message : "Couldn't send");
      setSupportState("idle");
    }
  }

  return (
    <main className="relative z-10 mx-auto w-full max-w-md flex-1 px-5 pb-32">
      <header className="pt-9 pb-6 text-center">
        <p className="label-caps text-ink-soft">account</p>
        {email && (
          <p className="font-display italic text-[22px] leading-tight mt-1">{email}</p>
        )}
      </header>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="label-caps text-ink">albums</h2>
          <a
            href="/onboarding"
            className="label-caps text-ink underline underline-offset-4"
          >
            new album
          </a>
        </div>
        {albums === null ? (
          <p className="text-center text-sm text-ink-soft py-6">loading…</p>
        ) : albums.length === 0 ? (
          <div className="text-center py-8 fade-up border border-hairline rounded-[3px] bg-paper">
            <WaveMark className="mb-4" />
            <p className="font-display italic text-[20px] text-ink-soft">
              no albums yet
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {albums.map((a) => (
              <button
                key={a.id}
                onClick={() => openAlbum(a.id)}
                className={`w-full text-left border rounded-[3px] bg-paper px-5 py-4 transition active:scale-[0.99] ${
                  a.id === activeId ? "border-ink" : "border-hairline"
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-display italic text-[24px] leading-tight">
                    {a.name}
                  </span>
                  {a.id === activeId && (
                    <span className="label-caps !text-[9px] text-ink-soft">open now</span>
                  )}
                </div>
                <p className="label-caps !text-[9px] text-ink-soft mt-1">
                  {ageLabel(a.birthdate)} · {a.entryCount}{" "}
                  {a.entryCount === 1 ? "memory" : "memories"}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12 border-t border-hairline pt-8">
        <h2 className="label-caps text-ink mb-3">support</h2>
        {supportState === "sent" ? (
          <p className="font-display italic text-[19px] text-ink-soft fade-up">
            thank you — we&rsquo;ll get back to you soon
          </p>
        ) : (
          <form onSubmit={sendSupport}>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              required
              placeholder="a question, a problem, an idea…"
              className="w-full rounded-[2px] border border-hairline bg-paper px-4 py-3 outline-none focus:border-ink transition-colors text-[15px]"
            />
            <button
              type="submit"
              disabled={supportState === "busy" || !message.trim()}
              className="mt-3 bg-ink text-bone label-caps px-6 py-3.5 rounded-[2px] active:scale-[0.98] transition disabled:opacity-40"
            >
              {supportState === "busy" ? "sending…" : "send message"}
            </button>
            {supportError && <p className="mt-2 text-sm text-umber">{supportError}</p>}
          </form>
        )}
      </section>

      <section className="mt-12 border-t border-hairline pt-8 flex items-center justify-between">
        <a href="/privacy" className="label-caps text-ink-soft underline underline-offset-4">
          privacy
        </a>
        <form action="/api/auth/signout" method="post">
          <button className="label-caps text-ink-soft underline underline-offset-4">
            sign out
          </button>
        </form>
      </section>
    </main>
  );
}
