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
    'ids': ids.tolist(),
}
out_path = os.path.join(OUT, 'connectome-graph.json.gz')
with gzip.open(out_path, 'wt') as f:
    f.write(json.dumps(pkg, separators=(',', ':'), allow_nan=False))

print('neurons:', n, 'edges:', len(pre), 'total synapses:', int(syn.sum()))
print('sign dist: exc', int((sgn > 0).sum()), 'inh', int((sgn < 0).sum()), 'unknown', int((sgn == 0).sum()))
print('gz size MB:', round(os.path.getsize(out_path) / 1e6, 1))
