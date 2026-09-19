"use client";

import { useEffect, useState } from "react";
import { loadTrace, type TraceFile } from "@/lib/data";
import { useLabStore } from "@/lib/store";

/**
 * Playback HUD for the selected precomputed run: a time scrubber over the
 * canonical-trial raster (0–1000 ms of the model trial) with the run's label
 * and readouts. All numbers come from trace-*.json — nothing is simulated.
 *
 * The scrubber controls scene playback: SceneCanvas reads `playheadMs` from
 * the store each frame and shows spikes up to that time (if a spatial layer
 * is active). Raster rows here mirror the exported top responders.
 */
export default function TracePlayback() {
  const selectedId = useLabStore((s) => s.selectedId);
  const playheadMs = useLabStore((s) => s.playheadMs);
  const setPlayhead = useLabStore((s) => s.setPlayhead);
  const playing = useLabStore((s) => s.playing);
  const setPlaying = useLabStore((s) => s.setPlaying);
  const [trace, setTrace] = useState<TraceFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId) {
      setTrace(null);
      setError(null);
      return;
    }
    let cancelled = false;
    loadTrace({ id: selectedId, file: `trace-${selectedId}.json` } as never)
      .then((t) => {
        if (!cancelled) {
          setTrace(t);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(String((err as Error)?.message ?? err));
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  // advance the playhead while playing
  useEffect(() => {
    if (!playing || !trace) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      const next = useLabStore.getState().playheadMs + dt * 2; // 2x: 1 s trial in 0.5 s
      if (next >= trace.condition.durationMs) {
        setPlayhead(trace.condition.durationMs);
        setPlaying(false);
        return;
      }
      setPlayhead(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, trace, setPlayhead, setPlaying]);

  if (!selectedId) return null;

  const duration = trace?.condition.durationMs ?? 1000;
  const progress = Math.min(100, (playheadMs / duration) * 100);

  return (
    <div
      className="pointer-events-auto absolute bottom-6 left-1/2 z-20 w-[min(480px,60vw)] -translate-x-1/2 rounded-xl border border-neutral-800/80 bg-neutral-950/70 p-3 backdrop-blur-md"
      role="group"
      aria-label="Trace playback controls"
    >
      {error && (
        <p role="alert" className="text-[11px] text-red-300">
          {error}
        </p>
      )}
      {!trace && !error && (
        <p className="text-[11px] text-neutral-500">Loading run…</p>
      )}
      {trace && (
        <>
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-[11px] font-medium text-neutral-300">
              {trace.condition.label}
            </span>
            <span className="font-mono text-[10px] text-neutral-500">
              {(playheadMs / 1000).toFixed(2)} s / {(duration / 1000).toFixed(1)} s
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={duration}
            step={10}
            value={Math.round(playheadMs)}
            onChange={(e) => {
              setPlaying(false);
              setPlayhead(Number(e.target.value));
            }}
            aria-label="Trial time"
            className="mt-2 w-full accent-amber-500"
          />
          <div className="mt-1 h-0.5 w-full overflow-hidden rounded bg-neutral-800">
            <div className="h-full bg-amber-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (!playing && playheadMs >= duration) setPlayhead(0);
                setPlaying(!playing);
              }}
              className="rounded-md border border-neutral-700 px-3 py-1 text-[11px] text-neutral-200 transition-colors hover:border-amber-500 hover:text-amber-400"
            >
              {playing ? "Pause" : playheadMs >= duration ? "Replay" : "Play"}
            </button>
            <p className="text-[10px] leading-snug text-neutral-500">
              Playback of the offline full-model run — canonical trial
              {trace.condition.shuffledConnectivity ? " (shuffled control)" : ""}.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
