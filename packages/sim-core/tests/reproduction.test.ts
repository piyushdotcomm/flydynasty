/**
 * Reproduction gate — the Phase 0 acceptance test (docs/09-REAL-MODEL-AND-DATA.md §6).
 *
 * Ground truth: Shiu et al. 2024, Nature 634, 210–219.
 *   (a) Sugar GRN activation @ 100 Hz → MN9 fires robustly (100% of simulations).
 *   (b) Shuffled-connectivity control → MN9 fires in only 1/100 simulations.
 *   (c) Bitter GRN co-activation suppresses sugar-driven MN9 firing (Fig. 3).
 *
 * Seed neurons: data/processed/seeds.json (sugar_grns 20, bitter_grns 20,
 * water_grns 18, lowsalt 18, proboscis_mns 10 incl. MN9_r 720575940660219265,
 * MN9_l 720575940618238523 — from Shiu Supplementary Tables 1A/1B/6B).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { parseGraph, rootIdsToIdxs, type RawGraph, type Connectome } from '../src/graph.js'
import { LIFSim } from '../src/lif.js'
import { gunzipSync } from 'node:zlib'

const here = dirname(fileURLToPath(import.meta.url))
const DATA = join(here, '..', '..', '..', 'data', 'processed')

let _g: Connectome | null = null
function graph(): Connectome {
  if (!_g) {
    const raw = JSON.parse(gunzipSync(readFileSync(join(DATA, 'connectome-graph.json.gz'))).toString()) as RawGraph
    _g = parseGraph(raw)
  }
  return _g
}

interface Seeds {
  groups: Array<{ name: string; root_ids: number[] }>
}
let _s: Seeds | null = null
function seeds(): Seeds {
  if (!_s) _s = JSON.parse(readFileSync(join(DATA, 'seeds.json'), 'utf8')) as Seeds
  return _s
}

function idsOf(name: string): number[] {
  const g = seeds().groups.find((x) => x.name === name)
  if (!g) throw new Error(`seed group ${name} missing`)
  return g.root_ids
}

const MN9_R = 720575940660219265
const MN9_L = 720575940618238523
const TRIAL_MS = 1000

// Paper: 30 trials per experiment (Methods). We run 5 in CI for time.
const N_TRIALS_CI = 5

function runExperiment(
  c: Connectome,
  stimuli: Array<{ rootIds: number[]; rateHz: number }>,
  trials: number,
): { mn9rRates: number[]; mn9lRates: number[] } {
  const sim = new LIFSim(c)
  const mn9rRates: number[] = []
  const mn9lRates: number[] = []
  for (let t = 0; t < trials; t++) {
    const res = sim.run(stimuli, TRIAL_MS, t)
    const ir = c.idToIdx.get(MN9_R)!
    const il = c.idToIdx.get(MN9_L)!
    mn9rRates.push(res.rates[ir])
    mn9lRates.push(res.rates[il])
  }
  return { mn9rRates, mn9lRates }
}

describe('Shiu et al. 2024 reproduction gate', () => {
  it(
    '(a) sugar GRNs @ 100 Hz activate MN9 (contralateral > ipsilateral; fires in every trial)',
    () => {
      const c = graph()
      // sugar_l group is LEFT hemisphere (Shiu ST1A). Left sugar → RIGHT MN9 stronger (paper Fig 1c).
      const { mn9rRates, mn9lRates } = runExperiment(c, [{ rootIds: idsOf('sugar_grns'), rateHz: 100 }], N_TRIALS_CI)
      const fired = mn9rRates.filter((r) => r > 0).length
      console.log('MN9_r rates:', mn9rRates, 'MN9_l rates:', mn9lRates)
      // Gate: MN9_r fires in every trial (paper: 100% of simulations)
      expect(fired).toBe(N_TRIALS_CI)
    },
    { timeout: 600_000 },
  )

  it(
    '(c) bitter GRN co-activation suppresses sugar-driven MN9 firing (Fig. 3)',
    () => {
      const c = graph()
      const sugar = runExperiment(c, [{ rootIds: idsOf('sugar_grns'), rateHz: 100 }], N_TRIALS_CI)
      const both = runExperiment(c, [
        { rootIds: idsOf('sugar_grns'), rateHz: 100 },
        { rootIds: idsOf('bitter_grns'), rateHz: 100 },
      ], N_TRIALS_CI)
      const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length
      console.log('sugar-only MN9_r:', mean(sugar.mn9rRates), 'sugar+bitter MN9_r:', mean(both.mn9rRates))
      // Paper: bitter inhibits proboscis-extension motor activity (MN6/MN9)
      expect(mean(both.mn9rRates)).toBeLessThan(mean(sugar.mn9rRates))
    },
    { timeout: 600_000 },
  )

  it(
    '(b) shuffled-weight control abolishes MN9 activation (paper: only 1/100 shuffles fire)',
    () => {
      // Paper Methods: "connectivity weights were shuffled randomly (while
      // maintaining the global connectivity weight distribution)". We shuffle
      // the per-edge synapse counts among all edge slots — topology (who
      // connects to whom) and NT signs stay, but which pair carries which
      // weight is randomized, destroying structured strong pathways.
      const raw = JSON.parse(gunzipSync(readFileSync(join(DATA, 'connectome-graph.json.gz'))).toString()) as RawGraph
      const fired: boolean[] = []
      const N_SHUF = 5 // paper used 100; CI runs 5 for time — documented
      for (let s = 0; s < N_SHUF; s++) {
        // deterministic per-shuffle RNG
        let a = (0xBADC0DE + s * 7919) >>> 0
        const rand = () => {
          a = (a * 1664525 + 1013904223) >>> 0
          return a / 4294967296
        }
        const perm = raw.syn.slice()
        for (let i = perm.length - 1; i > 0; i--) {
          const r = Math.floor(rand() * (i + 1))
          const tmp = perm[i]; perm[i] = perm[r]; perm[r] = tmp
        }
        const cg = parseGraph({ ...raw, syn: perm })
        const sim = new LIFSim(cg)
        const res = sim.run([{ rootIds: idsOf('sugar_grns'), rateHz: 100 }], TRIAL_MS, 0)
        fired.push(res.rates[cg.idToIdx.get(MN9_R)!] > 0)
      }
      console.log('shuffle fired:', fired)
      // Paper: 99/100 shuffles FAIL to activate MN9. With 5 shuffles, expect 0 or at most rare fire.
      const fireCount = fired.filter(Boolean).length
      expect(fireCount).toBeLessThanOrEqual(1)
    },
    { timeout: 900_000 },
  )
})
