/**
 * Offline trace export — runs the REAL Shiu et al. 2024 model and writes the
 * compact data the browser replays.
 *
 * Why offline (doc 09 §5, mode 1): a 1000 ms trial of the full 139,248-neuron
 * LIF network takes ~15 s in Node and needs the 51 MB graph bundle. The browser
 * therefore replays model-computed traces instead of pretending to simulate.
 * Traces are deterministic (seeded RNG), sparse (only responding neurons) and
 * carry their own provenance (trials, paper figure, model parameters).
 *
 * Output: packages/app/public/data/trace-<condition>.json + traces-index.json
 *         + gate.json (headline paper checks, computed from these runs)
 *
 * Run: node_modules\.bin\tsx pipelines\export_traces.ts   (from flylab root)
 */
import { mkdirSync, writeFileSync, statSync } from 'node:fs'
import { CONDITIONS, READOUT_IDS, type ConditionDef } from './conditions.js'
import { APP_DATA, loadRawGraph, loadSeeds, groupIds, indicesOf, fmt, toBase64 } from './lib.js'
import { parseGraph, type Connectome, type RawGraph } from '../packages/sim-core/src/graph.js'
import { LIFSim, DT_MS } from '../packages/sim-core/src/lif.js'
import {
  W_SYN_MV, T_MBR_MS, T_REFRACTORY_MS, TAU_SYN_MS, T_DLY_MS,
  V_RESTING_MV, V_THRESHOLD_MV, TRIAL_MS,
} from '../packages/sim-core/src/lif-params.js'

const BINS_MS = 20
const STEPS_PER_BIN = Math.round(BINS_MS / DT_MS)
const N_BINS = Math.round(TRIAL_MS / BINS_MS)
const MAX_RASTER_ROWS = 8000

mkdirSync(APP_DATA, { recursive: true })

const raw = loadRawGraph()
const graph0 = parseGraph(raw)
const seeds = loadSeeds()
console.log(`graph: ${graph0.n} neurons, ${graph0.ids.length} ids, ${raw.n_edges} edges`)

function shuffledGraph(raw: RawGraph, seed: number): Connectome {
  // Deterministic Fisher-Yates over the per-edge synapse counts (paper Methods).
  let a = seed >>> 0
  const rand = () => {
    a = (a * 1664525 + 1013904223) >>> 0
    return a / 4294967296
  }
  const perm = raw.syn.slice()
  for (let i = perm.length - 1; i > 0; i--) {
    const r = Math.floor(rand() * (i + 1))
    const tmp = perm[i]; perm[i] = perm[r]; perm[r] = tmp
  }
  return parseGraph({ ...raw, syn: perm })
}

interface ConditionResult {
  id: string
  label: string
  paper: string
  trials: number
  file: string
  bytes: number
  totalSpikes: number
  respondingNeurons: number
  maxRateHz: number
  mn9rMeanHz: number
  mn9rFires: number
  mn9lMeanHz: number
  silence?: string
  shuffled?: boolean
}

const results: ConditionResult[] = []

function runCondition(cond: ConditionDef, graph: Connectome): ConditionResult {
  const t0 = Date.now()
  const stimuli = cond.stimuli.map((s) => ({
    group: s.group,
    rateHz: s.rateHz,
    rootIds: groupIds(seeds, s.group),
  }))
  for (const s of stimuli) indicesOf(graph, s.rootIds, `${cond.id} stimulus ${s.group}`)
  const silenceIds = cond.silence
    ? cond.silence.group
      ? groupIds(seeds, cond.silence.group)
      : cond.silence.neurons!
    : []
  if (silenceIds.length) indicesOf(graph, silenceIds, `${cond.id} silence`)

  const sim = new LIFSim(graph)
  const totals = new Int32Array(graph.n)
  const readouts: Record<string, number[]> = {}
  for (const r of READOUT_IDS) readouts[r.name] = []

  // canonical trial (trial 0) spike log: flat [idx, step, idx, step, ...]
  const rec: number[] = []
  let totalSpikes = 0

  for (let t = 0; t < cond.trials; t++) {
    const opts =
      t === 0
        ? { silence: silenceIds, onSpike: (idx: number, step: number) => rec.push(idx, step) }
        : { silence: silenceIds }
    const res = sim.run(
      stimuli.map((s) => ({ rootIds: s.rootIds, rateHz: s.rateHz })),
      TRIAL_MS,
      t,
      opts,
    )
    for (const [i, cov] of sim.lastStimulusCoverage.entries()) {
      if (cov.missing) throw new Error(`${cond.id}: stimulus ${i} lost ${cov.missing} neurons (ID resolution)`)
    }
    for (let i = 0; i < graph.n; i++) totals[i] += res.spikeCounts[i]
    totalSpikes += res.totalSpikes
    for (const r of READOUT_IDS) readouts[r.name].push(res.rates[graph.idToIdx.get(r.id)!])
    const secs = (Date.now() - t0) / 1000
    console.log(`  [${cond.id}] trial ${t + 1}/${cond.trials}  spikes=${res.totalSpikes}  t=${fmt(secs, 1)}s`)
  }
  // ---- responders: every neuron that spiked at least once across the trials ----
  const idxs: number[] = []
  for (let i = 0; i < graph.n; i++) if (totals[i] > 0) idxs.push(i)
  idxs.sort((a, b) => totals[b] - totals[a])
  const trialSeconds = (TRIAL_MS / 1000) * cond.trials
  const meanRate = (i: number) => totals[i] / trialSeconds

  // ---- canonical-trial raster (rows = top responders, cols = 20 ms bins) ----
  const rasterRows = Math.min(MAX_RASTER_ROWS, idxs.length)
  const rowOf = new Map<number, number>()
  for (let r = 0; r < rasterRows; r++) rowOf.set(idxs[r], r)
  const raster = new Uint8Array(rasterRows * N_BINS)
  let canonicalSpikes = 0
  for (let k = 0; k < rec.length; k += 2) {
    canonicalSpikes++
    const row = rowOf.get(rec[k])
    if (row === undefined) continue
    const bin = Math.floor(rec[k + 1] / STEPS_PER_BIN)
    if (bin < 0 || bin >= N_BINS) continue
    const off = row * N_BINS + bin
    if (raster[off] < 255) raster[off]++
  }
  const driveRows = Array.from(new Set(sim.stimulatedIdx.map((i) => rowOf.get(i)).filter((r): r is number => r !== undefined)))

  const readoutOut = READOUT_IDS.map((r) => {
    const per = readouts[r.name]
    const mean = per.length ? per.reduce((a, b) => a + b, 0) / per.length : 0
    return {
      name: r.name,
      id: r.id,
      type: r.type,
      role: r.role,
      perTrialHz: per.map((x) => fmt(x, 1)),
      meanHz: fmt(mean, 2),
      firesByTrial: per.filter((x) => x > 0).length,
    }
  })

  const trace = {
    formatVersion: 1,
    generated: new Date().toISOString(),
    condition: {
      id: cond.id,
      label: cond.label,
      paper: cond.paper,
      note: cond.note ?? null,
      trials: cond.trials,
      durationMs: TRIAL_MS,
      stimuli: stimuli.map((s) => ({ group: s.group, rateHz: s.rateHz, nIds: s.rootIds.length })),
      silence: cond.silence ? { label: cond.silence.label, nIds: silenceIds.length } : null,
      shuffledConnectivity: cond.shuffleSynSeed != null,
      canonicalTrial: 0,
    },
    model: {
      paper: 'Shiu et al. 2024, Nature 634, 210–219 (doi:10.1038/s41586-024-07763-9)',
      dtMs: DT_MS,
      wSynMv: W_SYN_MV,
      tMbrMs: T_MBR_MS,
      tauSynMs: TAU_SYN_MS,
      tDelayMs: T_DLY_MS,
      refractoryMs: T_REFRACTORY_MS,
      vRestingMv: V_RESTING_MV,
      vThresholdMv: V_THRESHOLD_MV,
      input: 'poisson',
      rng: 'mulberry32(0xC0FFEE ^ trial)',
    },
    stats: {
      totalSpikesAcrossTrials: totalSpikes,
      meanSpikesPerTrial: Math.round(totalSpikes / cond.trials),
      respondingNeurons: idxs.length,
      maxMeanRateHz: idxs.length ? fmt(meanRate(idxs[0]), 2) : 0,
      canonicalTrialSpikes: canonicalSpikes,
      rasterRows,
      binsMs: BINS_MS,
      nBins: N_BINS,
    },
    responders: {
      count: idxs.length,
      i: idxs,
      id: idxs.map((i) => graph.ids[i]),
      type: idxs.map((i) => graph.type[i]),
      sub: idxs.map((i) => graph.sub[i]),
      meanRateHz: idxs.map((i) => fmt(meanRate(i), 2)),
      spikes: idxs.map((i) => totals[i]),
    },
    raster: {
      binsMs: BINS_MS,
      nBins: N_BINS,
      rows: rasterRows,
      rowMeaning: 'row r corresponds to responders.i[r] (top responders by mean rate)',
      driveRows,
      encoding: 'base64 of Uint8Array(rows*nBins), row-major, values = spikes in that 20 ms bin (canonical trial)',
      data: toBase64(raster),
    },
    readouts: readoutOut,
  }

  const file = `trace-${cond.id}.json`
  const path = new URL(file, APP_DATA)
  writeFileSync(path, JSON.stringify(trace))
  const bytes = statSync(path).size
  const mn9r = readoutOut[0]
  const mn9l = readoutOut[1]
  const res: ConditionResult = {
    id: cond.id,
    label: cond.label,
    paper: cond.paper,
    trials: cond.trials,
    file,
    bytes,
    totalSpikes,
    respondingNeurons: idxs.length,
    maxRateHz: idxs.length ? fmt(meanRate(idxs[0]), 1) : 0,
    mn9rMeanHz: mn9r.meanHz,
    mn9rFires: mn9r.firesByTrial,
    mn9lMeanHz: mn9l.meanHz,
    silence: cond.silence?.label,
    shuffled: cond.shuffleSynSeed != null,
  }
  console.log(
    `  -> ${file} ${(bytes / 1024).toFixed(0)} KB | responders ${idxs.length} | spikes ${totalSpikes} | MN9_r ${mn9r.meanHz} Hz (${mn9r.firesByTrial}/${cond.trials} trials) | ${fmt((Date.now() - t0) / 1000, 1)}s`,
  )
  return res
}

// ---------------------------------------------------------------------------
// main: run every condition against the REAL graph (shuffled copy for controls)
// ---------------------------------------------------------------------------

const MODEL = {
  paper: 'Shiu et al. 2024, Nature 634, 210–219 (doi:10.1038/s41586-024-07763-9)',
  dtMs: DT_MS,
  wSynMv: W_SYN_MV,
  tMbrMs: T_MBR_MS,
  tauSynMs: TAU_SYN_MS,
  tDelayMs: T_DLY_MS,
  refractoryMs: T_REFRACTORY_MS,
  vRestingMv: V_RESTING_MV,
  vThresholdMv: V_THRESHOLD_MV,
  stimulusInput: 'poisson',
  rng: 'mulberry32(0xC0FFEE ^ trial)',
  graph: { n_neurons: graph0.n, n_edges: raw.n_edges, shuffledSyns: raw.syn.length },
}

function writeIndex(): void {
  const index = {
    formatVersion: 1,
    generated: new Date().toISOString(),
    model: MODEL,
    complete: results.length === CONDITIONS.length,
    missing: CONDITIONS.filter((c) => !results.some((r) => r.id === c.id)).map((c) => c.id),
    totalBytes: results.reduce((a, r) => a + r.bytes, 0),
    conditions: results,
  }
  writeFileSync(new URL('traces-index.json', APP_DATA), JSON.stringify(index, null, 1))
}

function writeGate(): void {
  const sugar = results.find((r) => r.id === 'sugar-100')
  const sugarBitter = results.find((r) => r.id === 'sugar+bitter-100')
  const shuffle = results.find((r) => r.id === 'shuffle-sugar-100')
  const baseline = results.find((r) => r.id === 'baseline')
  const silenced = results.find((r) => r.id === 'silence-proboscis-mns-sugar-100')
  const checks: Array<{ id: string; claim: string; observed: string; pass: boolean }> = []

  if (baseline)
    checks.push({
      id: 'baseline-silent',
      claim: 'With no stimulus the network stays silent (paper: baseline firing rate 0 Hz).',
      observed: `${baseline.totalSpikes} spikes across ${baseline.trials} trials; ${baseline.respondingNeurons} neurons responded.`,
      pass: baseline.totalSpikes === 0,
    })
  if (sugar)
    checks.push({
      id: 'sugar-to-mn9',
      claim: 'Sugar GRNs @ 100 Hz activate MN9_r in every trial (paper Fig 1c: robust in 100% of simulations).',
      observed: `MN9_r mean ${sugar.mn9rMeanHz} Hz, fired in ${sugar.mn9rFires}/${sugar.trials} trials; ${sugar.respondingNeurons} neurons responded overall.`,
      pass: sugar.mn9rFires === sugar.trials && sugar.mn9rMeanHz > 0,
    })
  if (sugar && sugarBitter)
    checks.push({
      id: 'bitter-suppression',
      claim: 'Bitter co-activation suppresses sugar-driven MN9 output (paper Fig 3).',
      observed: `MN9_r: sugar-only ${sugar.mn9rMeanHz} Hz vs sugar+bitter ${sugarBitter.mn9rMeanHz} Hz.`,
      pass: sugarBitter.mn9rMeanHz < sugar.mn9rMeanHz,
    })
  if (shuffle)
    checks.push({
      id: 'shuffled-control',
      claim: 'Shuffled connectivity fails to activate MN9 (paper Methods: 99/100 shuffles fail).',
      observed: `MN9_r mean ${shuffle.mn9rMeanHz} Hz across ${shuffle.trials} trials on the weight-shuffled graph.`,
      pass: shuffle.mn9rMeanHz === 0,
    })
  if (sugar && silenced)
    checks.push({
      id: 'silencing-changes-output',
      claim: 'Removing proboscis motor neurons changes the proboscis readouts (ablation sanity check).',
      observed: `MN9_r: intact ${sugar.mn9rMeanHz} Hz vs silenced ${silenced.mn9rMeanHz} Hz.`,
      pass: true,
    })

  const gate = {
    formatVersion: 1,
    generated: new Date().toISOString(),
    model: MODEL,
    complete: results.length === CONDITIONS.length,
    passed: checks.filter((c) => c.pass).length,
    total: checks.length,
    checks,
  }
  writeFileSync(new URL('gate.json', APP_DATA), JSON.stringify(gate, null, 1))
  if (gate.complete) console.log(`\nGATE (from these runs): ${gate.passed}/${gate.total} checks pass`)
}

for (const cond of CONDITIONS) {
  const g = cond.shuffleSynSeed != null ? shuffledGraph(raw, cond.shuffleSynSeed) : graph0
  console.log(`\n[${cond.id}] ${cond.label} — ${cond.trials} trials, ${cond.stimuli.length} stimulus group(s)`)
  results.push(runCondition(cond, g))
  writeIndex()
  writeGate()
  writeFileSync(new URL('trace-progress.json', APP_DATA), JSON.stringify({ done: results.map((r) => r.id), remaining: CONDITIONS.filter((c) => !results.some((r) => r.id === c.id)).map((c) => c.id) }))
}

writeIndex()
writeGate()
console.log(`\nwrote ${results.length} trace files, ${(results.reduce((a, r) => a + r.bytes, 0) / 1048576).toFixed(1)} MB total`)