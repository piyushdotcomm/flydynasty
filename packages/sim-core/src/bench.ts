import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { parseGraph, type RawGraph } from './graph'
import { LIFSim } from './lif'
const t0 = Date.now()
const raw = JSON.parse(gunzipSync(readFileSync('../../data/processed/connectome-graph.json.gz')).toString()) as RawGraph
const c = parseGraph(raw)
console.log('graph loaded', c.n, 'nodes', (Date.now() - t0) / 1000, 's')
const seeds = JSON.parse(readFileSync('../../data/processed/seeds.json', 'utf8'))
const sugar: string[] = seeds.groups.find((g: any) => g.name === 'sugar_grns').root_ids.map(String)
const sim = new LIFSim(c)
const t1 = Date.now()
const res = sim.run([{ rootIds: sugar, rateHz: 100 }], 1000, 0)
const dt = (Date.now() - t1) / 1000
console.log('sim time', dt, 's; total spikes', res.totalSpikes, '; responding', res.responding.length)
const MN9_R = '720575940660219265'
const i = c.idToIdx.get(MN9_R)!
console.log('MN9_r', MN9_R, '-> index', i, '| type', c.type[i], '| rate', res.rates[i], 'Hz', '| stimulus coverage', JSON.stringify(sim.lastStimulusCoverage))
console.log('top 20:')
for (const r of res.responding.slice(0, 20)) console.log(' ', r.type, r.rootId, r.spikes, 'spikes', r.rateHz.toFixed(1), 'Hz')

