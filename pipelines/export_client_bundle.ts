/**
 * Client bundle export — the neuron catalogue the browser renders.
 *
 * Writes (into packages/app/public/data/):
 *   graph-meta.json  small JSON: provenance, model parameters, label dictionaries,
 *                    coordinate bounds, and honest notes about coordinate space
 *   neurons.bin      binary: Float32 xyz soma positions (FlyWire/FAF14 nm) +
 *                    Uint16 label indices (type/cls/sub/sup/nt) for all neurons
 *   ids.txt          exact decimal root IDs, one per line, in node-index order
 *
 * Root IDs are strings because they exceed Number.MAX_SAFE_INTEGER (see
 * data/rebuild_graph.py for the measured collision counts). Positions are the
 * real annotated soma coordinates, NOT co-registered to any atlas mesh: the
 * bundle records the coordinate space explicitly so the UI can label it.
 *
 * Run: pnpm bundle   (from flylab root)
 */
import { writeFileSync, mkdirSync, statSync } from 'node:fs'
import { APP_DATA, loadRawGraph, writeJson } from './lib.js'
import {
  W_SYN_MV, T_MBR_MS, T_REFRACTORY_MS, TAU_SYN_MS, T_DLY_MS,
  V_RESTING_MV, V_THRESHOLD_MV, V_RESET_MV, R_MBR_KOHM_CM2, C_MBR_UF_CM2,
  TRIAL_MS, NT_CLEFT_SCORE_CUTOFF, SOURCE,
} from '../packages/sim-core/src/lif-params.js'

const MAGIC = 0x4e594c46 // 'FLYN' little-endian
const VERSION = 1

mkdirSync(APP_DATA, { recursive: true })
const raw = loadRawGraph()
const n = raw.n_neurons

function dict(values: string[]): { list: string[]; index: Uint16Array } {
  const list: string[] = []
  const map = new Map<string, number>()
  const index = new Uint16Array(values.length)
  for (let i = 0; i < values.length; i++) {
    const v = values[i] ?? 'unknown'
    let k = map.get(v)
    if (k === undefined) {
      k = list.length
      map.set(v, k)
      list.push(v)
    }
    index[i] = k
  }
  if (list.length > 65535) throw new Error(`label dictionary too large: ${list.length}`)
  return { list, index }
}

const typeDict = dict(raw.type)
const clsDict = dict(raw.cls)
const subDict = dict(raw.sub)
const supDict = dict((raw as unknown as { sup: string[] }).sup)
const ntDict = dict(raw.nt)

const pos = new Float32Array(n * 3)
let minX = Infinity, minY = Infinity, minZ = Infinity
let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
let zeroSoma = 0
const sum = [0, 0, 0]
for (let i = 0; i < n; i++) {
  const x = raw.soma[i] || 0
  const y = raw.soma_y[i] || 0
  const z = raw.soma_z[i] || 0
  pos[i * 3] = x
  pos[i * 3 + 1] = y
  pos[i * 3 + 2] = z
  sum[0] += x; sum[1] += y; sum[2] += z
  if (x === 0 && y === 0 && z === 0) zeroSoma++
  else {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
    if (z < minZ) minZ = z
    if (z > maxZ) maxZ = z
  }
}

const nLabelFields = 5
const headerBytes = 12
const buf = Buffer.alloc(headerBytes + n * (12 + nLabelFields * 2))
buf.writeUInt32LE(MAGIC, 0)
buf.writeUInt16LE(VERSION, 4)
buf.writeUInt32LE(n, 6)
buf.writeUInt16LE(nLabelFields, 10)
let off = headerBytes
for (let i = 0; i < pos.length; i++) {
  buf.writeFloatLE(pos[i], off)
  off += 4
}
const labelArrays = [typeDict.index, clsDict.index, subDict.index, supDict.index, ntDict.index]
for (const arr of labelArrays) {
  for (let i = 0; i < n; i++) {
    buf.writeUInt16LE(arr[i], off)
    off += 2
  }
}
const binPath = new URL('neurons.bin', APP_DATA)
writeFileSync(binPath, buf)

const idsPath = new URL('ids.txt', APP_DATA)
writeFileSync(idsPath, raw.ids.join('\n'))

let exc = 0, inh = 0, zeroSign = 0
let totalSyn = 0
for (let e = 0; e < raw.n_edges; e++) {
  const s = raw.sign[e]
  if (s > 0) exc++
  else if (s < 0) inh++
  else zeroSign++
  totalSyn += raw.syn[e]
}

writeJson(
  new URL('graph-meta.json', APP_DATA),
  {
    formatVersion: 1,
    generated: new Date().toISOString(),
    source: {
      connectome: 'FlyWire whole-brain connectome, release 783 (proofread)',
      connectomeCitation: 'Dorkenwald, Schlegel, et al. Nature 630, 818-829 (2024)',
      annotations: 'Schlegel, Bates, et al. Nature (2024) - cell types, sides, soma coordinates',
      neurotransmitters: 'Eckstein, Bates, et al. Cell 187(10), 2574-2594 (2024) - per-neuron top_nt -> excitatory/inhibitory sign',
      licence: 'CC-BY-4.0 (Zenodo record 10676866)',
    },
    model: {
      paper: 'Shiu et al. 2024, Nature 634, 210-219 (doi:10.1038/s41586-024-07763-9)',
      type: 'leaky integrate-and-fire (alpha-synapse), as implemented in the paper (Brian2)',
      dtMs: 0.1,
      wSynMv: W_SYN_MV,
      tMbrMs: T_MBR_MS,
      tauSynMs: TAU_SYN_MS,
      tDelayMs: T_DLY_MS,
      refractoryMs: T_REFRACTORY_MS,
      vRestingMv: V_RESTING_MV,
      vResetMv: V_RESET_MV,
      vThresholdMv: V_THRESHOLD_MV,
      rMbrKohmCm2: R_MBR_KOHM_CM2,
      cMbrUfCm2: C_MBR_UF_CM2,
      trialMs: TRIAL_MS,
      nTrialsPaper: 30,
      ntCleftScoreCutoff: NT_CLEFT_SCORE_CUTOFF,
      edgeWeight: 'w = syn_count * sign * W_syn (paper Methods)',
    },
    graph: {
      n_neurons: n,
      n_edges: raw.n_edges,
      total_synapses: totalSyn,
      note: 'every neuron-pair with >=1 published synapse is included',
      sign: { excitatory: exc, inhibitory: inh, unknown: zeroSign },
    },
    labels: {
      fields: ['type', 'cls', 'sub', 'sup', 'nt'],
      type: typeDict.list,
      cls: clsDict.list,
      sub: subDict.list,
      sup: supDict.list,
      nt: ntDict.list,
    },
    positions: {
      space: 'FlyWire (FAFB14) volume, nanometres, as published in the FlyWire annotation table',
      unit: 'nm',
      notCoRegistered: true,
      note: 'These are the real annotated soma coordinates. They are NOT transformed into any atlas (e.g. JRC2018U) space, so this bundle must not be drawn inside an atlas mesh without an explicit, cited transform.',
      bounds: { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] },
      centroid: [sum[0] / n, sum[1] / n, sum[2] / n],
      neuronsWithoutCoordinates: zeroSoma,
    },
    files: {
      neurons: 'neurons.bin',
      ids: 'ids.txt',
      traces: 'traces-index.json + trace-<condition>.json',
    },
  },
  true,
)

console.log(`graph-meta.json written`)
console.log(`neurons.bin  ${(statSync(binPath).size / 1048576).toFixed(2)} MB`)
console.log(`ids.txt      ${(statSync(idsPath).size / 1048576).toFixed(2)} MB`)
console.log(`graph: ${n} neurons, ${raw.n_edges} edges, ${totalSyn} synapses (exc ${exc}, inh ${inh}, unknown ${zeroSign})`)
console.log(`positions: x[${minX}, ${maxX}] y[${minY}, ${maxY}] z[${minZ}, ${maxZ}] nm; ${zeroSoma} neurons without coordinates`)
console.log(`label dictionaries: type ${typeDict.list.length}, cls ${clsDict.list.length}, sub ${subDict.list.length}, sup ${supDict.list.length}, nt ${ntDict.list.length}`)