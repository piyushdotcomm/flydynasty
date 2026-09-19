/**
 * What-if lab data layer: loads the lab bundle (pipelines/export_lab_bundle.ts)
 * and rebuilds the sub-sim Connectome inside the worker, so the live
 * approximation runs on exactly the published subgraph.
 *
 * lab-edges.bin.gz layout (little-endian; see export_lab_bundle.ts):
 *   u32 magic 'FLY1' | u32 n | u32 E | u32 nTypes
 *   Int32 off[n+1] | Int32 dst[E] | Float32 w[E] | Int32 mainIdx[n]
 *   Float32 soma[n*3] | Int32 seedOff[nGroups+1] | Int32 seedLab[sum]
 *   Int32 readoutLab[nReadouts] | Int32 typeIdx[n]
 *
 * Cell-type names live in lab-meta.json (types[]). All of it is pure data —
 * no DOM, no fetches — so this module also runs inside the worker.
 */
import { parseGraph, type Connectome, type RawGraph } from "@flylab/sim-core/graph";

export const LAB_MAGIC = 0x31594c46; // 'FLY1' little-endian

export interface LabMeta {
  formatVersion: 1;
  generated: string;
  config: { hops: number; minSyn: number; wSynMv: number };
  provenance: Record<string, string>;
  note: string;
  n_nodes: number;
  n_edges: number;
  groups: string[];
  types: string[];
  readouts: Array<{ name: string; id: string; lab: number }>;
}

/** decoded lab bundle: the sub-sim connectome + cross-references */
export interface LabData {
  connectome: Connectome;
  /** main-bundle node index per lab index */
  mainIdx: Int32Array;
  /** raw FlyWire soma (nm) per lab index, xyz */
  soma: Float32Array;
  /** seed group name -> lab indices */
  seeds: Record<string, number[]>;
  meta: LabMeta;
}

export function decodeLabBuffer(buf: ArrayBuffer, meta: LabMeta): LabData {
  const dv = new DataView(buf);
  const magic = dv.getUint32(0, true);
  if (magic !== LAB_MAGIC) throw new Error(`lab bundle: bad magic 0x${magic.toString(16)}`);
  const n = dv.getUint32(4, true);
  const E = dv.getUint32(8, true);
  const nTypes = dv.getUint32(12, true);
  if (n !== meta.n_nodes || E !== meta.n_edges) {
    throw new Error(`lab bundle: meta mismatch (bin n=${n} E=${E}, meta n=${meta.n_nodes} E=${meta.n_edges})`);
  }
  let o = 16;
  const i32 = (len: number) => {
    const v = new Int32Array(buf, o, len);
    o += len * 4;
    return v;
  };
  const f32 = (len: number) => {
    const v = new Float32Array(buf, o, len);
    o += len * 4;
    return v;
  };
  const off = i32(n + 1);
  const dst = i32(E);
  const w = f32(E);
  const mainIdx = i32(n);
  const soma = f32(n * 3);
  const nGroups = meta.groups.length;
  const seedOff = i32(nGroups + 1);
  const nSeeds = seedOff[nGroups];
  const seedLab = i32(nSeeds);
  const readoutLab = i32(meta.readouts.length);
  const typeIdx = i32(n);
  if (o !== buf.byteLength) {
    throw new Error(`lab bundle: trailing bytes (${o} of ${buf.byteLength})`);
  }
  if (off[n] !== E) throw new Error(`lab bundle: CSR mismatch off[n]=${off[n]} != E=${E}`);
  if (nTypes !== meta.types.length) throw new Error("lab bundle: type dictionary size mismatch");

  const seeds: Record<string, number[]> = {};
  for (let g = 0; g < nGroups; g++) {
    seeds[meta.groups[g]] = Array.from(seedLab.slice(seedOff[g], seedOff[g + 1]));
  }
  for (const r of meta.readouts) {
    if (readoutLab[0] === undefined || r.lab < 0 || r.lab >= n) {
      throw new Error(`lab bundle: readout ${r.name} out of range`);
    }
  }

  const types = meta.types;
  const connectome = parseGraph({
    n_neurons: n,
    n_edges: E,
    // CSR -> (pre, post) edge lists for parseGraph; identity-checked below
    pre: expandCsr(off, dst),
    post: Array.from(dst),
    syn: Array.from(w, (v) => Math.abs(v) / meta.config.wSynMv),
    sign: Array.from(w, (v) => (v < 0 ? -1 : 1)),
    ids: Array.from(mainIdx, (m) => `main:${m}`), // synthetic; stimulation is index-based
    soma: Array.from({ length: n }, (_, c) => soma[c * 3]),
    soma_y: Array.from({ length: n }, (_, c) => soma[c * 3 + 1]),
    soma_z: Array.from({ length: n }, (_, c) => soma[c * 3 + 2]),
    type: Array.from(typeIdx, (k) => types[k] ?? "unknown"),
    cls: new Array(n).fill(""),
    sub: new Array(n).fill(""),
    nt: new Array(n).fill(""),
  } as unknown as RawGraph);

  return { connectome, mainIdx, soma, seeds, meta };
}

function expandCsr(off: Int32Array, dst: Int32Array): number[] {
  const pre = new Array<number>(dst.length);
  for (let i = 0; i < off.length - 1; i++) {
    for (let o = off[i]; o < off[i + 1]; o++) pre[o] = i;
  }
  return pre;
}
