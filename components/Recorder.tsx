"use client";

import { useEffect, useRef, useState } from "react";

type RecorderState = "idle" | "recording" | "denied" | "unsupported";

const PROMPTS = [
  "Tap and tell today's little story",
  "What made you both smile today?",
  "Any tiny firsts to remember?",
  "What did those little hands discover?",
  "One moment you never want to forget?",
  "What sound did you hear today — a giggle, a babble?",
];

const BAR_COUNT = 9;

export default function Recorder({
  onRecorded,
  uploading,
}: {
  onRecorded: (blob: Blob, mimeType: string) => void;
  uploading: boolean;
}) {
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [promptIdx, setPromptIdx] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => Array(BAR_COUNT).fill(4));
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window !== "undefined" && !("MediaRecorder" in window)) {
      setState("unsupported");
    }
    setPromptIdx(Math.floor(Math.random() * PROMPTS.length));
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      cancelAnimationFrame(rafRef.current);
      audioCtxRef.current?.close().catch(() => {});
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function pickMime(): string {
    // Safari records audio/mp4; Chrome/Firefox do webm/opus.
    for (const m of ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"]) {
      if (MediaRecorder.isTypeSupported(m)) return m;
    }
    return "";
  }

  function startMeter(stream: MediaStream) {
    // Live waveform is a nice-to-have — never let it break recording.
    try {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const next: number[] = [];
        for (let i = 0; i < BAR_COUNT; i++) {
          // Sample low-to-mid voice frequencies across the bins.
          const v = data[2 + i * 2] ?? 0;
          next.push(4 + Math.round((v / 255) * 30));
        }
        setLevels(next);
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      /* meter unavailable — timer alone is fine */
    }
  }

  function stopMeter() {
    cancelAnimationFrame(rafRef.current);
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    setLevels(Array(BAR_COUNT).fill(4));
  }

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMime();
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        stopMeter();
        const type = rec.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        setState("idle");
        setPromptIdx((i) => (i + 1) % PROMPTS.length);
        if (blob.size > 0) onRecorded(blob, type.split(";")[0]);
      };
      recorderRef.current = rec;
      rec.start();
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
      startMeter(stream);
      setState("recording");
    } catch {
      setState("denied");
    }
  }

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    recorderRef.current?.stop();
  }

  const mm = String(Math.floor(elapsed / 60));
  const ss = String(elapsed % 60).padStart(2, "0");

  if (state === "unsupported") {
    return (
      <p className="text-center text-sm text-ink-soft rounded-2xl bg-blush px-4 py-3">
        This browser can&rsquo;t record audio — try Safari or Chrome on your phone.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {state === "recording" ? (
        <button
          onClick={stop}
          aria-label="Stop recording"
          className="recording-pulse h-28 w-28 rounded-full bg-apricot-deep text-white shadow-xl flex items-center justify-center active:scale-95 transition"
        >
          <span className="h-8 w-8 rounded-lg bg-white" />
        </button>
      ) : (
        <button
          onClick={start}
          disabled={uploading}
          aria-label="Start recording"
          className="group h-28 w-28 rounded-full bg-apricot text-white shadow-xl flex items-center justify-center text-5xl transition active:scale-95 hover:scale-105 hover:shadow-2xl disabled:opacity-50"
        >
          {uploading ? (
            <span className="h-9 w-9 rounded-full border-[3px] border-white/40 border-t-white animate-spin" />
          ) : (
            <span className="transition group-hover:-rotate-6">🎙️</span>
          )}
        </button>
      )}

      {/* Live waveform while recording */}
      <div className="h-10 flex items-center gap-1" aria-hidden>
        {state === "recording" ? (
          levels.map((h, i) => (
            <span
              key={i}
              className="w-1.5 rounded-full bg-apricot transition-[height] duration-75"
              style={{ height: `${h}px` }}
            />
          ))
        ) : (
          <span className="text-sm text-ink-soft text-center px-4">
            {uploading ? "Listening to your note…" : PROMPTS[promptIdx]}
          </span>
        )}
      </div>

      {state === "recording" && (
        <p className="text-sm font-medium text-apricot-deep -mt-2">
          {mm}:{ss} · tap to finish
        </p>
      )}

      {state === "denied" && (
        <p className="text-center text-sm rounded-2xl bg-blush px-4 py-3 max-w-xs">
          We need microphone access to record. Enable it for this site in your browser
          settings and try again.
        </p>
      )}
    </div>
  );
}
