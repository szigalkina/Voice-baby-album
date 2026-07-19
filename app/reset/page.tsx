"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import WaveMark from "@/components/WaveMark";

const FIELD =
  "w-full rounded-[2px] border border-hairline bg-paper px-5 py-4 text-base outline-none focus:border-ink transition-colors";

function RequestForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [devLink, setDevLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setDevLink(data.devLink ?? null);
      setState("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setState("idle");
    }
  }

  if (state === "sent") {
    return (
      <div className="text-center">
        <p className="font-display italic text-[22px]">check your email</p>
        <p className="mt-2 text-sm text-ink-soft">
          if an account exists for {email}, a reset link is on its way
        </p>
        {devLink && (
          <a
            href={devLink}
            className="mt-5 inline-block bg-ink text-bone label-caps px-6 py-3.5 rounded-[2px]"
          >
            dev mode: open reset link
          </a>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-ink-soft text-center mb-5">
        enter your email and we&rsquo;ll send a link to choose a new password
      </p>
      <input
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className={FIELD}
      />
      <button
        type="submit"
        disabled={state === "busy"}
        className="w-full bg-ink text-bone label-caps py-4 rounded-[2px] active:scale-[0.99] transition disabled:opacity-40"
      >
        {state === "busy" ? "one moment…" : "send reset link"}
      </button>
      {error && <p className="text-sm text-center text-umber">{error}</p>}
    </form>
  );
}

function NewPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="new password (8+ characters)"
        className={FIELD}
      />
      <button
        type="submit"
        disabled={busy}
        className="w-full bg-ink text-bone label-caps py-4 rounded-[2px] active:scale-[0.99] transition disabled:opacity-40"
      >
        {busy ? "one moment…" : "set new password"}
      </button>
      {error && <p className="text-sm text-center text-umber">{error}</p>}
    </form>
  );
}

function ResetInner() {
  const token = useSearchParams().get("token");
  return (
    <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm fade-up">
        <div className="text-center mb-8">
          <WaveMark className="mb-6" />
          <h1 className="font-display italic text-[30px]">
            {token ? "choose a new password" : "forgot your password?"}
          </h1>
        </div>
        {token ? <NewPasswordForm token={token} /> : <RequestForm />}
        <p className="mt-6 text-center">
          <a href="/signin" className="label-caps text-ink-soft underline underline-offset-4">
            back to sign in
          </a>
        </p>
      </div>
    </main>
  );
}

export default function ResetPage() {
  return (
    <Suspense>
      <ResetInner />
    </Suspense>
  );
}
