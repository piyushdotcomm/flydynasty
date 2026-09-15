#!/usr/bin/env python3
"""Regenerate data/processed/stats.json from the CURRENT graph bundle.

The committed stats.json described the old syn_count>=5-thresholded pipeline
(2,700,513 edges). The shipped bundle (data/rebuild_graph.py) is paper-faithful
and keeps every published neuron-pair edge (15,090,883 edges / 54,490,417
synapses). This script recomputes the graph-derived fields from
connectome-graph.json.gz, preserves the raw-source fields, and records what
changed. Run from flylab/:  python data/regen_stats.py
"""
import json
import gzip
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

PROC = Path(__file__).resolve().parent / "processed"

with gzip.open(PROC / "connectome-graph.json.gz", "rt", encoding="utf-8") as f:
    g = json.load(f)

n_edges = g["n_edges"]
total_syn = sum(g["syn"])

def sign_of(nt: str) -> int:
    s = str(nt).lower()
    if s in ("ach", "acetylcholine", "dopamine", "da", "octopamine", "oct", "serotonin", "ser", "5ht"):
        return 1
    if s in ("gaba", "glut", "glutamate"):
        return -1
    return 0

pre_nt = Counter(g["nt"][p] for p in g["pre"])
sign_counts = Counter(sign_of(g["nt"][p]) for p in g["pre"])

stats = json.loads((PROC / "stats.json").read_text(encoding="utf-8"))
regen = {
    "regenerated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    "regenerated_by": "data/regen_stats.py from data/processed/connectome-graph.json.gz",
    "policy": "paper-faithful: every published neuron-pair edge kept (no syn_count threshold)",
    "unique_neuron_pair_edges": n_edges,
    "total_synapses_on_kept_edges": total_syn,
    "edges_ge_threshold_removed": "n/a - no threshold in the shipped bundle",
    "edge_sign_counts": {
        "excitatory": sign_counts.get(1, 0),
        "inhibitory": sign_counts.get(-1, 0),
        "unknown_or_zero": sign_counts.get(0, 0),
    },
    "kept_edge_pre_nt_distribution": dict(pre_nt),
    "superseded_values_from_thresholded_pipeline": {
        "edges_ge_threshold": stats.get("edges_ge_threshold"),
        "total_synapses_on_kept_edges": stats.get("total_synapses_on_kept_edges"),
        "kept_edge_pre_nt_distribution": stats.get("kept_edge_pre_nt_distribution"),
    },
    "gaps": [
        "neurons in proofread_root_ids without Schlegel annotation row: 12",
        "neurons without Eckstein top_nt prediction: 601 (none appear as presynaptic in kept edges)",
        "per-edge NT probs in the old pipeline were unweighted neuropil means (approximation); shipped bundle uses per-neuron top_nt sign",
    ],
}
stats.update(regen)
(PROC / "stats.json").write_text(json.dumps(stats, indent=2) + "\n", encoding="utf-8")
print(f"stats.json regenerated: {n_edges} edges, {total_syn} synapses, signs {dict(sign_counts)}")
