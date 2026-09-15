"""
Rebuild the connectome graph bundle — paper-faithful.

Fixes over the first ETL pass:
1. Edge threshold: syn_count >= 1 (paper used all connections; the earlier
   >=5 threshold silently dropped the sensory GRN edges, breaking the
   reproduction gate).
2. E/I sign per presynaptic neuron from Eckstein top_nt:
   inhibitory = GABA / glutamate, else excitatory (Shiu et al. 2024 Methods;
   fly glutamate is inhibitory at CNS synapses).
3. NaN-safe serialization (allow_nan=False).
4. seeds.json root IDs as integers (string IDs broke joins).
5. Root IDs are emitted as STRINGS. FlyWire root IDs are ~7.2e17, above
   Number.MAX_SAFE_INTEGER (9.007e15), so JavaScript/JSON.parse rounds them:
   measured on this bundle, 139,248 IDs collapsed to 110,654 distinct
   doubles (23,748 collision buckets, 28,594 neurons shadowed, worst bucket
   6 IDs) and 28 of the 86 Shiu seed IDs sat in a colliding bucket, so
   idToIdx lookups could return a neighbouring neuron. Strings are exact.
   seed-index-truth.json is written alongside so the TypeScript side can
   cross-check its own index lookups against these exact Python indices.

Sources: Zenodo 10676866 (connections, CC-BY-4.0),
Schlegel et al. 2024 annotations TSV, Eckstein et al. 2024 top_nt.
"""
import pyarrow.feather as pf
import pandas as pd
import numpy as np
import json, gzip, math, os

D = r'E:\fruitfly\flylab\data'
OUT = os.path.join(D, 'processed')

def clean(v):
    try:
        f = float(v)
        return 0.0 if (math.isnan(f) or math.isinf(f)) else round(f, 1)
    except Exception:
        return 0.0

def cl(x):
    try:
        s = str(x)
        return s if s and s.lower() != 'nan' else 'unknown'
    except Exception:
        return 'unknown'

INHIBITORY = {'gaba', 'glutamate'}

# --- connections: ALL pairs (paper-faithful, no threshold) ---
raw = pf.read_table(os.path.join(D, 'raw', 'proofread_connections_783.feather')).to_pandas()
agg = raw.groupby(['pre_pt_root_id', 'post_pt_root_id'], as_index=False)['syn_count'].sum()
del raw

# --- annotations + NT ---
ann = pd.read_csv(os.path.join(D, 'raw', 'Supplemental_file1_neuron_annotations.tsv'), sep='\t', low_memory=False)
ann = ann.drop_duplicates(subset='root_id')
nt_map = dict(zip(ann['root_id'].astype('int64'), ann['top_nt'].astype(str).str.lower()))
soma_x = dict(zip(ann['root_id'].astype('int64'), ann['soma_x']))
soma_y = dict(zip(ann['root_id'].astype('int64'), ann['soma_y']))
soma_z = dict(zip(ann['root_id'].astype('int64'), ann['soma_z']))
type_map = dict(zip(ann['root_id'].astype('int64'), ann['cell_type'].astype(str)))
cls_map = dict(zip(ann['root_id'].astype('int64'), ann['cell_class'].astype(str)))
sub_map = dict(zip(ann['root_id'].astype('int64'), ann['cell_sub_class'].astype(str)))
sup_map = dict(zip(ann['root_id'].astype('int64'), ann['super_class'].astype(str)))

ids = np.array(sorted(ann['root_id'].astype('int64').tolist()), dtype='int64')
idx = {int(r): i for i, r in enumerate(ids)}

def sign_of(rid: int) -> int:
    nt = nt_map.get(rid, 'unknown')
    if nt in INHIBITORY:
        return -1
    if nt in ('unknown', 'nan', ''):
        return 0
    return 1

n = len(ids)
sign = np.array([sign_of(int(r)) for r in ids], dtype=np.int8)

mask = agg['pre_pt_root_id'].isin(idx) & agg['post_pt_root_id'].isin(idx)
conn = agg[mask]
pre = np.array([idx[int(x)] for x in conn['pre_pt_root_id']], dtype=np.int32)
post = np.array([idx[int(x)] for x in conn['post_pt_root_id']], dtype=np.int32)
syn = conn['syn_count'].values.astype(np.int32)
sgn = sign[pre]

pkg = {
    'n_neurons': int(n),
    'n_edges': int(len(pre)),
    'pre': pre.tolist(), 'post': post.tolist(), 'syn': syn.tolist(), 'sign': sgn.tolist(),
    'soma': [clean(soma_x.get(int(r))) for r in ids],
    'soma_y': [clean(soma_y.get(int(r))) for r in ids],
    'soma_z': [clean(soma_z.get(int(r))) for r in ids],
    'type': [cl(type_map.get(int(r))) for r in ids],
    'cls': [cl(cls_map.get(int(r))) for r in ids],
    'sub': [cl(sub_map.get(int(r))) for r in ids],
    'sup': [cl(sup_map.get(int(r))) for r in ids],
    'nt': [cl(nt_map.get(int(r))) for r in ids],
    # exact decimal strings: root IDs exceed JS Number.MAX_SAFE_INTEGER
    'ids': [str(int(r)) for r in ids],
}
out_path = os.path.join(OUT, 'connectome-graph.json.gz')
with gzip.open(out_path, 'wt') as f:
    f.write(json.dumps(pkg, separators=(',', ':'), allow_nan=False))

print('neurons:', n, 'edges:', len(pre), 'total synapses:', int(syn.sum()))
print('sign dist: exc', int((sgn > 0).sum()), 'inh', int((sgn < 0).sum()), 'unknown', int((sgn == 0).sum()))
print('gz size MB:', round(os.path.getsize(out_path) / 1e6, 1))

# ---------------------------------------------------------------------------
# Seed index truth: exact (Python) node index for every Shiu et al. 2024 seed
# root ID. The TypeScript sim looks IDs up in a string-keyed map; verify.ts
# compares its lookups against this file, so an ID-precision regression (or a
# STIMULUS that silently hits the wrong neuron) fails loudly instead of
# quietly changing the model's result.
# ---------------------------------------------------------------------------
seed_path = os.path.join(OUT, 'seeds.json')
if os.path.exists(seed_path):
    with open(seed_path) as fh:
        seeds = json.load(fh)
    truth = {}
    missing = []
    for grp in seeds.get('groups', []):
        for rid in grp['root_ids']:
            key = str(int(rid))
            i = idx.get(int(rid))
            if i is None:
                missing.append({'group': grp['name'], 'root_id': key})
            else:
                truth[key] = {'index': int(i), 'group': grp['name']}
    with open(os.path.join(OUT, 'seed-index-truth.json'), 'w') as fh:
        json.dump({'n_seeds': len(truth), 'n_missing': len(missing),
                   'missing': missing, 'index': truth}, fh, indent=1)
    print('seed-index-truth.json:', len(truth), 'seeds resolved;', len(missing), 'missing')
    if missing:
        print('MISSING SEED IDS:', missing)
