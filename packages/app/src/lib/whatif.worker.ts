/// <reference lib="webworker" />
/**
 * What-if web worker — the Interactive Lab's live approximation engine
 * (doc 09 §5.2, strategy 2, honestly labeled "live approximation").
 *
 * The stimulus arrives from the UI as a seed-group name + Poisson rate. The
 * recruited subgraph comes from the lab bundle (pipelines/export_lab_bundle.ts
 * — hops=3 through edges with syn_count >= 3 around ALL taste seed groups),
 * and the LIF model (sim-core, paper parameters) runs on it live. Returns
 * compact spike records (lab index + ms), responding neurons (mapped to
 * main-bundle indices), and the readout motor-neuron rates.
 *
 * validate:true also recomputes the offline sugar-100 reference on the
 * subgraph and reports the comparison against the precomputed full-model run
 * (the user-visible approximation-quality number).
 */
import { type Connectome } from "@flylab/sim-core/graph";
import { LIFSim } from "@flylab/sim-core/lif";
import { dataUrl } from "./data";
import { decodeLabBuffer, LAB_MAGIC, type LabData, type LabMeta } from "./whatif-sim";

export interface WhatIfRequest {
  kind: "run" | "validate";
  group: string;
  rateHz: number;
  trials: number;
  seed: number;
}

export interface WhatIfReport {
  kind: "run" | "validate";
  group: string;
  rateHz: number;
  trials: number;
  nNodes: number;
  nEdges: number;
  computeMs: number;
  /** spike records: lab index + ms-from-trial-start, parallel arrays */
  spikeLab: Uint32Array;
  spikeMs: Float32Array;
  /** raw FlyWire soma (nm) per lab index, xyz triples (from the lab bundle) */
  soma: Float32Array;
  responders: {
    /** MAIN bundle node indices, sorted by mean rate desc */
    mainIdx: number[];
    type: string[];
    meanRateHz: number[];
    spikes: number[];
  };
  readouts: Array<{ name: string; meanHz: number; firesByTrial: number }>;
  /** only on validate: sub-sim vs the precomputed full-model sugar-100 run */
  validation?: {
    subMn9rHz: number;
    fullMn9rHz: number;
    subResponders: number;
    fullResponders: number;
    captured: number;
  };
  note: string;
}

/** gz decompress via the native Compression Streams API */
async function gunzip(data: Uint8Array): Promise<ArrayBuffer> {
  const Ctor = (globalThis as { DecompressionStream?: typeof DecompressionStream }).DecompressionStream;
  if (!Ctor) throw new Error("DecompressionStream unavailable in this browser");
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new Ctor("gzip"));
  return await new Response(stream).arrayBuffer();
}

let lab: LabData | null = null;

async function loadLab(): Promise<LabData> {
  const metaRes = await fetch(dataUrl("lab-meta.json"));
  if (!metaRes.ok) throw new Error(`lab-meta.json: HTTP ${metaRes.status}`);
  const meta = (await metaRes.json()) as LabMeta;
  const binRes = await fetch(dataUrl("lab-edges.bin.gz"));
  if (!binRes.ok) throw new Error(`lab-edges.bin.gz: HTTP ${binRes.status}`);
  const raw = new Uint8Array(await binRes.arrayBuffer());
  const buf = await gunzip(raw);
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== LAB_MAGIC) throw new Error("lab bundle: bad magic");
  return decodeLabBuffer(buf, meta);
}

self.onmessage = async (ev: MessageEvent<WhatIfRequest>) => {
  const req = ev.data;
  try {
    if (!lab) lab = await loadLab();
    const g: Connectome = lab.connectome;
    const sim = new LIFSim(g);

    const seedLab = lab.seeds[req.group] ?? [];
    if (seedLab.length === 0) throw new Error(`unknown seed group: ${req.group}`);

    const spikeLab: number[] = [];
    const spikeMs: number[] = [];
    const totals = new Int32Array(g.n);
    const perReadout: number[][] = lab.meta.readouts.map(() => []);
    const t0 = performance.now();

    for (let t = 0; t < req.trials; t++) {
      const rec: number[] = [];
      const res = sim.run([{ idxs: seedLab, rateHz: req.rateHz }], 1000, req.seed + t, {
        onSpike: (idx, step) => {
          rec.push(idx, step);
        },
      });
      for (let i = 0; i < g.n; i++) totals[i] += res.spikeCounts[i];
      for (let k = 0; k < rec.length; k += 2) {
        spikeLab.push(rec[k]);
        spikeMs.push(rec[k + 1] * 0.1); // DT_MS = 0.1 ms per step (sim-core)
      }
      for (let r = 0; r < lab.meta.readouts.length; r++) {
        perReadout[r].push(res.rates[lab.meta.readouts[r].lab]);
      }
    }

    const secs = req.trials; // 1000 ms trials
    const responding: number[] = [];
    for (let i = 0; i < g.n; i++) if (totals[i] > 0) responding.push(i);
    responding.sort((a, b) => totals[b] - totals[a]);

    const report: WhatIfReport = {
      kind: req.kind,
      group: req.group,
      rateHz: req.rateHz,
      trials: req.trials,
      nNodes: g.n,
      nEdges: g.off[g.n],
      computeMs: Math.round(performance.now() - t0),
      spikeLab: Uint32Array.from(spikeLab),
      spikeMs: Float32Array.from(spikeMs),
      soma: lab.soma,
      responders: {
        mainIdx: responding.map((l) => lab!.mainIdx[l]),
        type: responding.map((l) => g.type[l]),
        meanRateHz: responding.map((l) => Math.round((totals[l] / secs) * 100) / 100),
        spikes: responding.map((l) => totals[l]),
      },
      readouts: lab.meta.readouts.map((r, ri) => {
        const per = perReadout[ri];
        return {
          name: r.name,
          meanHz: Math.round((per.reduce((a, b) => a + b, 0) / Math.max(1, per.length)) * 100) / 100,
          firesByTrial: per.filter((x) => x > 0).length,
        };
      }),
      note: lab.meta.note,
    };

    if (req.kind === "validate") {
      const refRes = await fetch(dataUrl("trace-sugar-100.json"));
      if (!refRes.ok) throw new Error(`trace-sugar-100.json: HTTP ${refRes.status}`);
      const ref = (await refRes.json()) as {
        responders: { i: number[] };
        readouts: Array<{ name: string; meanHz: number }>;
      };
      const fullResponders = new Set(ref.responders.i);
      let captured = 0;
      for (const l of responding) if (fullResponders.has(lab!.mainIdx[l])) captured++;
      report.validation = {
        subMn9rHz: report.readouts[0].meanHz,
        fullMn9rHz: ref.readouts[0].meanHz,
        subResponders: responding.length,
        fullResponders: fullResponders.size,
        captured,
      };
    }

    self.postMessage({ ok: true, report });
  } catch (err) {
    self.postMessage({ ok: false, error: String((err as Error)?.message ?? err) });
  }
};
