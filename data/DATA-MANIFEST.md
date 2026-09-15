# DATA MANIFEST — FlyWire Whole-Brain Connectome (release 783)

Processed: 2026-09-15. All raw files verified by cryptographic hash against
publisher metadata at download time. **No fabricated data** — every value in
`processed/` derives from the raw files below.

## 1. Raw sources (`flylab/data/raw/`)

| File | Size (bytes) | MD5 (verified) | Source | License |
|---|---|---|---|---|
| `proofread_connections_783.feather` | 852,022,274 | `f48f972d262323a102aed49af1396b8a` | Zenodo record 10676866, "FlyWire Whole-brain Connectome Connectivity Data", FlyWire Consortium (Princeton), v783.0, DOI 10.5281/zenodo.10676866 — https://zenodo.org/records/10676866 | CC-BY-4.0 |
| `proofread_root_ids_783.npy` | 1,114,168 | `e0e6c19732fd8c7a4e39a2d170105421` | same record | CC-BY-4.0 |
| `Supplemental_file1_neuron_annotations.tsv` | 31,718,505 | git blob SHA-1 `afea3e15a5671f5da0b9f7dd2e932d328c3b57a0` (verified) | flyconnectome/flywire_annotations, `supplemental_files/` @ commit of main branch (Schlegel et al., Nature 2024; content updated per Berg et al. 2025 changelog) — https://github.com/flyconnectome/flywire_annotations | CC-BY-4.0 (per repo) |
| `gt_data.csv` | 747,563 | git blob SHA-1 `a99c2e07f24d0ec06b703bdb38f4c37cc2bf29d4` (verified) | flyconnectome/drosophila_neurotransmitters (curated literature NT ground truth; Bates et al. curation) — https://github.com/flyconnectome/drosophila_neurotransmitters | CC-BY-4.0 |
| `cell_type_cross_matching.csv` | 1,139,176 | git blob SHA-1 `532419bc8f8ac898dda810199724dccfaa831add` (verified) | same repo, `inst/extdata/` | CC-BY-4.0 |

Notes on the Eckstein neurotransmitter predictions (search target of step 4):
the per-neuron `top_nt` / `top_nt_conf` columns in `Supplemental_file1_neuron_annotations.tsv`
ARE the Eckstein et al. 2024 (Cell) predictions averaged over each neuron's
presynaptic sites. Per-edge NT probabilities (`*_avg` columns) are also Eckstein
predictions shipped inside the Zenodo connectivity record itself. A separate
`flyconnectome/flywire_neurons` repo does not exist (searched; GitHub API 404) —
the drosophila_neurotransmitters repo (found via the same search) provides the
literature ground truth used to validate those predictions.

## 2. Processed outputs (`flylab/data/processed/`)

| File | Size (bytes) | SHA-256 | Content |
|---|---|---|---|
| `connections.parquet` | 145,634,760 | `d6064831135d9319776163f528330e9927638301354938f95d12ee121ba60f65` | 2,700,513 edges (neuron→neuron, synapse count ≥ 5, summed over neuropils): pre/post root ids, syn_count, n_neuropils, neuropil_main (max-syn neuropil), pre_nt_edge (argmax NT), per-NT avg probabilities (gaba/ach/glut/oct/ser/da) |
| `neuron_table.parquet` | 4,838,640 | `45412a76c0504367230950286204a445eef556c23521f73bf7c2c2949aa3004f` | 139,243 proofread neurons: root_id, soma coords, side, flow/super_class/cell_class/cell_sub_class/cell_type/hemibrain_type, hemilineages (ItoLee + Hartenstein), nucleus_id, top_nt + top_nt_conf (Eckstein), nt_sign (E/I per Shiu et al. 2024: GABA/Glut → −1, else +1) |
| `nt_ground_truth.parquet` | 62,131 | `a166728a16087d036fdaeab66da2571d729514a5bb0cf1354335469cef9b8f7f` | 6,107 literature-verified NT observations per cell type (Bates/CC-BY curation) |
| `nt_cross_matching.parquet` | 157,369 | `6c574b30deee64d8c1b9617372617c050e7efe173a867546557dfc94631a06c1` | 16,902 cross-connectome cell-type mappings |
| `stats.json` | 1,188 | `e7058908b221c8b489ca3e19a02d683da1eafdff8192a6e75e221222ec6812ac` | processing stats, thresholds, gaps (below) |

Pipeline: `flylab/data/process_connectome.py` (Python 3.12, pandas 2.2.3,
pyarrow 21.0.0; deterministic, no randomness, no imputation).

## 3. Key counts

- Raw (pair × neuropil) connection rows: 16,847,997
- Unique neuron-pair edges: 15,091,983
- Edges kept (syn_count ≥ 5): **2,700,513** carrying **34,153,566 synapses**
- Proofread root IDs: 139,255
- Neurons in table (proofread ∩ annotated): **139,243** (137,716 with named cell type)
- NT prediction coverage: 138,642 / 139,243 neurons (601 without prediction)
- Top NT distribution: acetylcholine 86,192; glutamate 24,873; gaba 19,171;
  dopamine 5,909; serotonin 2,281; octopamine 216; none 601
- Neurons whose cell type has ≥1 literature-verified NT observation: 81,972

## 4. Gaps & approximations (read before use)

1. **12,391,470 weak edges (syn_count < 5) dropped** per the ≥5-synapse
   threshold policy — 82% of unique pairs, but only ~11% of all synapses on
   proofread pairs. Sub-threshold edges remain available in the raw feather.
2. **601 neurons lack an Eckstein NT prediction** → `nt_sign` is null; the LIF
   model (Shiu et al.) requires a sign per presynaptic neuron, so edges from
   these neurons need a policy decision before simulation (drop / neutral).
3. **12 proofread root IDs have no Schlegel annotation row** (139,255 −
   139,243) — excluded from `neuron_table.parquet`.
4. Per-edge NT probabilities are **unweighted means across neuropil rows**, not
   synapse-weighted; `pre_nt_edge` is derived from those means. For
   simulation-grade NT the canonical source is the per-neuron `top_nt` in the
   neuron table (which IS presynapse-averaged, per Schlegel et al.).
5. `nt_sign` for glutamate is treated as inhibitory following Shiu et al. 2024
   conventions (`packages/sim-core/src/lif-params.ts`); glutamate can be
   excitatory depending on receptor — model-level caveat, not a data error.

## 5. Primary papers to cite in product/UI

- Dorkenwald, Schlegel, et al. "Neuronal wiring diagram of an adult brain."
  Nature 630, 818–829 (2024). (FlyWire connectome)
- Schlegel, Bates, et al. "Whole-brain annotation and multi-connectome
  cell typing of Drosophila." Nature 630, 818–829 (2024). (annotations)
- Eckstein, Bates, et al. "Neurotransmitter classification from electron
  microscopy images at synaptic sites." Cell 187(10), 2574–2594 (2024). (NT)
- Shiu, Sterne, et al. "A Drosophila computational brain model reveals
  sensorimotor processing." Nature 634, 210–219 (2024). (LIF model + E/I signs)
