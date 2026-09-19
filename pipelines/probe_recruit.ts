/**
 * Recruitment feasibility probe for the interactive what-if lab (doc 09 §5.2).
 *
 * From the stimulus seed neurons, expand k hops through edges with
 * syn_count >= minSyn and measure: recruited nodes/edges, whether the readout
 * neurons (MN9_r etc.) are included, and what fraction of a FULL-model run's
 * responders the recruited subgraph captures (responders from
 * trace-sugar-100.json = the ground truth this approximation must approach).
 *
 * Run: pnpm tsx pipelines/probe_recruit.ts
 */
import { readFileSync } from 'node:fs'
import { loadGraph, groupIds, loadSeeds } from './lib.js'
import { LIFSim } from '../packages/sim-core/src/lif.js'
import type { TraceFile } from '../packages/app/src/lib/data.js'

const READOUTS = ['720575940660219265', '720575940618238523', '720575940627410451', '720575940630868793', '720575940628826128', '720575940630233404', '720575940623352063', '720575940618165019']
const graph = loadGraph()
const seeds = loadSeeds()

function recruit(seedIdxs: number[], hops: number, minSyn: number): { nodes: Set<number>; edges: number } {
  const frontier = new Set(seedIdxs)
  const nodes = new Set(seedIdxs)
  let edges = 0
  for (let h = 0; h < hops; h++) {
    const next: number[] = []
    for (const i of frontier) {
      for (let o = graph.off[i]; o < graph.off[i + 1]; o++) {
        if (graph.w[o] === 0) continue // weight 0 only when syn 0 — never in this bundle; kept for safety
        const syn = Math.abs(graph.w[o]) / 0.275
        if (syn < minSyn) continue
        edges++
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
  return { nodes, edges }
}

// full-model sugar-100 responders (the approximation target)
const trace = JSON.parse(
  readFileSync(new URL('../packages/app/public/data/trace-sugar-100.json', import.meta.url), 'utf8'),
) as TraceFile
const fullResponders = new Set(trace.responders.i)

const sugarIds = groupIds(seeds, 'sugar_grns')
const seedIdxs = sugarIds.map((id) => graph.idToIdx.get(id)!).filter((i) => i !== undefined)
console.log(`sugar seeds resolved: ${seedIdxs.length}/${sugarIds.length}`)

for (const [hops, minSyn] of [[3, 2], [3, 3], [4, 5], [4, 2]] as const) {
  const t0 = Date.now()
  const { nodes, edges } = recruit(seedIdxs, hops, minSyn)
  let captured = 0
  for (const r of fullResponders) if (nodes.has(r)) captured++
  const mn9 = graph.idToIdx.get('720575940660219265')
  console.log(
    `hops=${hops} minSyn=${minSyn}: nodes=${nodes.size} edges=${edges} capture=${captured}/${fullResponders.size}` +
      ` (${((captured / fullResponders.size) * 100).toFixed(1)}%) MN9_r=${mn9 !== undefined && nodes.has(mn9)} t=${Date.now() - t0}ms`,
  )
}

// union over ALL seed groups (arbitrary what-if stimuli recruit within this)
for (const [hops, minSyn] of [[3, 2], [3, 3]] as const) {
  const union = new Set<number>()
  for (const g of seeds.groups) {
    const idxs = groupIds(seeds, g.name).map((id) => graph.idToIdx.get(id)!).filter((i) => i !== undefined)
    for (const n of recruit(idxs, hops, minSyn).nodes) union.add(n)
  }
  for (const r of READOUTS) {
    const ri = graph.idToIdx.get(r)
    if (ri !== undefined) union.add(ri)
  }
  let keptEdges = 0
  for (const i of union) for (let o = graph.off[i]; o < graph.off[i + 1]; o++) if (union.has(graph.dst[o]) && Math.abs(graph.w[o]) / 0.275 >= minSyn) keptEdges++
  console.log(`UNION hops=${hops} minSyn=${minSyn}: nodes=${union.size} internal-edges(minSyn>=${minSyn})=${keptEdges}`)
}

// fidelity per config: MN9_r rate on the sub-sim vs full-model 86.4 Hz
const MN9 = '720575940660219265'
for (const [hops, minSyn] of [[2, 2], [2, 3], [3, 3], [3, 2]] as const) {
  const { nodes: ns } = recruit(seedIdxs, hops, minSyn)
  for (const r of READOUTS) {
    const ri = graph.idToIdx.get(r)
    if (ri !== undefined) ns.add(ri)
  }
  const list = [...ns].sort((a, b) => a - b)
  const remap = new Map<number, number>()
  list.forEach((o, c) => remap.set(o, c))
  const off = new Int32Array(list.length + 1)
  const dst: number[] = []
  const w: number[] = []
  for (let c = 0; c < list.length; c++) {
    off[c] = dst.length
    const o = list[c]
    for (let e = graph.off[o]; e < graph.off[o + 1]; e++) {
      const t = remap.get(graph.dst[e])
      if (t !== undefined && Math.abs(graph.w[e]) / 0.275 >= minSyn) {
        dst.push(t)
        w.push(graph.w[e])
      }
    }
  }
  off[list.length] = dst.length
  const ids = list.map((o) => graph.ids[o])
  const sim = new LIFSim({
    n: list.length, off, dst: Int32Array.from(dst), w: Float32Array.from(w),
    ids, idToIdx: new Map(ids.map((id, i) => [id, i])),
    type: [], cls: [], sub: [], nt: [],
    soma: new Float32Array(0), soma_y: new Float32Array(0), soma_z: new Float32Array(0),
  })
  const t0 = Date.now()
  const res = sim.run([{ rootIds: sugarIds, rateHz: 100 }], 1000, 0)
  const mn9Hz = res.rates[idToMn9(sim, MN9)] ?? 0
  console.log(`FIDELITY hops=${hops} minSyn=${minSyn}: nodes=${list.length} edges=${dst.length} MN9_r=${mn9Hz} Hz (full: 86.4) spikes=${res.totalSpikes} responding=${res.responding.length} t=${((Date.now() - t0) / 1000).toFixed(2)}s`)
}
function idToMn9(sim: LIFSim, id: string): number {
  return (sim as unknown as { c: { idToIdx: Map<string, number> } }).c.idToIdx.get(id) ?? -1
}

// candidate config: max syn on kept edges + one-trial sim runtime
const { nodes } = recruit(seedIdxs, 3, 2)
let maxSyn = 0
let outEdges = 0
for (let i = 0; i < graph.n; i++) {
  if (!nodes.has(i)) continue
  for (let o = graph.off[i]; o < graph.off[i + 1]; o++) {
    if (!nodes.has(graph.dst[o])) continue
    const syn = Math.abs(graph.w[o]) / 0.275
    if (syn >= 2) {
      outEdges++
      if (syn > maxSyn) maxSyn = syn
    }
  }
}
console.log(`kept (both-endpoint) edges: ${outEdges}, max syn: ${maxSyn}`)

// one-trial runtime of the recruited sub-sim (LIFSim on the compressed subgraph)
const nodeList = [...nodes].sort((a, b) => a - b)
const remap = new Map<number, number>()
nodeList.forEach((o, c) => remap.set(o, c))
const off = new Int32Array(nodeList.length + 1)
const dst: number[] = []
const w: number[] = []
for (let c = 0; c < nodeList.length; c++) {
  const o = nodeList[c]
  off[c] = dst.length
  for (let e = graph.off[o]; e < graph.off[o + 1]; e++) {
    const t = remap.get(graph.dst[e])
    if (t !== undefined && Math.abs(graph.w[e]) / 0.275 >= 2) {
      dst.push(t)
      w.push(graph.w[e])
    }
  }
}
off[nodeList.length] = dst.length
const ids = nodeList.map((o) => graph.ids[o])
const idToIdx = new Map(ids.map((id, i) => [id, i]))
const sim = new LIFSim({
  n: nodeList.length, off: off, dst: Int32Array.from(dst), w: Float32Array.from(w),
  ids, idToIdx, type: [], cls: [], sub: [], nt: [],
  soma: new Float32Array(0), soma_y: new Float32Array(0), soma_z: new Float32Array(0),
})
const t1 = Date.now()
const res = sim.run([{ rootIds: sugarIds, rateHz: 100 }], 1000, 0)
console.log(`sub-sim 1 trial: ${(Date.now() - t1) / 1000}s, spikes ${res.totalSpikes}, responding ${res.responding.length}, MN9_r ${res.rates[idToMn9(sim, '720575940660219265')] || 0} Hz`)
