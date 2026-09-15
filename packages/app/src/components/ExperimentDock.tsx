"use client";

import { useEffect, useState } from "react";
import { loadTracesIndex, loadTrace, loadGate, type TraceIndexEntry, type TraceFile, type GateFile } from "@/lib/data";
import { useLabStore } from "@/lib/store";
import RasterStrip from "@/components/RasterStrip";

interface Selection {
  entry: TraceIndexEntry;
  trace: TraceFile;
}

/**
 * Experiment dock: choose among PRECOMPUTED model runs (pipelines/
 * export_traces.ts). Nothing is simulated in the browser; each run is the
 * real LIF model on the real connectome, and the UI says so.
 */
export default function ExperimentDock() {
  const selectedId = useLabStore((s) => s.selectedId);
  const setSelected = useLabStore((s) => s.setSelected);
  const [entries, setEntries] = useState<TraceIndexEntry[] | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gate, setGate] = useState<GateFile | null>(null);
  const [indexInfo, setIndexInfo] = useState<{ complete: boolean; missing: string[] } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [idx, g] = await Promise.all([loadTracesIndex(), loadGate()]);
        setEntries(idx.conditions);
        setIndexInfo({ complete: idx.complete, missing: idx.missing });
        setGate(g);
      } catch (err) {
        setError(String((err as Error)?.message ?? err));
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedId || !entries) return;
    const entry = entries.find((e) => e.id === selectedId);
    if (!entry) return;
    let cancelled = false;
    setBusy(true);
    setError(null);
    loadTrace(entry)
      .then((trace) => {
        if (!cancelled) setSelection({ entry, trace });
      })
      .catch((err) => {
        if (!cancelled) setError(String((err as Error)?.message ?? err));
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, entries]);

  return (
    <section
      aria-label="Experiment dock"
      className="pointer-events-auto absolute bottom-6 left-6 z-20 max-h-[62dvh] w-80 overflow-y-auto rounded-xl border border-neutral-800/80 bg-neutral-950/70 p-4 backdrop-blur-md"
    >
      <h2 className="text-xs font-medium uppercase tracking-widest text-neutral-400">
        Experiment Dock
      </h2>
      <p className="mt-1 text-[11px] leading-snug text-neutral-500">
        Precomputed runs of the real Shiu et al. 2024 LIF model on the real
        FlyWire connectome (not live-simulated in your browser).
      </p>

      {error && (
        <p role="alert" className="mt-2 rounded-md border border-red-900 bg-red-950/40 px-2 py-1 text-[11px] text-red-300">
          {error}
        </p>
      )}

      <div className="mt-3 space-y-1.5">
        {entries === null && !error && (
          <p className="text-xs text-neutral-500">Loading model runs…</p>
        )}
        {entries?.map((entry) => {
          const isActive = selectedId === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              data-condition={entry.id}
              onClick={() => setSelected(isActive ? null : entry.id)}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                isActive
                  ? "border-amber-500 bg-amber-500/15 text-amber-400"
                  : "border-neutral-800 bg-neutral-900/60 text-neutral-300 hover:border-neutral-600 hover:text-foreground"
              }`}
            >
              <span className="block font-medium">{entry.label}</span>
              <span className="mt-0.5 block font-mono text-[10px] text-neutral-500">
                {entry.trials} trials · {entry.respondingNeurons.toLocaleString("en-US")} responding · MN9_r {entry.mn9rMeanHz} Hz
                {entry.shuffled ? " · shuffled control" : ""}
              </span>
            </button>
          );
        })}
      </div>

      {busy && <p className="mt-3 text-[11px] text-amber-500/90">Loading trace…</p>}

      {indexInfo && !indexInfo.complete && (
        <p className="mt-3 rounded-md border border-amber-800 bg-amber-950/30 px-2 py-1 text-[10px] leading-snug text-amber-300">
          Partial export: {indexInfo.missing.length} condition(s) still computing
          ({indexInfo.missing.slice(0, 3).join(", ")}
          {indexInfo.missing.length > 3 ? ", …" : ""}). Shown results are final.
        </p>
      )}

      <Detail selection={selection} gate={gate} />
    </section>
  );
}

function Detail({
  selection,
  gate,
}: {
  selection: Selection | null;
  gate: GateFile | null;
}) {
  if (!selection) {
    return gate ? (
      <p className="mt-3 border-t border-neutral-800/80 pt-2 text-[10px] leading-snug text-neutral-500">
        Paper checks: {gate.passed}/{gate.total} pass
        {gate.complete && gate.passed === gate.total ? " ✓" : " — see About page"}
      </p>
    ) : null;
  }
  const trace = selection.trace;
  return (
    <div className="mt-3 border-t border-neutral-800/80 pt-3">
      <p className="text-[11px] font-medium text-neutral-300">{trace.condition.label}</p>
      <p className="mt-1 text-[11px] leading-snug text-neutral-500">{trace.condition.paper}</p>
      {trace.condition.note && (
        <p className="mt-1 text-[11px] italic leading-snug text-neutral-500">
          {trace.condition.note}
        </p>
      )}
      <dl className="mt-2 space-y-1 text-[11px]">
        {trace.readouts.slice(0, 2).map((r) => (
          <div key={r.name} className="flex items-center justify-between">
            <dt className="text-neutral-500">
              {r.name} ({r.type})
            </dt>
            <dd className="font-mono text-neutral-300">
              {r.meanHz} Hz · fires {r.firesByTrial}/{r.perTrialHz.length}
            </dd>
          </div>
        ))}
        <div className="flex items-center justify-between">
          <dt className="text-neutral-500">Responding neurons</dt>
          <dd className="font-mono text-neutral-300">
            {trace.responders.count.toLocaleString("en-US")}
          </dd>
        </div>
      </dl>
      <RasterStrip raster={trace.raster} />
      <p className="mt-2 text-[10px] leading-snug text-neutral-600">
        {trace.condition.stimuli.length === 0
          ? "No drive: the model's baseline-silence claim, verified per run."
          : `Poisson drive at ${trace.condition.stimuli
              .map((s) => `${s.rateHz} Hz`)
              .join(" + ")} to ${trace.condition.stimuli
              .map((s) => s.nIds)
              .join("+")} seed neurons.`}
        {trace.condition.silence
          ? ` Ablation: ${trace.condition.silence.label}.`
          : ""}
      </p>
    </div>
  );
}
