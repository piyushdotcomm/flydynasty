# Seed Neuron Methodology — Shiu et al. 2024 Validation Experiments

**Output**: `E:\fruitfly\flylab\data\processed\seeds.json`
**Source table**: `E:\fruitfly\flylab\data\processed\neuron_table.parquet` (139,243 neurons; Schlegel et al. 2024 annotations + Eckstein et al. 2024 neurotransmitter predictions)
**Date**: 2026-09-15
**Confidence**: HIGH for 76 of 78 seed IDs (exact root-ID matches to the Shiu et al. supplementary data); MEDIUM for 2 elimination-inferred IDs (MN9_l, MN11-4th) and 2 unresolved superseded GRN IDs.

---

## 1. Goal

Pinpoint the exact FlyWire neurons needed to reproduce the validation experiments of
**Shiu et al. 2024, "A Drosophila computational brain model reveals sensorimotor processing", Nature 634:210–219** (open access):

1. Computational activation of labellar **sugar-sensing GRNs** → prediction of sugar-responsive / feeding-initiation neurons (their Fig 1, Supp Tables 1–2).
2. **MN9** (rostrum-lifting motor neuron) as the readout of the sensorimotor transformation (their Figs 1c–h, 2, 3).
3. Modality-interaction experiments: sugar+bitter, sugar+Ir94e, water+bitter, water+Ir94e co-activation (their Fig 3, Supp Table 4).

## 2. Primary ground truth used

**Shiu et al. 2024 Supplementary Table xlsx** (`41586_2024_7763_MOESM2_ESM.xlsx`, 28 sheets), downloaded from:
`https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41586-024-07763-9/MediaObjects/41586_2024_7763_MOESM2_ESM.xlsx`

Sheets parsed:

| Sheet | Content extracted |
|---|---|
| Supp Table 1A "Sugar Fir" | Flywire ID + Neuron Name (`sugar_l_0..20`, MN6/MN8/MN9/MN11) + firing rates at 10–200 Hz sugar activation |
| ST 1B / 1C | MN9 activation/silencing rows → **MN9_r = 720575940660219265**, MN9_l = 720575940645521262 |
| ST 4 "Interaction" | Full GRN ID lists: `sugar_l_*` (21), `water_l_*` (18), `bitter_l_*` (21), `Ir94e_l_*` (18), plus MN6/8/9/11 and Salivary MN13 |
| ST 6A / 6B | Water GRN firing rates + MN9 activation on water (confirms same MN9 IDs) |
| Supp Table 12 | Key resources (Gr64f-Gal4, IR94e-Gal4 stocks etc.) |

Every Shiu ID was cross-checked against the local neuron table (columns: side, cell_sub_class, cell_type, top_nt). Results: **76/78 IDs matched exactly**; 4 Shiu IDs are superseded root IDs absent from the current table (sugar_l_13, bitter_l_15, MN9_l, 4th MN11) — 2 of their roles were re-derived by elimination (below), 2 remain open.

## 3. GRN modality assignments

Corroborated from the full text of **Engert et al. 2022, eLife 11:e78110** (PMC9170244, fetched via Europe PMC REST fullTextXML), which performed morphology+connectivity clustering (NBLAST + Ward) of the labellar GRNs reconstructed in the FAFB/FlyWire volume and matched clusters to genetic markers:

- **Groups 1 & 2 → bitter** (Gr66a; medial ringed web)
- **Group 3 → low-salt/Ir94e** (dorsolateral branches)
- **Groups 4 & 5 → sugar** (Gr64f; G5 possibly high-salt/ppk23)
- **Group 6 → water** (ppk28)

The left-hemisphere GRNs Engert reconstructed are precisely the `sugar_l_*`, `water_l_*`, `bitter_l_*`, `Ir94e_l_*` neuron lists that Shiu et al. activated in silico. Mapping to Schlegel cell types in our table:

| Shiu group | n | Schlegel cell_sub_class | Schlegel cell_type |
|---|---|---|---|
| sugar_l_* | 21 (20 in table) | sugar/water | LB3 (all) |
| water_l_* | 18 (18) | sugar/water | LB3 ×17, **LB2d ×1** (water_l_15) |
| bitter_l_* | 21 (20) | bitter | LB1a/LB1d, LB1b, LB1c |
| Ir94e_l_* | 18 (18) | **bitter** ×11 + **low-salt** ×7 | LB1e ×11; LB2a-b ×4, LB2c ×3 |

Key reconciliation findings:

- Schlegel's `sugar/water` subclass conflates sugar and water GRNs (mostly LB3): the Shiu supplementary IDs are the only way to split them, and this split is now captured in seeds.json.
- Schlegel's `low-salt` subclass ≠ Shiu's Ir94e group: all 11 **LB1e** cells sit in Schlegel's `bitter` subclass but are Engert/Shiu **Ir94e** neurons; conversely 2 left-hemisphere **LB4a** cells (720575940632293346, 720575940620856046) carry Schlegel `low-salt` but are NOT in the Shiu Ir94e set. seeds.json uses the exact Shiu 18-cell Ir94e list.
- `claw_tpGRN` (60) and `dorsal_tpGRN` (11) cell types are taste-peg GRNs, not labellar bristle GRNs — **not part of the Shiu validation; excluded**.
- Eckstein NT predictions: most GRNs acetylcholine, but several bitter_l_* predicted serotonergic and 2 Ir94e cells glutamatergic. Shiu et al. used these predictions as-is in their model, so the table's `top_nt` should be kept for faithful replication (noted in needs_verification).

## 4. MN9 and the proboscis motor neurons

**McKellar et al. 2020, eLife 9:e54978** (PMC7316511, fetched via Europe PMC): the proboscis has 16 muscles/motor neurons, named mn1…mn13 (with mn2D/2V, mn3L/3M, mn11D/11V, mn12D/12V divisions). **mn9** innervates **muscle 9 (lateral pharyngeal muscle, "protractor of fulcrum/rostrum")**; activation protracts/lifts the rostrum; silencing blocks rostrum (+haustellum) extension in feeding. This is the rostrum-lifting MN9 of Shiu et al. Split-GAL4s: VT061715 / VT005008. mn11 has dorsal/ventral divisions (mn11D, mn11V) — consistent with Shiu listing 4 MN11 neurons (2 bilateral pairs: CB0700 + CB0915).

**Exact ID mapping (Shiu supp tables ↔ our neuron table):**

| Shiu name | Shiu FlyWire ID | Our table cell_type (sub_class) | Status |
|---|---|---|---|
| MN9_r | **720575940660219265** | **CB0701 (ingestion_motor_neuron), right** | EXACT |
| MN9_l | 720575940645521262 | CB0701 left = **720575940618238523** | superseded → putative update |
| MN6_l/r | 720575940627410451 / 720575940628826128 | CB0858 (proboscis_motor_neuron) | EXACT ×2 |
| MN8_l/r | 720575940623352063 / 720575940612888178 | CB0911 (proboscis_motor_neuron) | EXACT ×2 |
| MN11 | 720575940618165019 / 720575940630868793 | CB0700 (ingestion_motor_neuron) l/r | EXACT ×2 |
| MN11 | 720575940630233404 | CB0915 (ingestion_motor_neuron) right | EXACT |
| MN11 (4th) | 720575940619048827 | CB0915 left = **720575940618539810** | superseded → candidate |

**MN9 verdict: PINNED.** MN9_r = 720575940660219265 is an exact root-ID match (present in Shiu ST1B/1C/6B and in our table as right CB0701), and it is the MN9 that fires on contralateral (left) sugar-GRN activation — the core validation experiment. The left counterpart is, with high confidence, 720575940618238523 (the only other CB0701 in the connectome; soma x mirrors MN9_r about the midline; right member of the pair matches exactly). FlyWire ID-resolution API was unreachable from this environment (see §6), so the MN9_l update carries a needs_verification flag.

Other ingestion-motor types in the table (CB0703, CB0708, CB0715, CB0728, CB0769, CB0904, CB0914, MN10, MNx01, MNx03) are pharyngeal/pumping/other proboscis MNs not among the sugar-responsive MN6/8/9/11 of Shiu Fig 1, and are excluded from the seed group.

## 5. Superseded-ID resolution attempts

Four Shiu IDs (sugar_l_13 720575940620900446, bitter_l_15 720575940618600651, MN9_l 720575940645521262, MN11 720575940619048827) are absent from the current table — FlyWire root IDs get superseded whenProofread merges occur. Attempts:

1. FlyWire chunkedgraph REST `/_segmentation/api/v1/latest/root/<id>` on `flywire-drosophila-v1-manc.temporary.aon.flywire.ai` and `prod.flywire.ai` — **failed** (SSL UNEXPECTED_EOF from this environment, both via Python urllib and webfetch).
2. `caveclient` installed, but requires an auth token not available here.
3. **Elimination analysis** (successful for MNs): within each Schlegel cell type the bilateral pair structure is exhaustive (CB0701 = exactly 2 neurons; its right member exactly matches MN9_r), so the left member is the only possible current MN9_l. Same logic for CB0915 left (4th MN11).
4. GRN elimination: 27 unclaimed left LB3 cells (all NaN soma coords) — cannot single out sugar_l_13; 1 unclaimed left LB1c (720575940619072513) — best bitter_l_15 candidate.

**Action for the lab**: resolve the 4 IDs in the FlyWire UI (flywire.ai, paste old root ID — it redirects to the current one) or via caveclient with credentials, then update seeds.json. The Shiu analyses are robust to single-GRN dropout (their Fig 1f/g: silencing any one neuron rarely abolishes MN9 firing at ≥50 Hz), so the 20/21 sugar GRNs suffice for initial replication.

## 6. Sources

1. Shiu PK, Sterne GR, Spiller N, … Scott K. **A Drosophila computational brain model reveals sensorimotor processing.** *Nature* 634:210–219 (2024). doi:10.1038/s41586-024-07763-9. Article HTML fetched (nature.com). Supplementary xlsx `41586_2024_7763_MOESM2_ESM.xlsx` downloaded and parsed (primary ID source).
2. Engert S, Sterne GR, Bock DD, Scott K. **Drosophila gustatory projections are segregated by taste modality and connectivity.** *eLife* 11:e78110 (2022). PMC9170244, fetched via Europe PMC REST fullTextXML (eLife site returned 406).
3. McKellar CE, Siwanowicz I, Dickson BJ, Simpson JH. **Controlling motor neurons of every muscle for fly proboscis reaching.** *eLife* 9:e54978 (2020). PMC7316511, fetched via Europe PMC REST fullTextXML.
4. Schlegel P, et al. **Whole-brain annotation and multi-connectome cell typing of Drosophila.** *Nature* (2024) — as embodied in the neuron table's annotation columns.
5. Eckstein N, et al. **Neurotransmitter classification from electron microscopy images at synaptic sites.** *Cell* 187:2574–2594 (2024) — as embodied in `top_nt`, `top_nt_conf`, `nt_sign`.
6. Supporting context (via Shiu text): Shiu et al. 2022 eLife 11:e79887 (feeding circuit ground truth), Gordon & Scott 2009 Neuron 61:373–384 (MN9/MN11 sugar responses), Jaeger et al. 2018 eLife 7:e37167 (Ir94e low-salt responses), Manzo et al. 2012 PNAS (fluid-ingestion MNs), Sterne et al. 2021 eLife 10:e71679 (SEZ split-GAL4 library).
