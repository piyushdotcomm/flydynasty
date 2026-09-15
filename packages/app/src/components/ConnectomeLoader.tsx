"use client";

import { useLabStore } from "@/lib/store";

const PHASE_TEXT: Record<string, string> = {
  idle: "Connecting…",
  "loading-meta": "Loading graph metadata (real FlyWire bundle)…",
  "loading-neurons": "Loading 139,248 neuron soma positions…",
  "loading-index": "Loading model-run index…",
  ready: "Ready",
  error: "Failed to load real model data",
};

/**
 * Loading overlay driven by ACTUAL data loading (store phase) — no fake
 * progress bars. Shows the real error if the data files cannot be fetched.
 */
export default function ConnectomeLoader() {
  const phase = useLabStore((s) => s.phase);
  const error = useLabStore((s) => s.error);

  if (phase === "ready") return null;
  const isError = phase === "error";
  const text = PHASE_TEXT[phase] ?? PHASE_TEXT.idle;

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#050507]">
      <p className="font-mono text-sm text-neutral-300">{text}</p>
      {!isError && (
        <div
          role="progressbar"
          aria-label="Loading connectome data"
          className="mt-4 h-1 w-64 overflow-hidden rounded-full bg-neutral-800"
        >
          <div className="loader-bar h-full origin-left rounded-full bg-amber-500" />
        </div>
      )}
      {isError && (
        <p role="alert" className="mt-4 max-w-md rounded-md border border-red-900 bg-red-950/40 px-3 py-2 text-center text-xs text-red-300">
          {error ?? "Unknown error"} — the precomputed model data under /data/ is
          required; without it nothing is displayed rather than showing a mock.
        </p>
      )}
      <p className="mt-3 font-mono text-[11px] text-neutral-500">
        FlyWire · Dorkenwald et al. 2024 · release 783
      </p>
    </div>
  );
}
