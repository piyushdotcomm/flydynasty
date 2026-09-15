# 02b — SIM CORE: Brains, Genetics, Behavior (the invisible 80%)

> Council warning: "You're budgeting the visible 20%; the project dies or lives in
> the invisible 80% — GA tuning." This file is that 80%. Read fully before touching
> `sim-core`.

## 1. Brain

```ts
// A fly brain: recurrent tiny net. ~24 params. Runs per-tick per-fly.
// Inputs (8):
//   0. foodSmell       — normalized [0,1] gradient magnitude (smell intensity)
//   1. foodDir        — signed angle to strongest food smell (-1..1)
//   2. hazardProx     — nearest hazard proximity (0..1, 1=deadly now)
//   3. hazardDir      — signed angle to hazard (-1..1)
//   4. zapperGlow     — zapper visibility/attraction (0..1) [flies are drawn to light!]
//   5. crowdLevel     — local fly density (0..1)
//   6. energyLevel    — own energy reserve (0..1)
//   7. bias/constant  — 1.0
// Hidden: 4 recurrent neurons (state carried between ticks)
// Outputs (3):
//   0. turn           — steering (-1..1)
//   1. thrust         — forward acceleration (0..1)
//   2. courtDrive     — courtship action intensity for males (0..1); females: acceptThreshold
```

- Architecture: `8 → 4 (recurrent) → 3`, tanh activations. Weights in [-1,1] quantized
  to int8 in genome (compact + mutation-friendly).
- Zapper attraction is DELIBERATE (real flies drawn to light) — evolved brains must
  LEARN to suppress attraction. This asymmetry (food smell good, zapper glow also
  tempting) creates the tragedy that makes evolution legible.
- Why RNN not MLP: flies need short-term memory (e.g., "swatter was here 2 ticks
  ago, dodge then return"). Recurrence gives it cheaply.

## 2. Genome

```ts
interface Genome {
  brain: Int8Array;        // 24×2 quantized weights (input→hidden, hidden→out, hidden recurrent)
  metabolism: int8;       // speed/energy-efficiency tradeoff knob
  boldness: int8;         // noise scale in behavior (mutation exploration trait)
}
```
- Mutation: each gene 8% chance ±(4..12)/127 gaussian; 0.5% chance structural
  "big jump" (±40). Crossover: single-point per weight array (males contribute
  brain mostly; females contribute metabolism/boldness — cosmetic, keeps sexes distinct).
- No speciation in v1. Sex gene is environmental (random 50/50 at egg), not genetic
  (avoids sex-ratio evolutionary collapse — real flies do this too via meiotic drive checks).

## 3. Fly behavior state machine

States: `EGG → LARVA → PUPA → ADULT(IDLE|EXPLORE|SEEK_FOOD|EAT|COURT|FLEE|REST) → DEAD`

- Brain controls movement EVERY tick in all adult states (it IS the behavior);
  states are for needs/animation/narrator, not hardcoded movement scripts:
  - FLEE only when hazardProx > threshold (reflex arc: overrides brain output with
    hardwired escape vector — real fly escape reflexes ARE hardwired, giant-fiber
    pathway; this is biologically honest AND makes dodging always visible when brain fails)
  - COURT: male within radius of female → brain's courtDrive output drives song;
    female's acceptThreshold output decides acceptance (her brain evolves choice!)
- Energy: consumed by thrust (∝ thrust² × metabolism), courtship, aging. Eating
  restores. Starvation at 0.
- Lifespan: gaussian ~10 sim-min ± 2 (adult); age slows reflex arc slightly.

## 4. World systems

- **Food:** items have size + ripeness. Ripeness grows (attractiveness peaks) then
  rots (attractiveness decays). Spawn: base banana + scheduled deliveries + user
  drops. Smell field: radial gradient per item, summed; cached spatial grid.
- **Hazards:** swatter (scripted sweeps; user strikes), zapper (glow + kill radius
  at night), spider web (sticky zone, chance to escape scales down over time),
  open window (fly exiting bounds = death/escape event)
- **Population control:** egg-laying limited by female energy (a clutch costs real
  energy — prevents runaway); global soft cap 150 flies (egg-laying pauses above cap,
  narrator: "The kitchen approaches carrying capacity.")

## 5. Time compression (D8)

| Real fly | Sim (1x) |
|---|---|
| Egg 2–4 days | 20 s |
| Larva 4 days | 40 s (eats fruit it's in; visibly fattens) |
| Pupa 4 days | 30 s (dark pupa casing on surfaces) |
| Adult 2–6 wk | ~10 min |
| Courtship ~1 min | 8–15 s |

1 real second = 1 sim second at 1x. Sim-day = 24 min. Generations overlap in
real time (like real fly populations — not turn-based).

## 6. GA fitness (implicit — no explicit fitness function!)

Survival + reproduction IS the fitness. To avoid degenerate strategies (council's
#1 warning), use **environmental shaping** (all indirect, nothing visible):

| Degenerate strategy risk | Environmental counter |
|---|---|
| Corner-camping (never move) | Food rots; hunger forces movement; food spawns biased away from corners; swatter periodically targets popular loiter spots |
| Zapper-attraction never evolves away | Zapper glow is tempting input; kill radius large at night — attraction is fatal often enough to select against |
| Swarm-following (crowd = safety) | Swatter hits clusters (splash radius); crowdLevel input lets brains discover solo play; spider web catches follow-the-leader lines |
| Over-fast metabolism kings | Energy drains ∝ thrust²; famine events cull speed-demons |
| Courting never (waste energy on nothing) | No offspring = lineage ends; courtship success is the ONLY reproduction path |

**Anti-sandbagging:** the world escalates. Every N generations, hazard intensity
+10% (swatter frequency, zapper on more often). Prevents "good enough" plateaus,
creates an arms race the narrator can report on ("The kitchen grows crueler.").

## 7. Phase 0 gate (build this FIRST, before any art)

Bare sim, debug rendering (canvas 2D or three.js boxes — doesn't matter):
1. 60 flies, 3 food items, 1 swatter sweeping every 10 s with 2 s telegraph
2. Run 50 generations
3. **PASS if:** median survival time ≥ 2× Gen-1 baseline AND ≥ 20% of flies
   visibly turn away from swatter telegraph (measured: heading change > 60°
   within 1 s of telegraph, toward outside kill arc)
4. **FAIL if:** flies extinct (tune food/pop) OR no improvement after 50 gens
   (tune: reduce brain noise, increase selection pressure via more food, check
   mutation isn't swamping signal)
5. Iterate tuning params: mutation rates, swarm size, food rates. TIMEBOX: 2
   weekends. If still no legible improvement, escalate: add curriculum (start
   with gentle swatter, ramp up) before abandoning anything.
6. Keep the gate as automated regression test forever (`tests/gate.test.ts`)

## 8. Debug tooling (build alongside Phase 0 — non-negotiable)

- Overlay: per-fly brain viz (input bars, hidden state, outputs) for clicked fly
- Time controls: pause, 1x/2x/8x, fast-forward headless, save/load checkpoint
- Population graph: fly count, median age, gen number, survival-time trend
- God tools: spawn food, spawn swatter storm, kill fly, clone fly, freeze fly
- "Fly inspector": genome dump, lineage, brain activations, energy bars
- Without these, GA tuning is blind. Budget a full weekend for tooling.

## 9. Known GA pitfalls cheatsheet (from council + literature)
- Premature convergence → raise mutation, lower selection harshness early
- Cycling/flickering strategies → recurrent state + momentum in world (rotting food)
- Luck-dominated selection (survivor just got lucky) → overlapping generations,
  multiple swatter cycles per gen, larger populations
- "Clever" physics exploits (e.g., sitting inside swatter's blind spot) →
  randomize hazard positions; embrace as narrator content ("The flies have found
  God's blind spot. We've moved it.")
