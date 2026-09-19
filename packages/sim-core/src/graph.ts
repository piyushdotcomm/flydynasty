/**
 * Connectome graph loading + CSR adjacency construction.
 *
 * Data: FlyWire release 783 (Dorkenwald et al. 2024) connections
 * (syn_count >= 5) + Eckstein et al. 2024 neurotransmitter signs.
 * Bundled as data/processed/connectome-graph.json.gz by process_connectome.py.
 *
 * Pure module: no node:fs / DOM imports, so the browser bundle (the Phase 4
 * what-if web worker) can import parseGraph directly. File loading lives in
 * the consumers (pipelines, tests, verify).
 */
import { W_SYN_MV } from './lif-params'

export interface RawGraph {
  n_neurons: number
  n_edges: number
  pre: number[]
  post: number[]
  syn: number[]
  sign: number[]
  /**
   * Root IDs as exact decimal STRINGS.
   *
   * FlyWire root IDs are ~7.2e17, above Number.MAX_SAFE_INTEGER (9.007e15), so
   * a JSON number is rounded on parse: on this bundle 139,248 IDs collapsed to
   * 110,654 distinct doubles (23,748 collision buckets, 28,594 neurons
   * shadowed, worst bucket 6 IDs) and 28 of the 86 Shiu et al. 2024 seed IDs
   * fell in a colliding bucket — an idToIdx lookup could return a *neighbouring*
   * neuron without any error. See data/rebuild_graph.py and src/verify.ts.
   */
  ids: string[]
  soma: number[]
  soma_y: number[]
  soma_z: number[]
  type: string[]
  cls: string[]
  sub: string[]
  nt: string[]
}

/** CSR: out-edges per node. Edge weight = syn_count * sign * W_SYN (mV). */
export interface Connectome {
  n: number
  /** outgoing edges: nodes' slice = off[i]..off[i+1] */
  off: Int32Array
  /** target node per out-edge */
  dst: Int32Array
  /** weight per out-edge in mV (signed) */
  w: Float32Array
  /** exact root ID per node (string, never rounded) */
  ids: string[]
  idToIdx: Map<string, number>
  type: string[]
  cls: string[]
  sub: string[]
  nt: string[]
  soma: Float32Array
  soma_y: Float32Array
  soma_z: Float32Array
}

export function parseGraph(raw: RawGraph): Connectome {
  const n = raw.n_neurons
  if (typeof raw.ids[0] !== 'string') {
    // Fail loud. Numeric root IDs above 2^53 are silently rounded by
    // JSON.parse, which makes idToIdx map lookups land on the wrong neuron.
    throw new Error(
      'graph bundle ids must be decimal strings (root IDs exceed Number.MAX_SAFE_INTEGER); ' +
        'rebuild with data/rebuild_graph.py',
    )
  }
  const off = new Int32Array(n + 1)
  const E = raw.n_edges
  // count out-degree
  for (let e = 0; e < E; e++) off[raw.pre[e] + 1]++
  // prefix sum
  for (let i = 0; i < n; i++) off[i + 1] += off[i]
  const dst = new Int32Array(E)
  const w = new Float32Array(E)
  const cursor = off.slice(0, n) // per-node fill cursor
  for (let e = 0; e < E; e++) {
    const p = raw.pre[e]
    const c = cursor[p]++
    dst[c] = raw.post[e]
    // Paper Methods: w_j,i = synapse_count_j->i * sign_j * W_SYN
    w[c] = raw.syn[e] * raw.sign[e] * W_SYN_MV
  }
  const idToIdx = new Map<string, number>()
  for (let i = 0; i < n; i++) idToIdx.set(raw.ids[i], i)
  return {
    n,
    off,
    dst,
    w,
    ids: raw.ids,
    idToIdx,
    type: raw.type,
    cls: raw.cls,
    sub: raw.sub,
    nt: raw.nt,
    soma: Float32Array.from(raw.soma),
    soma_y: Float32Array.from(raw.soma_y),
    soma_z: Float32Array.from(raw.soma_z),
  }
}

export function rootIdsToIdxs(c: Connectome, rootIds: string[]): number[] {
  const out: number[] = []
  for (const r of rootIds) {
    const i = c.idToIdx.get(r)
    if (i !== undefined) out.push(i)
  }
  return out
}
