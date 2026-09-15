/**
 * Leaky integrate-and-fire simulation — faithful implementation of
 * Shiu et al. 2024, Nature 634, 210–219 (Methods: "Computational model").
 *
 * Equations (α-synapse LIF, per paper):
 *   dv_i/dt = (g_i - (v_i - V_resting)) / T_mbr
 *   dg_i/dt = -g_i / tau
 *   g_i += w_j,i  upon presynaptic spike (delayed by T_dly)
 *   spike when v >= V_threshold; reset v = V_reset; refractory T_refractory.
 *
 * All constants are in lif-params.ts, each cited to the paper.
 */
import {
  V_RESTING_MV, V_RESET_MV, V_THRESHOLD_MV, T_MBR_MS,
  T_REFRACTORY_MS, TAU_SYN_MS, T_DLY_MS, TRIAL_MS,
} from './lif-params.js'
import type { Connectome } from './graph.js'

/** Deterministic RNG (mulberry32) — required for reproducible trials. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface Stimulus {
  rootIds: number[]
  rateHz: number
}

export interface SimResult {
  /** spikes per node over the run */
  spikeCounts: Int32Array
  /** firing rate (Hz) per node over the whole run */
  rates: Float32Array
  /** nodes that spiked at least once, with counts, sorted desc */
  responding: Array<{ idx: number; rootId: number; type: string; spikes: number; rateHz: number }>
  durationMs: number
  totalSpikes: number
}

const DT_MS = 0.1 // timestep; paper used Brian2 (default 0.1 ms). Documented choice.
const DELAY_STEPS = Math.round(T_DLY_MS / DT_MS)
const REFRAC_STEPS = Math.round(T_REFRACTORY_MS / DT_MS)

export class LIFSim {
  private c: Connectome
  v: Float32Array
  g: Float32Array
  lastSpikeStep: Int32Array
  /** ring buffer of pending synaptic events: per step, list of (dst, w) */
  private events: Array<Array<[number, number]>>
  private step = 0

  constructor(c: Connectome) {
    this.c = c
    this.v = new Float32Array(c.n).fill(V_RESTING_MV)
    this.g = new Float32Array(c.n)
    this.lastSpikeStep = new Int32Array(c.n).fill(-1e9)
    this.events = []
    for (let s = 0; s < DELAY_STEPS + 2; s++) this.events.push([])
  }

  reset(seedIgnored?: number): void {
    this.v.fill(V_RESTING_MV)
    this.g.fill(0)
    this.lastSpikeStep.fill(-1e9)
    this.step = 0
    for (const ev of this.events) ev.length = 0
  }

  /**
   * Run one trial. Poisson stimulus on given root IDs at rateHz
   * (paper Methods: Poisson-distributed input, 30 trials x 1000 ms).
   */
  run(stimuli: Stimulus[], durationMs = TRIAL_MS, trial = 0): SimResult {
    this.reset()
    const c = this.c
    const nSteps = Math.round(durationMs / DT_MS)
    const spikeCounts = new Int32Array(c.n)
    // Poisson firing probability per step for each stimulated set
    const stimNodes: Array<{ idxs: number[]; pPerStep: number }> = []
    for (let s = 0; s < stimuli.length; s++) {
      const idxs: number[] = []
      for (const r of stimuli[s].rootIds) {
        const i = c.idToIdx.get(r)
        if (i !== undefined) idxs.push(i)
      }
      stimNodes.push({ idxs, pPerStep: (stimuli[s].rateHz * DT_MS) / 1000 })
    }
    const rng = mulberry32(0xC0FFEE ^ trial)
    const cur = this.step
    let totalSpikes = 0
    const evLen = this.events.length

    for (let k = 0; k < nSteps; k++) {
      const globalStep = cur + k
      const ev = this.events[globalStep % evLen]
      // apply scheduled synaptic events
      for (let e = 0; e < ev.length; e++) {
        const [d, wv] = ev[e]
        this.g[d] += wv
      }
      ev.length = 0
      // Poisson input
      for (let s = 0; s < stimNodes.length; s++) {
        const sn = stimNodes[s]
        const p = sn.pPerStep
        if (p <= 0) continue
        for (let t = 0; t < sn.idxs.length; t++) {
          if (rng() < p) this.injectSpike(sn.idxs[t], globalStep)
        }
      }
      // integrate + spike
      const leakFactor = 1 - DT_MS / T_MBR_MS
      const gFactor = 1 - DT_MS / TAU_SYN_MS
      for (let i = 0; i < c.n; i++) {
        let gv = this.g[i]
        if (gv !== 0) {
          gv *= gFactor
          if (gv < 1e-7 && gv > -1e-7) gv = 0
          this.g[i] = gv
        }
        let vv = this.v[i]
        // dv/dt = (g - (v - Vrest)) / T  ->  v += dt/T * (g - (v - Vrest))
        vv += (DT_MS / T_MBR_MS) * (gv - (vv - V_RESTING_MV))
        if (vv >= V_THRESHOLD_MV && globalStep - this.lastSpikeStep[i] >= REFRAC_STEPS) {
          // spike
          this.lastSpikeStep[i] = globalStep
          this.v[i] = V_RESET_MV
          this.g[i] = gv
          spikeCounts[i]++
          totalSpikes++
          // schedule out-edges at delay
          const fireStep = globalStep + DELAY_STEPS
          const evq = this.events[fireStep % evLen]
          const o0 = c.off[i], o1 = c.off[i + 1]
          for (let o = o0; o < o1; o++) evq.push([c.dst[o], c.w[o]] as [number, number])
        } else {
          this.v[i] = vv
        }
      }
    }
    const rates = new Float32Array(c.n)
    const responding: SimResult['responding'] = []
    const secs = durationMs / 1000
    for (let i = 0; i < c.n; i++) {
      if (spikeCounts[i] > 0) {
        rates[i] = spikeCounts[i] / secs
        responding.push({ idx: i, rootId: c.ids[i] as unknown as number, type: c.type[i], spikes: spikeCounts[i], rateHz: spikeCounts[i] / secs })
      }
    }
    responding.sort((a, b) => b.spikes - a.spikes)
    return { spikeCounts, rates, responding, durationMs, totalSpikes }
  }

  private injectSpike(i: number, globalStep: number): void {
    // stimulus spike: same dynamics as endogenous spike
    if (globalStep - this.lastSpikeStep[i] < REFRAC_STEPS) return
    this.lastSpikeStep[i] = globalStep
    this.v[i] = V_RESET_MV
    const c = this.c
    const fireStep = globalStep + DELAY_STEPS
    const evq = this.events[fireStep % this.events.length]
    const o0 = c.off[i], o1 = c.off[i + 1]
    for (let o = o0; o < o1; o++) evq.push([c.dst[o], c.w[o]] as [number, number])
  }
}
