"""Process FlyWire connectome raw data into simulator-ready parquet/json.

Sources (all verified by checksum, see DATA-MANIFEST.md):
- Zenodo 10676866: proofread_connections_783.feather (16,847,997 neuron-pair x neuropil edges),
  proofread_root_ids_783.npy (proofread root IDs)
- flyconnectome/flywire_annotations Supplemental_file1_neuron_annotations.tsv
  (cell types, hierarchy, soma side, top_nt Eckstein predictions)
- flyconnectome/drosophila_neurotransmitters gt_data.csv + cell_type_cross_matching.csv
  (literature ground truth NTs per cell type)

Outputs in E:\\fruitfly\\flylab\\data\\processed\\:
- connections.parquet       edges with syn_count >= 5 (summed over neuropils), NT-weighted
- neuron_table.parquet      one row per proofread neuron: root_id, cell types, NT, E/I sign
- stats.json               counts, thresholds, gaps
"""
import json
import numpy as np
import pandas as pd
import pyarrow.feather as feather
import pyarrow as pa
import pyarrow.parquet as pq

RAW = r"E:\fruitfly\flylab\data\raw"
OUT = r"E:\fruitfly\flylab\data\processed"
SYN_THRESHOLD = 5

# ---------------- 1. Connections ----------------
print("reading connections feather...")
t = feather.read_table(RAW + r"\proofread_connections_783.feather", memory_map=True)
df = t.to_pandas()
print("raw edge rows (pair x neuropil):", len(df))

# Aggregate neuropil rows into one edge per neuron pair, syn_count-weighted NT probs
nt_cols = ["gaba_avg", "ach_avg", "glut_avg", "oct_avg", "ser_avg", "da_avg"]
print("aggregating over neuropils...")
agg = df.groupby(["pre_pt_root_id", "post_pt_root_id"], as_index=False, sort=False).agg(
    syn_count=("syn_count", "sum"),
    n_neuropils=("neuropil", "nunique"),
    **{c: (c, "mean") for c in nt_cols},
)
print("unique neuron-pair edges:", len(agg))

strong = agg[agg.syn_count >= SYN_THRESHOLD].copy()
print(f"edges with syn_count >= {SYN_THRESHOLD}:", len(strong))

# Dominant NT for the presynaptic neuron of each edge (prob mass argmax, unweighted mean)
probs = strong[nt_cols].to_numpy()
dom_idx = probs.argmax(axis=1)
NT_NAMES = ["GABA", "ACh", "Glut", "Octopamine", "Serotonin", "Dopamine"]
strong["pre_nt_edge"] = [NT_NAMES[i] for i in dom_idx]

# main neuropil per edge = neuropil with max syn_count from the raw table
print("finding main neuropil per edge...")
idx = df.groupby(["pre_pt_root_id", "post_pt_root_id"])["syn_count"].idxmax()
main_npl = df.loc[idx, ["pre_pt_root_id", "post_pt_root_id", "neuropil"]].rename(
    columns={"neuropil": "neuropil_main"}
)
strong = strong.merge(main_npl, on=["pre_pt_root_id", "post_pt_root_id"], how="left")

cols = ["pre_pt_root_id", "post_pt_root_id", "syn_count", "n_neuropils", "neuropil_main", "pre_nt_edge"] + nt_cols
strong = strong[cols].sort_values(["pre_pt_root_id", "syn_count"], ascending=[True, False]).reset_index(drop=True)
pq.write_table(pa.Table.from_pandas(strong, preserve_index=False), OUT + r"\connections.parquet")
print("wrote connections.parquet:", len(strong), "edges")

# ---------------- 2. Neuron table ----------------
print("reading annotations...")
ann = pd.read_csv(RAW + r"\Supplemental_file1_neuron_annotations.tsv", sep="\t", low_memory=False)
print("annotation rows:", len(ann))

ann_cols = [
    "root_id", "soma_x", "soma_y", "soma_z", "side",
    "flow", "super_class", "cell_class", "cell_sub_class", "cell_type", "hemibrain_type",
    "ito_lee_hemilineage", "hartenstein_hemilineage", "top_nt", "top_nt_conf", "nucleus_id",
]
ann_s = ann[ann_cols].copy()

root_ids = np.load(RAW + r"\proofread_root_ids_783.npy")
print("proofread root ids:", len(root_ids))

n = ann_s[ann_s.root_id.isin(root_ids)].copy()
print("annotated neurons that are proofread:", len(n))

# E/I sign per Shiu et al. 2024 (lif-params.ts): GABA/Glut inhibitory, others excitatory
INHIBITORY = {"GABA", "Glut"}
def nt_sign(nt):
    if pd.isna(nt) or str(nt).strip() == "":
        return None
    return -1 if str(nt).strip() in INHIBITORY else 1
n["nt_sign"] = n["top_nt"].map(nt_sign)

nt_counts = n["top_nt"].value_counts(dropna=False)
print("top_nt distribution:\n", nt_counts.to_string())

pq.write_table(pa.Table.from_pandas(n, preserve_index=False), OUT + r"\neuron_table.parquet")
print("wrote neuron_table.parquet:", len(n), "neurons")

# ---------------- 3. Literature NT ground truth (per cell type) ----------------
gt = pd.read_csv(RAW + r"\gt_data.csv", low_memory=False)
print("gt_data rows:", len(gt))
xm = pd.read_csv(RAW + r"\cell_type_cross_matching.csv", low_memory=False)
print("cross-matching rows:", len(xm))
pq.write_table(pa.Table.from_pandas(gt, preserve_index=False), OUT + r"\nt_ground_truth.parquet")
pq.write_table(pa.Table.from_pandas(xm, preserve_index=False), OUT + r"\nt_cross_matching.parquet")

# coverage: how many annotated proofread neurons have a literature-verified NT for their cell type
NT_COLS = ["acetylcholine", "glutamate", "gaba", "glycine", "dopamine", "serotonin", "octopamine", "tyramine", "histamine", "nitric_oxide"]
gt_pos = gt[gt[NT_COLS].max(axis=1) == 1]
covered_types = set(gt_pos["cell_type"].dropna().astype(str))
n["cell_type_str"] = n["cell_type"].astype(str)
n["gt_nt_available"] = n["cell_type_str"].isin(covered_types)
gt_covered = int(n["gt_nt_available"].sum())

# ---------------- 4. Stats ----------------
stats = {
    "source_version": "FlyWire release 783",
    "synapse_count_threshold": SYN_THRESHOLD,
    "raw_pair_neuropil_rows": int(len(df)),
    "unique_neuron_pair_edges": int(len(agg)),
    "edges_ge_threshold": int(len(strong)),
    "total_synapses_on_kept_edges": int(strong.syn_count.sum()),
    "proofread_root_ids": int(len(root_ids)),
    "annotation_rows": int(len(ann)),
    "neurons_in_table": int(len(n)),
    "neurons_with_nt_prediction": int(n["top_nt"].notna().sum()),
    "neurons_with_nt_sign": int(n["nt_sign"].notna().sum()),
    "neurons_without_nt": int(n["top_nt"].isna().sum()),
    "neurons_with_gt_nt_for_cell_type": gt_covered,
    "top_nt_distribution": {str(k): int(v) for k, v in nt_counts.items()},
    "kept_edge_pre_nt_distribution": {str(k): int(v) for k, v in strong["pre_nt_edge"].value_counts().items()},
    "gaps": [
        f"edges below syn_count {SYN_THRESHOLD} dropped (keep-threshold policy): {int(len(agg) - len(strong))}",
        f"neurons in proofread_root_ids without Schlegel annotation row: {int(len(root_ids) - len(n))}",
        f"neurons without Eckstein top_nt prediction: {int(n['top_nt'].isna().sum())}",
        "per-edge NT probs are unweighted means across neuropil rows, not synapse-weighted (approximation)",
    ],
}
with open(OUT + r"\stats.json", "w") as fh:
    json.dump(stats, fh, indent=2)
print(json.dumps(stats, indent=2))
print("DONE")
