"use client";

import { useEffect, useState } from "react";
import { loadGraphMeta, type GraphMeta } from "@/lib/data";
import { useLabStore } from "@/lib/store";

/**
 * Status card with only REAL numbers: graph counts from graph-meta.json,
 * model parameters as actually used by the export, and the honest coordinate-
 * space note. No invented claims.
 */
export default function StatusCard() {
  const selectedId = useLabStore((s) => s.selectedId);
  const phase = useLabStore((s) => s.phase);
  const [meta, setMeta] = useState<GraphMeta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGraphMeta()
      .then(setMeta)
      .catch((err) => setError(String((err as Error)?.message ?? err)));
  }, []);

  const n = meta?.graph.n_neurons;
  return (
    <section
      aria-label="Simulation status"
      className="pointer-events-auto absolute bottom-6 right-6 z-20 w-72 rounded-xl border border-neutral-800/80 bg-neutral-950/70 p-4 backdrop-blur-md"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-widest text-neutral-400">
          Live Status
        </h2>
        <span
          className={`inline-flex h-2 w-2 rounded-full ${
            phase === "ready" ? "bg-emerald-500" : "animate-pulse bg-amber-500"
          }`}
          aria-hidden="true"
        />
      </div>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-neutral-500">Neurons</dt>
          <dd className="font-mono text-foreground">
            {n ? n.toLocaleString("en-US") : "—"}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-neutral-500">Synapses</dt>
          <dd className="font-mono text-foreground">
            {meta ? meta.graph.total_synapses.toLocaleString("en-US") : "—"}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-neutral-500">Edges (E / I)</dt>
          <dd className="font-mono text-neutral-300">
            {meta
              ? `${(meta.graph.sign.excitatory / 1e6).toFixed(1)}M / ${(meta.graph.sign.inhibitory / 1e6).toFixed(1)}M`
              : "—"}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-neutral-500">Model</dt>
          <dd className="font-mono text-neutral-300">
            LIF · W<sub>syn</sub> 0.275 mV
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-neutral-500">Selection</dt>
          <dd className="font-mono text-amber-500/90">{selectedId ?? "—"}</dd>
        </div>
      </dl>
      <p className="mt-3 border-t border-neutral-800/80 pt-2 text-[11px] leading-snug text-neutral-500">
        Connectome: FlyWire release 783 (Dorkenwald et al. 2024); signs from
        Eckstein et al. 2024. Model: Shiu et al. 2024. Soma coordinates are in
        raw FlyWire space (not atlas-registered).{error ? ` meta: ${error}` : ""}
      </p>
    </section>
  );
}
