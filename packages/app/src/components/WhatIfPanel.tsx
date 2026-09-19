"use client";

/**
 * The What-If Lab panel — Phase 4's interactive experiment (doc 09 §4 hero
 * interaction, §5.2 strategy 2). Pick a taste stimulus and a drive rate, press
 * Run, and the recruited-subgraph LIF model runs LIVE in a web worker
 * (sim-core, paper parameters). The result is an in-silico experiment on an
 * approximation of the connectome — labeled as such everywhere, and validated
 * against the precomputed full-model run (the "how close is it?" number).
 */
import { useEffect, useRef, useState } from "react";
import { useLabStore } from "@/lib/store";

const GROUPS: Array<{ id: string; label: string }> = [
  { id: "sugar_grns", label: "Sugar GRNs" },
  { id: "water_grns", label: "Water GRNs" },
  { id: "bitter_grns", label: "Bitter GRNs" },
  { id: "lowsalt_grns", label: "Low-salt (Ir94e) GRNs" },
  { id: "proboscis_mns", label: "Proboscis motor neurons" },
];

const RATES = [10, 30, 50, 100, 200];

interface Report {
  kind: "run" | "validate";
  group: string;
  rateHz: number;
  nNodes: number;
  nEdges: number;
  computeMs: number;
  responders: { mainIdx: number[]; meanRateHz: number[] };
  readouts: Array<{ name: string; meanHz: number; firesByTrial: number }>;
  validation?: {
    subMn9rHz: number;
    fullMn9rHz: number;
    subResponders: number;
    fullResponders: number;
    captured: number;
  };
}

export default function WhatIfPanel() {
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState("sugar_grns");
  const [rateHz, setRateHz] = useState(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const setWhatIf = useLabStore((s) => s.setWhatIf);
  const setWhatIfRunning = useLabStore((s) => s.setWhatIfRunning);
  const whatIfGroup = useLabStore((s) => s.whatIfGroup);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const run = (kind: "run" | "validate") => {
    setError(null);
    setBusy(true);
    setReport(null);
    setWhatIfRunning(true);
    workerRef.current?.terminate();
    const worker = new Worker(new URL("../lib/whatif.worker.ts", import.meta.url));
    workerRef.current = worker;
    worker.onmessage = (ev: MessageEvent<{ ok: boolean; report?: Report; error?: string }>) => {
      setBusy(false);
      setWhatIfRunning(false);
      if (!ev.data.ok || !ev.data.report) {
        setError(ev.data.error ?? "unknown worker error");
        return;
      }
      const rep = ev.data.report;
      setReport(rep);
      // highlight the live responders in the scene (magenta, rate-weighted)
      const rates = rep.responders.meanRateHz;
      const max = rates.length ? Math.max(...rates) : 0;
      setWhatIf(
        rep.group,
        rep.responders.mainIdx,
        rates.map((r) => (max > 0 ? 0.25 + 0.75 * (r / max) : 1)),
      );
    };
    worker.onerror = (e) => {
      setBusy(false);
      setWhatIfRunning(false);
      setError(e.message || "worker failed to start");
    };
    // validate always runs the sugar@100 reference: it is the one condition
    // with a precomputed full-model twin to compare against
    const req = kind === "validate" ? { group: "sugar_grns", rateHz: 100 } : { group, rateHz };
    worker.postMessage({ kind, ...req, trials: 3, seed: 0xC0FFEE });
  };

  const clear = () => {
    setReport(null);
    setWhatIf(null, null, null);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pointer-events-auto absolute right-6 bottom-6 z-20 rounded-lg border border-neutral-800 bg-neutral-950/70 px-3 py-1.5 text-xs text-neutral-300 backdrop-blur-md transition-colors hover:border-amber-500 hover:text-amber-400"
      >
        What-if lab (live approximation)
      </button>
    );
  }

  return (
    <section
      aria-label="What-if lab"
      className="pointer-events-auto absolute right-6 bottom-6 z-20 max-h-[72dvh] w-96 overflow-y-auto rounded-xl border border-neutral-800/80 bg-neutral-950/70 p-4 backdrop-blur-md"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-widest text-neutral-400">
          What-If Lab — live approximation
        </h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-neutral-500 transition-colors hover:text-neutral-300"
          aria-label="Close what-if lab"
        >
          ✕
        </button>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-neutral-500">
        Runs the real LIF model <em>live</em> on a recruited subgraph of the
        connectome (k-hop, syn≥3 around the taste seeds). This is an
        approximation; the precomputed runs in the dock are the full-model
        reference.
      </p>

      <div className="mt-3 space-y-2">
        <label className="block text-[11px] text-neutral-400">
          Stimulus group
          <select
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-800 bg-neutral-900/60 px-2 py-1.5 text-xs text-neutral-200 focus:border-amber-500 focus:outline-none"
          >
            {GROUPS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
        <div className="text-[11px] text-neutral-400">
          Drive rate
          <div className="mt-1 flex gap-1">
            {RATES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRateHz(r)}
                className={`flex-1 rounded-md border px-1 py-1 font-mono text-[11px] transition-colors ${
                  rateHz === r
                    ? "border-amber-500 bg-amber-500/15 text-amber-400"
                    : "border-neutral-800 bg-neutral-900/60 text-neutral-300 hover:border-neutral-600"
                }`}
              >
                {r} Hz
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setWhatIf(null, null, null);
              run("run");
            }}
            className="flex-1 rounded-md border border-amber-500/60 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
          >
            {busy ? "Computing…" : "Run live"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setWhatIf(null, null, null);
              run("validate");
            }}
            className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 transition-colors hover:border-neutral-500 disabled:opacity-50"
            title="Runs sugar @ 100 Hz live and compares it with the precomputed full-model run"
          >
            Validate
          </button>
          {whatIfGroup && (
            <button
              type="button"
              onClick={clear}
              className="rounded-md border border-neutral-800 px-3 py-1.5 text-xs text-neutral-400 transition-colors hover:border-neutral-600"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-md border border-red-900 bg-red-950/40 px-2 py-1 text-[11px] text-red-300">
          {error}
        </p>
      )}

      {report && (
        <div className="mt-3 space-y-2 border-t border-neutral-800/80 pt-3">
          <p className="text-[11px] text-neutral-400">
            {report.nNodes.toLocaleString("en-US")} neurons ·{" "}
            {report.nEdges.toLocaleString("en-US")} edges · computed live in{" "}
            {(report.computeMs / 1000).toFixed(1)} s
          </p>
          <dl className="space-y-1 text-[11px]">
            {report.readouts.slice(0, 4).map((r) => (
              <div key={r.name} className="flex items-center justify-between">
                <dt className="text-neutral-500">{r.name}</dt>
                <dd className="font-mono text-neutral-200">
                  {r.meanHz} Hz · fires {r.firesByTrial}/3
                </dd>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <dt className="text-neutral-500">Responding neurons</dt>
              <dd className="font-mono text-neutral-200">
                {report.responders.mainIdx.length.toLocaleString("en-US")}
              </dd>
            </div>
          </dl>
          {report.validation && (
            <div className="rounded-md border border-emerald-900/60 bg-emerald-950/20 px-2 py-1.5 text-[11px] leading-snug text-emerald-200">
              <p className="font-medium">Approximation check (sugar @ 100 Hz, live vs precomputed)</p>
              <p className="mt-0.5 text-emerald-300/90">
                MN9_r on subgraph {report.validation.subMn9rHz} Hz vs full model{" "}
                {report.validation.fullMn9rHz} Hz · captures{" "}
                {report.validation.captured.toLocaleString("en-US")} of{" "}
                {report.validation.fullResponders.toLocaleString("en-US")} full-model responders
              </p>
            </div>
          )}
          <p className="text-[10px] leading-snug text-neutral-600">
            Live result on the recruited subgraph — an approximation of the
            full connectome, not the paper&apos;s exact run. Responders glow
            magenta in the scene.
          </p>
        </div>
      )}
    </section>
  );
}
