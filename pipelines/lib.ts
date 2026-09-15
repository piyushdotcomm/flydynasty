/**
 * Shared helpers for the offline export pipelines.
 *
 * Root IDs are handled as exact decimal STRINGS end to end: FlyWire root IDs
 * (~7.2e17) exceed Number.MAX_SAFE_INTEGER, so any JSON number round-trips
 * through a lossy double (see data/rebuild_graph.py for the measurements).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { parseGraph, type Connectome, type RawGraph } from '../packages/sim-core/src/graph.js'

export const PROCESSED = new URL('../data/processed/', import.meta.url)
export const APP_DATA = new URL('../packages/app/public/data/', import.meta.url)

export function loadRawGraph(): RawGraph {
  const buf = readFileSync(new URL('connectome-graph.json.gz', PROCESSED))
  const raw = JSON.parse(gunzipSync(buf).toString()) as RawGraph
  if (typeof raw.ids[0] !== 'string') {
    throw new Error(
      'connectome-graph.json.gz has numeric root IDs — those are rounded by JSON.parse. ' +
        'Rebuild it: python data/rebuild_graph.py',
    )
  }
  return raw
}

export function loadGraph(): Connectome {
  return parseGraph(loadRawGraph())
}

export interface SeedGroup {
  name: string
  root_ids: (number | string)[]
  evidence: string
}
export interface Seeds {
  groups: SeedGroup[]
  needs_verification: string[]
}

export function loadSeeds(): Seeds {
  const seeds = JSON.parse(readFileSync(new URL('seeds.json', PROCESSED), 'utf8')) as Seeds
  // Fail loud: root IDs must be decimal STRINGS. If this file ever regresses to
  // JSON numbers, JSON.parse silently rounds every ID above 2^53 and stimulus
  // lookups miss the graph (this exact bug was caught by export_traces.ts).
  for (const g of seeds.groups) {
    const bad = (g.root_ids ?? []).filter((v) => typeof v !== 'string')
    if (bad.length) {
      throw new Error(
        `seeds.json group "${g.name}": ${bad.length} root IDs are not strings ` +
          '(root IDs exceed Number.MAX_SAFE_INTEGER and get rounded by JSON.parse). ' +
          'Run: python data/fix_seeds_json.py',
      )
    }
  }
  return seeds
}

/** seed group → exact decimal root ID strings */
export function groupIds(seeds: Seeds, name: string): string[] {
  const g = seeds.groups.find((x) => x.name === name)
  if (!g) throw new Error(`seed group ${name} not found in seeds.json`)
  return g.root_ids.map(String)
}

/** Resolve root IDs to node indices, failing loud on any ID that does not resolve. */
export function indicesOf(c: Connectome, ids: string[], what: string): number[] {
  const out: number[] = []
  const missing: string[] = []
  for (const id of ids) {
    const i = c.idToIdx.get(id)
    if (i === undefined) missing.push(id)
    else out.push(i)
  }
  if (missing.length) {
    throw new Error(`${what}: ${missing.length} root IDs did not resolve in the graph (e.g. ${missing.slice(0, 3).join(', ')})`)
  }
  return out
}

export function gzipWrite(path: URL, text: string): void {
  // not used yet; kept so callers can pre-compress if we ever need it
  writeFileSync(path, text)
}

export function writeJson(path: URL, value: unknown, pretty = false): void {
  writeFileSync(path, pretty ? JSON.stringify(value, null, 1) : JSON.stringify(value))
}

/** base64 of a Uint8Array (raster payloads) without Node Buffer typing drama */
export function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64')
}

export function fmt(n: number, digits = 1): number {
  return Math.round(n * 10 ** digits) / 10 ** digits
}