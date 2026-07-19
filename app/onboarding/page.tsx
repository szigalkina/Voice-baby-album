"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "joining">("idle");
  const [error, setError] = useState<string | null>(null);

  async function createAlbum(e: React.FormEvent) {
    e.preventDefault();
    setState("saving");
    setError(null);
    const res = await fetch("/api/baby", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, birthdate }),
    });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't save — check the fields and try again.");
      setState("idle");
    }
  }

  async function joinAlbum(e: React.FormEvent) {
    e.preventDefault();
    setState("joining");
    setError(null);
    const res = await fetch("/api/invite/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "That code didn't work — check it and try again.");
      setState("idle");
    }
  }

  return (
    <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm fade-up">
        <div className="text-center mb-8">
          <p className="text-5xl mb-4">🍼</p>
          <h1 className="font-display text-3xl font-semibold">Who are we celebrating?</h1>
          <p className="mt-2 text-ink-soft text-sm">
            We use the birth date to organize the album by month of life.
          </p>
        </div>

        <form onSubmit={createAlbum}>
          <label className="block text-sm font-medium mb-1.5">Baby&rsquo;s name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Mila"
            className="w-full rounded-2xl border border-cream bg-white/80 px-5 py-4 outline-none focus:border-apricot focus:ring-2 focus:ring-apricot/30"
          />
          <label className="block text-sm font-medium mb-1.5 mt-4">Birth date</label>
          <input
            required
            type="date"
            value={birthdate}
            onChange={(e) => setBirthdate(e.target.value)}
            className="w-full rounded-2xl border border-cream bg-white/80 px-5 py-4 outline-none focus:border-apricot focus:ring-2 focus:ring-apricot/30"
          />
          <button
            type="submit"
            disabled={state !== "idle"}
            className="mt-6 w-full rounded-2xl bg-apricot px-5 py-4 text-white font-semibold shadow-md active:scale-[0.98] transition disabled:opacity-60"
          >
            {state === "saving" ? "Saving…" : "Start the album"}
          </button>
        </form>

        <div className="my-7 flex items-center gap-3 text-xs text-ink-soft">
          <span className="h-px flex-1 bg-cream" />
          or join an existing album
          <span className="h-px flex-1 bg-cream" />
        </div>

        <form onSubmit={joinAlbum} className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Invite code"
            className="flex-1 rounded-2xl border border-cream bg-white/80 px-5 py-3.5 uppercase tracking-widest outline-none focus:border-sage focus:ring-2 focus:ring-sage/30"
          />
          <button
            type="submit"
            disabled={state !== "idle" || !code.trim()}
            className="rounded-2xl bg-sage px-5 py-3.5 text-white font-semibold shadow-md active:scale-[0.98] transition disabled:opacity-60"
          >
            {state === "joining" ? "…" : "Join"}
          </button>
        </form>

        {error && (
          <p className="mt-4 text-sm text-center text-apricot-deep">{error}</p>
        )}
      </div>
    </main>
  );
}
