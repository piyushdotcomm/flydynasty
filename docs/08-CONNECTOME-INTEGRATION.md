# 08 — CONNECTOME INTEGRATION (real anatomy + evolved minds)

> Added after user pushback (correct): the 2026 fly connectome discovery is the
> hype hook of the moment and the project SHOULD use it. Council rule was never
> "avoid the connectome" — it was "never FAKE connectome simulation" (Eon dunk
> cycle). This file defines the honest integration: **real anatomy + real region
> functions + real circuit names, evolved artificial dynamics, clearly labeled.**

## 1. The framing (binding, use in ALL marketing)

> **"Real fly brain anatomy. Evolved minds."**

- REAL: brain-region meshes, region names, known functions, courtship circuit
  names (P1 neurons), escape reflex pathway (giant fiber)
- EVOLVED/ARTIFICIAL: every behavior decision (the 24-param RNN, `02b-SIM-CORE.md`)
- NEVER claim: that activity patterns match real fly dynamics, that we simulate
  neurons, that the connectome drives behavior
- Honesty label on the brain panel (exact copy): *"Real anatomy from the 2026
  fruit fly connectome. Activity is stylized — each fly's behavior comes from an
  evolved artificial mind."*

## 2. What we download (small, free, verified sources)

| Asset | Source | Size (est.) | License |
|---|---|---|---|
| Neuropil region meshes (AL, MB, LH, CX, optic lobes, VNC, ~40 regions) | Virtual Fly Brain (virtualflybrain.org) downloads / Janelia FlyEM maleCNS resources | ~2–10 MB total | check per-file (VFB is open) |
| Region names + function descriptions | Virtual Fly Brain ontology, FlyWire/maleCNS cell-type tables | tiny | open data |
| Courtship circuit (P1) reference | maleCNS paper (Cell, Sept 2026) + male-cns.janelia.org | info only | cite paper |
| Giant fiber pathway reference | published Drosophila literature (classic) | info only | cite |

NOT downloaded: full 125M-synapse connectome, per-neuron meshes (100GB+), neuprint
database. We never need them. This is anatomy-level, not synapse-level.

If region meshes prove annoying to export from VFB: fallback = hand-model ~12
major neuropils in Blender from reference images (1 day, stylized-real). Log
choice in §5.

## 3. Brain panel feature (product spec addition to 01-PRODUCT.md §2.7)

- Click a fly → "BRAIN VIEW" card: 3D real fly brain (region meshes), slowly
  rotating, region glow mapped to that fly's live inputs/outputs
- Mapping table (sim input/output → real region):

| Sim signal (02b brain I/O) | Real region displayed | Glow color |
|---|---|---|
| foodSmell / foodDir | Antennal lobe (+ antennal nerve) | amber |
| hazardProx / hazardDir (visual) | Optic lobe (medulla/lobula) | white flash |
| zapperGlow | Optic lobe (UV attraction is real!) | blue |
| crowdLevel | still decide (candidate: antennal lobe, pheromone channel) | lavender |
| energyLevel | fat body analog → display as abdominal/body glow (body state, not brain) | green |
| **FLEE reflex fires** | **Giant fiber → TTM/DLM pathway** (the real escape circuit — hardwired, matches our design honestly) | red streak |
| courtDrive (male) | P1 courtship neurons (real, from maleCNS paper) | magenta |
| acceptThreshold (female) | Sex-peptide/virgin-mating circuitry areas (cite literature; keep label generic: "mating-decision circuits") | magenta |
| turn/thrust outputs | Ventral nerve cord (motor) + descending neuron tracts | cyan pulse |

- Glow intensity = signal magnitude; pulses at decision moments; giant-fiber
  streak animates along the path on near-death escapes (money shot for clips!)
- Narrator references real names occasionally: "Gerald's mushroom bodies have
  been quiet all day." (MB = learning; only if we later add simple memory input)
- Educational tooltip per region: name + one-line real function + citation
  (VFB/paper). This is the "normal people learn real neuroscience" layer.

## 4. Marketing/SEO integration

- Landing subhead uses the connectome: "Real anatomy from the 2026 fruit fly
  connectome — the biggest brain mapping milestone — with minds that evolve
  before your eyes."
- Blog/post angle: "Everyone's making the fly brain play Doom. We gave it a life."
- NEVER: "simulated connectome", "fly brain emulation", "digital twin of a fly
  brain", "uploaded". These trigger the dunk cycle.
- Cite: Google Research + Janelia maleCNS release (Cell 2026) in About page.

## 5. Implementation notes (for the agent that builds it)

- Package: `packages/sim-3d/src/brainview.ts` + `assets/brain/*.glb`
- Region meshes: convert to GLB, shared material with per-region emissive
  uniforms; glow via emissiveIntensity tween per frame from sim snapshot
- Sim side: `brain.ts` already exposes per-tick inputs/outputs — brain view
  reads the same snapshot as the debug inspector (no sim changes needed!)
- Giant fiber streak: a small pre-baked curve mesh along the real pathway;
  opacity keyed to reflex activation
- Phase: build in Phase 3 (with narrator) — after evolution gate + diorama.
  Track asset additions in `06-ASSETS.md` §3.

## 6. Decision log addition (also mirrored in README §4)

| # | Decision | Rationale |
|---|---|---|
| D14 | Connectome used as REAL ANATOMY layer (brain view panel, region names, courtship/escape circuit labels), not as behavior engine | User mandate to use the discovery; honest per council; costs ~MBs not GBs; huge marketing hook with zero debunk risk |
