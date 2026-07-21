"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import WaveMark from "./WaveMark";

interface Album {
  id: string;
  name: string;
  birthdate: string;
  title: string | null;
  entryCount: number;
}

const OWNER_EMAIL = "szigalkina@gmail.com";

function beganLabel(startDate: string): string {
  return `began ${new Date(startDate + "T00:00:00Z").toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  })}`;
}

export default function AccountClient() {
  const router = useRouter();
  const [albums, setAlbums] = useState<Album[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [supportState, setSupportState] = useState<"idle" | "busy" | "sent">("idle");
  const [supportError, setSupportError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  function startEdit(a: Album) {
    setEditingId(a.id);
    setEditName(a.name);
    setEditDate(a.birthdate);
    setEditError(null);
  }

  async function saveAlbum(id: string) {
    setEditBusy(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/albums/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, birthdate: editDate }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.album) throw new Error(data?.error ?? "Couldn't save");
      setAlbums(
        (prev) =>
          prev?.map((a) =>
            a.id === id
              ? { ...a, name: data.album.name, birthdate: data.album.birthdate }
              : a
          ) ?? null
      );
      setEditingId(null);
      router.refresh();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setEditBusy(false);
    }
  }

  async function deleteAlbum(a: Album) {
    const what =
      a.entryCount === 0
        ? "This album is empty."
        : `Its ${a.entryCount} ${a.entryCount === 1 ? "memory" : "memories"} — recordings and photos — will be gone too.`;
    if (!confirm(`Delete the album “${a.name}”? ${what} This cannot be undone.`)) return;
    setEditBusy(true);
    try {
      const res = await fetch(`/api/albums/${a.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Couldn't delete");
      }
      setAlbums((prev) => prev?.filter((x) => x.id !== a.id) ?? null);
      if (activeId === a.id) setActiveId(null);
      setEditingId(null);
      router.refresh();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Couldn't delete");
    } finally {
      setEditBusy(false);
    }
  }

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (
      !confirm(
        "Delete your account forever? Every album you own — all recordings, transcripts and photos — will be permanently erased. This cannot be undone."
      )
    )
      return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Couldn't delete the account");
      router.push("/signin");
      router.refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Couldn't delete the account");
      setDeleteBusy(false);
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
        const subject = encodeURIComponent("Voice Memory Album — support");
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
            {albums.map((a) =>
              editingId === a.id ? (
                <div
                  key={a.id}
                  className="border border-ink rounded-[3px] bg-paper px-5 py-4 fade-up"
                >
                  <label className="label-caps text-ink-soft block mb-1.5">name</label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-[2px] border border-hairline bg-paper px-4 py-3 outline-none focus:border-ink transition-colors"
                  />
                  <label className="label-caps text-ink-soft block mb-1.5 mt-4">
                    when it begins
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full rounded-[2px] border border-hairline bg-paper px-4 py-3 outline-none focus:border-ink transition-colors"
                  />
                  {editError && <p className="mt-3 text-sm text-umber">{editError}</p>}
                  <div className="mt-5 flex items-center justify-between">
                    <button
                      onClick={() => deleteAlbum(a)}
                      disabled={editBusy}
                      className="label-caps text-umber underline underline-offset-4 disabled:opacity-40"
                    >
                      delete album
                    </button>
                    <div className="flex gap-4 items-center">
                      <button
                        onClick={() => setEditingId(null)}
                        className="label-caps text-ink-soft"
                      >
                        cancel
                      </button>
                      <button
                        onClick={() => saveAlbum(a.id)}
                        disabled={editBusy || !editName.trim()}
                        className="bg-ink text-bone label-caps px-5 py-3 rounded-[2px] active:scale-[0.98] transition disabled:opacity-40"
                      >
                        {editBusy ? "saving…" : "save"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  key={a.id}
                  className={`border rounded-[3px] bg-paper px-5 py-4 transition ${
                    a.id === activeId ? "border-ink" : "border-hairline"
                  }`}
                >
                  <button
                    onClick={() => openAlbum(a.id)}
                    className="w-full text-left active:scale-[0.99] transition"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-display italic text-[24px] leading-tight">
                        {a.name}
                      </span>
                      {a.id === activeId && (
                        <span className="label-caps !text-[9px] text-ink-soft">
                          open now
                        </span>
                      )}
                    </div>
                    <p className="label-caps !text-[9px] text-ink-soft mt-1">
                      {beganLabel(a.birthdate)} · {a.entryCount}{" "}
                      {a.entryCount === 1 ? "memory" : "memories"}
                    </p>
                  </button>
                  <div className="mt-2.5 border-t border-hairline pt-2.5 text-right">
                    <button
                      onClick={() => startEdit(a)}
                      className="label-caps !text-[9px] text-ink-soft underline underline-offset-4"
                    >
                      edit
                    </button>
                  </div>
                </div>
              )
            )}
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

      <section className="mt-12 border-t border-hairline pt-8">
        <h2 className="label-caps text-ink mb-3">your data</h2>
        <p className="text-sm text-ink-soft">
          Everything here is yours. Download it, or erase it all.
        </p>
        <div className="mt-3 flex items-center gap-6">
          <a
            href="/api/account/export"
            className="label-caps text-ink underline underline-offset-4"
          >
            download my data
          </a>
          <button
            onClick={() => {
              setDeleteOpen((v) => !v);
              setDeleteError(null);
            }}
            className="label-caps text-umber underline underline-offset-4"
          >
            delete account
          </button>
        </div>
        {deleteOpen && (
          <form
            onSubmit={deleteAccount}
            className="mt-4 border border-hairline rounded-[3px] bg-paper p-5 fade-up"
          >
            <p className="text-sm">
              This erases your account and every album you own — recordings,
              transcripts, photos, everything — immediately and forever.
              Albums you joined by invitation stay with their owner.
            </p>
            <label className="label-caps text-ink-soft block mb-1.5 mt-4">
              confirm with your password
            </label>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              required
              className="w-full rounded-[2px] border border-hairline bg-paper px-4 py-3 outline-none focus:border-ink transition-colors"
            />
            {deleteError && <p className="mt-3 text-sm text-umber">{deleteError}</p>}
            <div className="mt-4 flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                className="label-caps text-ink-soft"
              >
                cancel
              </button>
              <button
                type="submit"
                disabled={deleteBusy || !deletePassword}
                className="bg-umber text-bone label-caps px-5 py-3 rounded-[2px] active:scale-[0.98] transition disabled:opacity-40"
              >
                {deleteBusy ? "erasing…" : "delete forever"}
              </button>
            </div>
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
