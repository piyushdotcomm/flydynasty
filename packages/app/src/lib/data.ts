/**
 * Data access layer — loads the REAL exported model data from /data/.
 *
 * Everything here matches the on-disk schemas 1:1:
 *  - graph-meta.json / neurons.bin / ids.txt   (pipelines/export_client_bundle.ts)
 *  - traces-index.json / gate.json / trace-*.json (pipelines/export_traces.ts)
 *
 * Root IDs are exact decimal STRINGS: FlyWire root IDs (~7.2e17) exceed
 * Number.MAX_SAFE_INTEGER, and rounding them silently maps lookups onto the
 * wrong neuron (the bug this project was built to fix).
 */
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const dataUrl = (file: string) => `${BASE}/data/${file}`;

/** gate.json schema (pipelines/export_traces.ts writeGate()) */
export interface GateCheck {
  id: string;
  claim: string;
  observed: string;
  pass: boolean;
}
export interface GateFile {
  formatVersion: 1;
  generated: string;
  model: { paper: string } & Record<string, unknown>;
  complete: boolean;
  passed: number;
  total: number;
  checks: GateCheck[];
}

/** traces-index.json (writeIndex()): an object whose .conditions is the list */
export interface TracesIndex {
  formatVersion: 1;
  generated: string;
  model: Record<string, unknown>;
  complete: boolean;
  missing: string[];
  totalBytes: number;
  conditions: TraceIndexEntry[];
}

/** one condition summary inside traces-index.json.conditions */
export interface TraceIndexEntry {
  id: string;
  label: string;
  paper: string;
  trials: number;
  file: string;
  bytes: number;
  totalSpikes: number;
  respondingNeurons: number;
  maxRateHz: number;
  mn9rMeanHz: number;
  mn9rFires: number;
  mn9lMeanHz: number;
  silence?: string;
  shuffled?: boolean;
}

/** graph-meta.json schema (fields the client uses) */
export interface GraphMeta {
  formatVersion: number;
  generated: string;
  source: Record<string, string>;
  model: Record<string, string | number>;
  graph: {
    n_neurons: number;
    n_edges: number;
    total_synapses: number;
    sign: { excitatory: number; inhibitory: number; unknown: number };
  };
  labels: Record<string, string[]>;
  positions: {
    space: string;
    unit: string;
    notCoRegistered: boolean;
    note: string;
    bounds: { min: number[]; max: number[] };
    centroid: number[];
    neuronsWithoutCoordinates: number;
  };
}

/** per-readout block inside trace-*.json */
export interface Readout {
  name: string;
  id: string;
  type: string;
  role: string;
  perTrialHz: number[];
  meanHz: number;
  firesByTrial: number;
}

/** trace-*.json schema (subset the client uses) */
export interface TraceFile {
  formatVersion: 1;
  generated: string;
  condition: {
    id: string;
    label: string;
    paper: string;
    note: string | null;
    trials: number;
    durationMs: number;
    stimuli: Array<{ group: string; rateHz: number; nIds: number }>;
    silence: { label: string; nIds: number } | null;
    shuffledConnectivity: boolean;
    canonicalTrial: number;
  };
  stats: {
    totalSpikesAcrossTrials: number;
    meanSpikesPerTrial: number;
    respondingNeurons: number;
    maxMeanRateHz: number;
    canonicalTrialSpikes: number;
    rasterRows: number;
    binsMs: number;
    nBins: number;
  };
  responders: {
    count: number;
    i: number[];
    id: string[];
    type: string[];
    sub: string[];
    meanRateHz: number[];
    spikes: number[];
  };
  raster: {
    binsMs: number;
    nBins: number;
    rows: number;
    driveRows: number[];
    data: string; // base64 Uint8Array(rows*nBins), row-major
  };
  readouts: Readout[];
}

async function fetchJson<T>(file: string): Promise<T> {
  const res = await fetch(dataUrl(file));
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

export const loadGate = () => fetchJson<GateFile>("gate.json");
export const loadTracesIndex = async (): Promise<TracesIndex> =>
  fetchJson<TracesIndex>("traces-index.json");
export const loadGraphMeta = () => fetchJson<GraphMeta>("graph-meta.json");

export async function loadTrace(entry: TraceIndexEntry): Promise<TraceFile> {
  const t = await fetchJson<TraceFile>(entry.file);
  if (t.formatVersion !== 1) throw new Error(`${entry.file}: unknown formatVersion ${t.formatVersion}`);
  return t;
}

/**
 * neurons.bin — Float32 xyz + Uint16 labels (type, cls, sub, sup, nt indices).
 * Layout (written by export_client_bundle.ts):
 *   u32 magic 'FLYN' | u16 version | u32 n | u16 nLabelFields
 *   then n * 3 float32 positions, then nLabelFields * n uint16 label indices.
 */
export async function loadNeurons(): Promise<{
  n: number;
  positions: Float32Array;
  labels: Uint16Array[];
  dictNames: string[];
}> {
  const res = await fetch(dataUrl("neurons.bin"));
  if (!res.ok) throw new Error(`neurons.bin: HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  const dv = new DataView(buf);
  const magic = dv.getUint32(0, true);
  if (magic !== 0x4e594c46) throw new Error(`neurons.bin: bad magic 0x${magic.toString(16)}`);
  const version = dv.getUint16(4, true);
  if (version !== 1) throw new Error(`neurons.bin: unknown version ${version}`);
  const n = dv.getUint32(6, true);
  const nLabelFields = dv.getUint16(10, true);
  const expected = 12 + n * (12 + nLabelFields * 2);
  if (buf.byteLength !== expected) {
    throw new Error(`neurons.bin: size ${buf.byteLength} != expected ${expected} (n=${n})`);
  }
  const positions = new Float32Array(buf, 12, n * 3);
  const labels: Uint16Array[] = [];
  let off = 12 + n * 12;
  for (let f = 0; f < nLabelFields; f++) {
    labels.push(new Uint16Array(buf, off, n));
    off += n * 2;
  }
  return { n, positions, labels, dictNames: ["type", "cls", "sub", "sup", "nt"] };
}

/** decode the base64 raster payload into spike counts per (row, bin) */
export function decodeRaster(raster: TraceFile["raster"]): Uint8Array {
  const bin = atob(raster.data);
  const out = new Uint8Array(raster.rows * raster.nBins);
  const n = Math.min(bin.length, out.length);
  for (let i = 0; i < n; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export const fmtInt = (v: number) => v.toLocaleString("en-US");