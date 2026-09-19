import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { parseGraph, type RawGraph } from './graph'

/**
 * Cross-language verification of root-ID → node-index resolution.
 *
 * Why this exists: FlyWire root IDs (~7.2e17) exceed Number.MAX_SAFE_INTEGER,
 * so JSON numbers are rounded by JavaScript. Before the string-ID fix, 28 of
 * the 86 Shiu et al. 2024 seed IDs fell into rounded-double collisions, i.e.
 * `idToIdx.get(rootId)` could return the index of an unrelated neighbouring
 * neuron with no error raised. This script compares every TypeScript lookup
 * against the exact indices computed in Python by data/rebuild_graph.py
 * (data/processed/seed-index-truth.json) and fails loudly on any mismatch.
 *
 * Run: pnpm --filter @flylab/sim-core verify
 */
const DATA = '../../data/processed'

const raw = JSON.parse(gunzipSync(readFileSync(`${DATA}/connectome-graph.json.gz`)).toString()) as RawGraph
const c = parseGraph(raw)

interface Truth {
  n_seeds: number
  n_missing: number
  missing: Array<{ group: string; root_id: string }>
  index: Record<string, { index: number; group: string }>
}
const truth = JSON.parse(readFileSync(`${DATA}/seed-index-truth.json`, 'utf8')) as Truth

const ids = truth.index
const keys = Object.keys(ids)
let mismatches: string[] = []
let unresolved: string[] = []
const perGroup = new Map<string, { total: number; ok: number }>()

for (const key of keys) {
  const g = perGroup.get(ids[key].group) ?? { total: 0, ok: 0 }
  g.total++
  const got = c.idToIdx.get(key)
  if (got === undefined) {
    unresolved.push(`${ids[key].group} ${key}`)
  } else if (got !== ids[key].index) {
    mismatches.push(`${ids[key].group} ${key}: ts index ${got} != python index ${ids[key].index}`)
  } else {
    g.ok++
  }
  perGroup.set(ids[key].group, g)
}

// Also prove the graph's own ID table is exact and collision-free.
const unique = new Set(c.ids)
const dupes = c.ids.length - unique.size

console.log(`graph: ${c.n} neurons, ${c.ids.length} ids, ${unique.size} unique (duplicates: ${dupes})`)
for (const [group, g] of perGroup) console.log(`  ${group.padEnd(16)} ${g.ok}/${g.total} exact`)
console.log(`idToIdx resolutions checked: ${keys.length}`)
if (truth.n_missing) console.log(`seeds with no graph node (documented in seed-methodology.md): ${truth.n_missing}`)

if (dupes !== 0) {
  console.error('FAIL: duplicate root IDs in the bundle (index map would be lossy)')
  process.exit(1)
}
if (unresolved.length) {
  console.error(`FAIL: ${unresolved.length} seed IDs did not resolve:`, unresolved.slice(0, 10))
  process.exit(1)
}
if (mismatches.length) {
  console.error(`FAIL: ${mismatches.length} seed IDs resolved to the WRONG neuron:`)
  for (const m of mismatches.slice(0, 10)) console.error('  ' + m)
  process.exit(1)
}
console.log('PASS: every seed root ID resolves to the exact same neuron index as Python.')
