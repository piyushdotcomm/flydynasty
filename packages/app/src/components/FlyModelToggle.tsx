"use client";

import { useRef } from "react";
import { useLabStore } from "@/lib/store";

/**
 * View toggle: the brain point cloud (connectome data view) vs the kitchen
 * stage (photoreal diorama the fly lives in). Both views are honest: the
 * brain shows the real 139k-neuron cloud; the stage shows real flybody
 * anatomy in a real-asset environment with model-driven (precomputed)
 * proboscis playback.
 */
export default function ViewToggle() {
  const view = useLabStore((s) => s.view);
  const setView = useLabStore((s) => s.setView);
  const viewRef = useRef(view);
  viewRef.current = view;

  return (
    <div
      className="pointer-events-auto absolute left-6 top-24 z-20 flex overflow-hidden rounded-lg border border-neutral-800 backdrop-blur-md"
      role="group"
      aria-label="Scene view"
    >
      <button
        type="button"
        aria-pressed={view === "brain"}
        onClick={() => setView("brain")}
        className={`px-3 py-1.5 text-xs transition-colors ${
          view === "brain"
            ? "bg-amber-500/15 text-amber-400"
            : "bg-neutral-950/70 text-neutral-300 hover:text-foreground"
        }`}
      >
        Brain
      </button>
      <button
        type="button"
        aria-pressed={view === "stage"}
        onClick={() => setView("stage")}
        className={`border-l border-neutral-800 px-3 py-1.5 text-xs transition-colors ${
          view === "stage"
            ? "bg-amber-500/15 text-amber-400"
            : "bg-neutral-950/70 text-neutral-300 hover:text-foreground"
        }`}
      >
        Stage
      </button>
    </div>
  );
}
