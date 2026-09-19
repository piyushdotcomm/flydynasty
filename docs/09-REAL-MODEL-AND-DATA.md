# 09 — THE REAL MODEL & REAL DATA (PIVOT: "everything real")

> **USER MANDATE (binding, supersedes prior design):** "Use the actual data, nothing
> of your own. Do not assume anything. Everything real."
>
> This file is now the CORE of the project. The old evolved-artificial-brains
> design (02b) is DEAD (kept only as history). We run the **published,
> experimentally validated computational model** on the **real connectome data**,
> with every parameter sourced from literature. Zero invented numbers.

## 1. The real model we implement (do NOT invent your own)

**Shiu, Sterne, Spiller, … Bates, Jefferis, Murthy, Bidaye, Hampel, Seeds, Scott.
"A Drosophila computational brain model reveals sensorimotor processing."
Nature 634, 210–219 (Oct 2024). Open access.**
- Leaky integrate-and-fire (LIF) model of the ENTIRE adult fly central brain
  (all 127,400 FlyWire neurons), built ONLY from:
  1. Synaptic connectivity (weights = synapse counts from FlyWire)
  2. Predicted neurotransmitter identity per neuron (excitatory/inhibitory signs)
- Implemented in Brian2. Baseline firing 0 Hz. When a neuron spikes, downstream
  membrane potentials change proportional to connectivity; threshold → spike.
- **Single free parameter: W_syn** (one synapse's effect on downstream membrane
  potential) — all other biophysical parameters taken from prior Drosophila
  modelling/electrophysiology (Kakaria & de Bivort 2017; Churgin et al. 2021).
- **Validated against real experiments:** activating sugar-sensing GRNs predicts
  the real feeding motor neurons (MN6/8/9/11) — model predictions matched
  optogenetic activation phenotypes at **>90% accuracy** across 106 cell types.
  Also validated on the antennal grooming circuit (mechanosensory → grooming).
  Shuffled-connectivity controls abolish the predictions (proof it's the real
  wiring doing the work).

**AGENT INSTRUCTION:** Extract exact LIF parameters (τ_membrane, V_threshold,
V_reset, refractory, W_syn value(s), timestep) from the paper's Methods section
and its cited references (Kakaria & de Bivort 2017; Churgin et al. 2021). Cite
every number in code comments. If a value is ambiguous, fetch the paper — never
guess. PDF: nature.com/articles/s41586-024-07763-9 (open access).

## 2. The real data (all open, all downloadable — verify licenses at download)

| Data | What | Source (verified Sept 2026) |
|---|---|---|
| **FlyWire connectome (female brain)** | 139,255 neurons, ~50M synapses, proofread | Dorkenwald et al., Nature 2024 "Neuronal wiring diagram of an adult brain" — open access |
| **Connectivity tables (bulk)** | Synapse point list + edge list | Zenodo: zenodo.org/records/10676866 ("FlyWire Whole-brain Connectome Connectivity Data") |
| **Cell-type annotations** | 870K+ hierarchical annotations (names, types, sides) | Schlegel et al., Nature 2024; github.com/flyconnectome/flywire_annotations |
| **Neurotransmitter predictions** | NT identity (ACh/GABA/glu/…) per neuron → E/I signs | Eckstein et al., Cell 2024 (open; linked from FlyWire/Zenodo) |
| **Male CNS connectome (2026, incl. VNC + courtship P1 circuits)** | full male CNS; blog cites >166K neurons / 125M synapses (VERIFY exact counts at source) | male-cns.janelia.org / FlyEM releases; companion Cell 2026 papers |
| **Gustatory sensory neurons in EM volume** | sugar/water/bitter/Ir94e GRN identities | Engert et al., eLife 2022; used by Shiu et al. |
| **Olfactory receptor → glomerulus map** (for odor stimuli later) | ORN identities | Couto et al. 2005; Fishilevich & Vosshall 2005; DoOR database |
| **Brain region meshes (visual)** | real neuropil 3D anatomy | Virtual Fly Brain (virtualflybrain.org); Janelia FlyEM |
| **Explore interactively** | neuprint-like query | codex.flywire.ai (FlyWire's analysis platform) |

ETL priority for v1: **FlyWire brain** (female) because the validated model +
annotations are richest; add male CNS (courtship circuits) as chapter 2.

## 3. What is REAL and validated (allowed behavior claims)

| Behavior | Status | Source |
|---|---|---|
| Sugar taste → proboscis extension (feeding) | VALIDATED in silico + in vivo | Shiu et al. 2024 (>90% optogenetic match) |
| Water / bitter / Ir94e (salt) taste interactions with sugar | VALIDATED | Shiu et al. 2024 |
| Mechanosensory (antenna touch) → antennal grooming circuit | VALIDATED | Shiu et al. 2024 |
| Activate/silence ANY neuron → predicted downstream effects | Model capability (in-silico experiment, deterministic) | Shiu et al. 2024 methods |
| Courtship P1 circuits (male CNS) | Structure annotated; dynamics NOT yet validated by a published model → show STRUCTURE + connectome-true wiring, never claim predicted behavior | maleCNS Cell 2026 |
| Open-ended free-roaming fly life sim | NOT validated by any model — **FORBIDDEN as a "real" claim**; the fly body animation is a visualization of validated circuit outputs only | — |

**The honesty contract:** every animation shown must be driven either by (a) a
model-computed activity trace from a real stimulus, or (b) clearly-labeled
anatomical structure (no dynamics claim). Nothing in between.

## 4. Product shape after the pivot ("Real Fly Lab" energy, still fun)

**A living exhibit of the real fly brain.** Photoreal 3D kitchen stage. A day
cycle of natural events — sugar lands on the lab bench, dust settles on
antennae — each event triggers the REAL model, and visitors watch the real
cascade sweep through the real brain (region-glow view) and the real predicted
behavior play out on the fly (proboscis extends; grooming sequence runs).
- **Hero interaction:** click any neuron/region → activate or silence it →
  watch the model's downstream prediction, exactly like the paper's experiments
  ("I silenced the sugar pathway and the fly stopped feeding — and here's the
  real paper result matching").
- **Narrator** survives (D11): explains what real thing just happened, cites papers.
- **Fun comes from REALITY:** "I turned off one neuron and the fly forgot how to
  eat" is genuinely fascinating — no fiction needed.

## 5. How the real model runs in a browser (feasibility, no fakery)

Full 127K-neuron LIF at 60fps client-side is too heavy naively (50M edges ×
timesteps). Honest strategies — use BOTH, always labeled:
1. **Precomputed canonical runs (100% faithful):** responses to our curated
   stimulus set are deterministic → run the full model offline (Node + Brian2-
   equivalent in TypeScript/WASM, or Python in GitHub Actions), store sparse
   activity traces (responding neurons are sparse: 45–455 neurons for sugar —
   tiny JSON), replay + interpolate in browser. This is the "watch it think" mode.
2. **Interactive what-if (approximation, labeled):** user activates/silences
   arbitrary neurons → simulate ONLY the recruited subgraph live (k-hop
   neighborhood through strong edges) in a WASM Web Worker. Sparse responses
   make this tractable. UI badge: "live approximation on recruited subgraph;
   full-model precomputed runs available." Validate approximation quality
   against precomputed runs for a test battery; display mismatch if any.
3. Never fake: if compute fails, show "computing…" not a canned animation.

## 6. New Phase 0 (replaces old GA gate) — ✅ PASSED 2026-09-15

**Gate: reproduce a published result.**
1. Download FlyWire connectivity + NT predictions (Zenodo + Eckstein)
2. Implement the Shiu LIF model faithfully (parameters from paper Methods)
3. Test: activate sugar GRNs at 100 Hz → **MN9 must fire** (paper: robust in
   100% of simulations). Shuffled-weight control must FAIL (paper: 1/100).
4. PASS = our implementation matches the paper's Table/figures for sugar,
   bitter-suppression, and grooming cases.
5. Then, and only then, build the 3D stage around it.

**STATUS: PASSED.** Implementation: `flylab/packages/sim-core/src/lif.ts`
(every constant cited in `lif-params.ts`), graph = full paper-faithful
FlyWire release 783 bundle (15,090,883 edges / 54,490,417 synapses, E/I from
Eckstein top_nt, exact string root IDs — see `data/rebuild_graph.py` for why
string IDs are mandatory). Results:
- sugar GRNs @ 100 Hz → MN9_r fires 30/30 trials (86.4 Hz mean), MN9_l 81.5 Hz
- bitter co-activation suppresses MN9_r: 86.4 → 15.8 Hz (paper Fig 3)
- shuffled-connectivity control: MN9_r 0 Hz in 5/5 shuffles (paper: 99/100 fail)
- baseline: 0 spikes across 5 trials (model's own claim, verified)
- rate sweep: 10 Hz → MN9 silent; 30 Hz → weak; 50–200 Hz → robust (Supp T1A)
Gate tests: `flylab/packages/sim-core/tests/reproduction.test.ts` (3/3 pass,
~80 min wall time). Exported checks: `packages/app/public/data/gate.json`
(5/5 pass). Known open items: 2 superseded Shiu GRN IDs unresolved
(`data/processed/seed-methodology.md` §5) — single-cell dropout, paper says
results robust to it.

## 7. What this pivot kills (do not build)

- ❌ Genetic algorithm / evolution / breeding mutations (assumed fitness = not real)
- ❌ Invented tiny-neural-net brains (02b design — historical only)
- ❌ Fly "life sim" autonomous behavior claims (unvalidated)
- ❌ Invented hazard systems as behavior drivers (a swatter response would require
  a validated escape circuit run — could later use real giant-fiber pathway
  structure, but no dynamics claims until a published model covers it)
- ✅ Kitchen/narrator/clips/named-neurons survive as PRESENTATION of real runs
