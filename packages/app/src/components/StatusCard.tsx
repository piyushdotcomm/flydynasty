"use client";

import { useLabStore } from "@/lib/store";

export default function StatusCard() {
  const isSimulating = useLabStore((s) => s.isSimulating);
  const lastResult = useLabStore((s) => s.lastResult);

  return (
    <section
      aria-label="Simulation status"
      className="pointer-events-auto absolute bottom-6 right-6 z-20 w-64 rounded-xl border border-neutral-800/80 bg-neutral-950/70 p-4 backdrop-blur-md"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-widest text-neutral-400">
          Live Status
        </h2>
        <span
          className={`inline-flex h-2 w-2 rounded-full ${
            isSimulating ? "animate-pulse bg-amber-500" : "bg-neutral-600"
          }`}
          aria-hidden="true"
        />
      </div>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-neutral-500">Population</dt>
          <dd className="font-mono text-foreground">1 fly</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-neutral-500">Neurons</dt>
          <dd className="font-mono text-foreground">139,243</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-neutral-500">Generation</dt>
          <dd className="font-mono text-neutral-500">n/a — real model</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-neutral-500">Last result</dt>
          <dd className="font-mono text-amber-500/90">
            {lastResult
              ? `${lastResult.stimulus} · ${lastResult.respondingNeurons} neurons`
              : "—"}
          </dd>
        </div>
      </dl>
      <p className="mt-3 border-t border-neutral-800/80 pt-2 text-[11px] leading-snug text-neutral-500">
        Connectome: FlyWire (Dorkenwald et al. 2024). Model: Shiu et al. 2024,
        LIF, &gt;90% optogenetic match.
      </p>
    </section>
  );
}
