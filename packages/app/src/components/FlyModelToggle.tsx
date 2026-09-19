"use client";

import { useLabStore } from "@/lib/store";

/**
 * Toggle for the real-anatomy fly body viewer (TuragaLab/flybody meshes,
 * Apache-2.0 — see public/assets/ASSET-MANIFEST.md). The model is assembled
 * from the published MuJoCo rig poses and shown at real scale next to the
 * connectome point cloud. This is anatomy for context — no dynamics claim:
 * behavior comes only from the precomputed model runs.
 */
export default function FlyModelToggle() {
  const showFly = useLabStore((s) => s.showFly);
  const setShowFly = useLabStore((s) => s.setShowFly);

  return (
    <div className="pointer-events-auto absolute left-6 top-24 z-20 flex flex-col items-start gap-2">
      <button
        type="button"
        aria-pressed={showFly}
        onClick={() => setShowFly(!showFly)}
        className={`rounded-lg border px-3 py-1.5 text-xs backdrop-blur-md transition-colors ${
          showFly
            ? "border-amber-500 bg-amber-500/15 text-amber-400"
            : "border-neutral-800 bg-neutral-950/70 text-neutral-300 hover:border-neutral-600 hover:text-foreground"
        }`}
      >
        {showFly ? "Hide real fly body" : "Show real fly body"}
      </button>
      {showFly && (
        <p className="max-w-[220px] rounded-md border border-neutral-800/60 bg-neutral-950/70 px-2 py-1 text-[10px] leading-snug text-neutral-500 backdrop-blur-md">
          Real <em>Drosophila</em> anatomy — flybody meshes (TuragaLab, Apache-2.0)
          assembled with the published rig poses. Anatomy only: no behavior is
          claimed for this body.
        </p>
      )}
    </div>
  );
}
