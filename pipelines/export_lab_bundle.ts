/**
 * Lab bundle export — the Interactive What-If Lab (doc 09 §5.2, "live
 * approximation on recruited subgraph", honestly labeled).
 *
 * From the stimulus seed neurons (seeds.json), expand HOPS through edges with
 * syn_count >= MIN_SYN, take the union over ALL seed groups plus the readout
 * motor neurons, and export that subgraph as a compact browser bundle:
 *
 *   lab-edges.bin.gz   self-contained sub-sim bundle, little-endian:
 *                        u32 magic 'FLY1' | u32 n | u32 E | u32 nTypes
 *                        Int32 off[n+1] | Int32 dst[E] | Float32 w[E]
 *                        Int32 mainIdx[n]        (lab index -> main node)
 *                        Float32 soma[n*3]       (raw FlyWire nm)
 *                        Int32 seedOff[nGroups+1] | Int32 seedLab[sum]
 *                        Int32 readoutLab[nReadouts]
 *                        Int32 typeIdx[n]        (into the type dict)
 *                        (type dict follows in lab-meta.json)
 *   lab-meta.json      provenance, config, seed group names, readout IDs and
 *                      names, type dictionary, and the honest approximation
 *                      note
 *
 * The worker rebuilds THIS subgraph directly (CSR is already in the bundle)
 * and runs the same LIF model (sim-core) with paper parameters. Weights are
 * the real signed weights (syn * sign * W_syn), identical to the full model.
 *
 * Run: pnpm lab  (from flylab root)
 */
import { writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { APP_DATA, loadGraph, groupIds, loadSeeds } from './lib.js'
import { W_SYN_MV } from '../packages/sim-core/src/lif-params.js'

const HOPS = 3
const MIN_SYN = 3

const graph = loadGraph()
const seeds = loadSeeds()

const READOUTS = [
  { name: 'MN9_r', id: '720575940660219265' },
  { name: 'MN9_l', id: '720575940618238523' },
  { name: 'MN6_r', id: '720575940627410451' },
  { name: 'MN6_l', id: '720575940630868793' },
  { name: 'MN8_r', id: '720575940628826128' },
  { name: 'MN8_l', id: '720575940630233404' },
  { name: 'MN11_r', id: '720575940623352063' },
  { name: 'MN11_l', id: '720575940618165019' },
] as const

/** recruit: BFS from seeds through edges with syn_count >= MIN_SYN */
function recruit(seedIdxs: number[]): Set<number> {
  const frontier = new Set(seedIdxs)
  const nodes = new Set(seedIdxs)
  for (let h = 0; h < HOPS; h++) {
    const next: number[] = []
    for (const i of frontier) {
      for (let o = graph.off[i]; o < graph.off[i + 1]; o++) {
        if (Math.abs(graph.w[o]) / W_SYN_MV < MIN_SYN) continue
        const d = graph.dst[o]
        if (!nodes.has(d)) {
          nodes.add(d)
          next.push(d)
        }
      }
    }
    frontier.clear()
    for (const n of next) frontier.add(n)
    if (frontier.size === 0) break
  }
  return nodes
}

const union = new Set<number>()
for (const g of seeds.groups) {
  const idxs = groupIds(seeds, g.name)
    .map((id) => graph.idToIdx.get(id))
    .filter((i): i is number => i !== undefined)
  for (const n of recruit(idxs)) union.add(n)
}
for (const r of READOUTS) {
  const i = graph.idToIdx.get(r.id)
  if (i !== undefined) union.add(i)
}

// deterministic order: main-bundle node index ascending -> lab index
const nodeList = [...union].sort((a, b) => a - b)
const labOfMain = new Map<number, number>()
nodeList.forEach((main, lab) => labOfMain.set(main, lab))
const n = nodeList.length

// CSR of internal edges with syn_count >= MIN_SYN (real signed weights)
const off = new Int32Array(n + 1)
const dst: number[] = []
const w: number[] = []
for (let c = 0; c < n; c++) {
  off[c] = dst.length
  const main = nodeList[c]
  for (let e = graph.off[main]; e < graph.off[main + 1]; e++) {
    const t = labOfMain.get(graph.dst[e])
    if (t !== undefined && Math.abs(graph.w[e]) / W_SYN_MV >= MIN_SYN) {
      dst.push(t)
      w.push(graph.w[e])
    }
  }
}
off[n] = dst.length
const E = dst.length

// seed groups (lab indices) and readouts
const groupNames = seeds.groups.map((g) => g.name)
const seedLists = seeds.groups.map((g) =>
  groupIds(seeds, g.name)
    .map((id) => graph.idToIdx.get(id))
    .filter((i): i is number => i !== undefined)
    .map((i) => labOfMain.get(i)!),
)
const seedOff = new Int32Array(groupNames.length + 1)
seedLists.forEach((list, gi) => (seedOff[gi + 1] = seedOff[gi] + list.length))
const seedLab = new Int32Array(seedLists.flat())

const readoutLab = new Int32Array(
  READOUTS.map((r) => labOfMain.get(graph.idToIdx.get(r.id)!)).filter((x) => x !== undefined),
)

// type dictionary (cell_type strings for UI display)
const types: string[] = []
const typeMap = new Map<string, number>()
const typeIdx = new Int32Array(n)
for (let c = 0; c < n; c++) {
  const t = graph.type[nodeList[c]] || 'unknown'
  let k = typeMap.get(t)
  if (k === undefined) {
    k = types.length
    typeMap.set(t, k)
    types.push(t)
  }
  typeIdx[c] = k
}

// ---- pack the binary ----
const headerSize = 16
const byteLen =
  headerSize +
  (n + 1) * 4 + E * 4 + E * 4 + n * 4 + n * 12 +
  seedOff.byteLength + seedLab.byteLength + readoutLab.byteLength + typeIdx.byteLength
const buf = new ArrayBuffer(byteLen)
const dv = new DataView(buf)
let o = 0
const MAGIC = 0x31594c46 // 'FLY1' little-endian
dv.setUint32(o, MAGIC, true); o += 4
dv.setUint32(o, n, true); o += 4
dv.setUint32(o, E, true); o += 4
dv.setUint32(o, types.length, true); o += 4

const packI32 = (arr: Int32Array) => new Int32Array(buf, o, arr.length).set(arr), adv = (b: number) => (o += b)
packI32(off); adv(off.byteLength)
packI32(Int32Array.from(dst)); adv(E * 4)
new Float32Array(buf, o, E).set(Float32Array.from(w)); adv(E * 4)
packI32(Int32Array.from(nodeList)); adv(n * 4)
// soma coordinates (raw FlyWire nm) — the same values neurons.bin carries
{
  const soma = new Float32Array(buf, o, n * 3); adv(n * 12)
  for (let c = 0; c < n; c++) {
    const m = nodeList[c]
    soma[c * 3] = graph.soma[m]
    soma[c * 3 + 1] = graph.soma_y[m]
    soma[c * 3 + 2] = graph.soma_z[m]
  }
}
packI32(seedOff); adv(seedOff.byteLength)
packI32(seedLab); adv(seedLab.byteLength)
packI32(readoutLab); adv(readoutLab.byteLength)
packI32(typeIdx); adv(typeIdx.byteLength)
if (o !== byteLen) throw new Error(`packing error: wrote ${o} of ${byteLen} bytes`)

const edgesGz = gzipSync(Buffer.from(buf))
const outBytes = edgesGz.length
writeFileSync(new URL('lab-edges.bin.gz', APP_DATA), edgesGz)

writeFileSync(
  new URL('lab-meta.json', APP_DATA),
  JSON.stringify(
    {
      formatVersion: 1,
      generated: new Date().toISOString(),
      config: { hops: HOPS, minSyn: MIN_SYN, wSynMv: W_SYN_MV },
      provenance: {
        graph: 'FlyWire release 783 (Dorkenwald et al. 2024), E/I signs Eckstein et al. 2024',
        model: 'Shiu et al. 2024, Nature 634, 210-219 (doi:10.1038/s41586-024-07763-9)',
        seeds: 'seeds.json — Shiu et al. 2024 supplementary tables (seed-methodology.md)',
      },
      note:
        'This subgraph is a k-hop approximation recruited around the taste GRN seed groups ' +
        `(hops=${HOPS} through edges with syn_count >= ${MIN_SYN}). What-if results in the ` +
        'browser are computed live on THIS subgraph and are labeled as an approximation; the ' +
        'precomputed full-model runs are the reference.',
      n_nodes: n,
      n_edges: E,
      groups: groupNames,
      types,
      readouts: READOUTS.map((r, i) => ({ ...r, lab: readoutLab[i] })),
    },
    null,
    1,
  ),
)

console.log(`lab-edges.bin.gz ${(outBytes / 1048576).toFixed(2)} MB (nodes ${n}, edges ${E}, types ${types.length})`)
console.log(`groups: ${groupNames.map((g, i) => `${g}=${seedLists[i].length}`).join(', ')}`)
console.log(`readouts resolved: ${readoutLab.length}/${READOUTS.length}`)
