# 03 — BIOLOGY → GAME SYSTEMS (verified facts + mappings)

All "real fly" facts below verified from entomology sources (Sept 2026). The
"Sim" column is the binding game-design decision. Where reality is impractical,
the deviation is marked and justified.

## 1. Lifecycle

| Real fruit fly (Drosophila melanogaster) | Sim |
|---|---|
| Egg laid in ripening/fermenting fruit | Eggs laid ON food items only (mechanic: drives food competition) |
| Egg hatches in 2–4 days | 20 s |
| Larva eats from nesting site ~4 days | 40 s; larva visibly grows (scale 1.0→1.8) |
| Pupal stage ~4 days (dark case, stationary) | 30 s; pupae sit where larva finished (on fruit/surface) |
| Egg-to-adult ~1 week ideal conditions | ~90 s |
| Adult lifespan 2–6 weeks (lab), ~2 wk wild | ~10 sim-min ± 2 (gaussian), old-age reflex slowdown |
| Female can lay up to ~500 eggs lifetime (rare) | 4–8 eggs/clutch, max ~6 clutches (pop control) |
| Clutch 1–20 eggs | 4–8, energy-gated |

Egg-laying rules: female must be ON food item, energy > clutch cost, global
population < soft cap. Larvae consume the food item they hatch in (shrinks it) —
links reproduction to food economy.

## 2. Sex & courtship (the real ritual — it's a fixed sequence, use as-is!)

Verified real male courtship sequence:
1. **Orientation** — male spots female, approaches
2. **Tapping** — foreleg tap on female (taste/pheromone check)
3. **Circling** — male circles/semicircles around her
4. **Wing vibration (song)** — extends ONE wing, vibrates → species-specific
   courtship song (pulse + sine components)
5. **Licking** — if she stays
6. **Mounting + copulation** (~15–20 min real)

Sim mapping:
- Stages 1–4 modeled (8–15 s total). Wing vibration = wing-buzz animation +
  faint audio pulse (WebAudio, no files needed)
- Female acceptance = her brain's `acceptThreshold` output vs male's
  `courtDrive` + song quality (rhythm variance — brains CAN evolve better songs!)
- Rejected male: cooldown 10 s, loses energy (courtship is costly — real)
- After success: gestation 30 s, then female seeks food to lay clutch
- Males don't court larvae/pupae/other males: recognition input (target is
  adult female) is given by sim, not evolved (avoids pathological loops)

## 3. Senses (input design grounded in real fly senses)

| Real fly sense | Sim input |
|---|---|
| Smell (antennae): excellent, long-range food/pheromone tracking | foodSmell + foodDir (gradient field) |
| Vision (~300°, motion-sensitive, red-blind but attracted to UV/blue) | hazardDir/prox, zapperGlow (visual attraction trap), courtship target detection |
| Taste (feet + proboscis) | eating requires landing on food; tapping "tastes" female |
| Mechanosensation (air currents, vibrations — swatter!) | swatter telegraph = hazardProx spike + hardwired reflex arc |
| Temperature preference ~25°C warm | ambient warmth near window sun patches (rest spots) — flavor |

## 4. Food system

Real attractants: overripe banana, vinegar/ferments, sugar, tomato products,
juice. Real lifecycle requires fermenting substrate.

Food item model:
```
FoodItem {
  kind: banana | strawberry | orange | apple_core | juice_puddle
  size: units of larval food
  ripeness: 0..1 → grows to 1 (peak attractant) then rots (attractant decays,
           hazard: mold chance — larvae on moldy food die more)
  energyPerBite, bitesLeft
}
```
- Spawn schedule: 1 banana slice/10 sim-min base + "delivery" events (narrator:
  "Someone has left strawberries on the counter.") + user drops (rate-limited)
- Rotting shrinks + darkens (visual) — flies near rot get mold-death risk (selection
  for timely eating, not loafing)
- Carrying capacity: total food energy in kitchen ≈ needed to sustain ~100–150
  flies; tuned so famine is periodic and survivable (drives narrator drama, not
  doom loops)

## 5. Hazards

| Hazard | Real-world basis | Sim behavior |
|---|---|---|
| Swatter | — | Telegraphed sweeps (2 s shadow grows → strike). Auto mode + user strikes (aim click, 30 s cooldown). Splash radius hits clusters |
| Bug zapper | flies drawn to UV light | Glow input tempts brains; night-only kill radius. Selection pressure against light-attraction |
| Spider web | window corner predator | Sticky zone: fly caught if enters; escape chance per tick (energy cost), fly brain can evolve web-avoidance via hazardDir |
| Open window | real flies escape | Boundary exit = "escaped, never seen again" (counts as death for GA; narrator treats as leaving-home story) |
| Mold | overripe food | Rotting food: eating risk. Culls loiterers |
| Old age | — | Gaussian lifespan; reflex arc slows (swatter gets deadlier for elders) |

## 6. Population & epoch math (target operating envelope)

- Target population band: 40–120 flies (below 30 = near-extinction event;
  above 150 = egg-laying pause)
- Extinction safety nets (D12):
  1. Pop < 5 → "hidden compost bin eggs hatch": spawn 6 larvae from frozen
     "compost genome" (best-of-generation archive). Narrator: "The compost remembers."
  2. True extinction (pop = 0) → Epoch ceremony: 30 s recap of the epoch's best
     moments + tombstone → Epoch N+1 starts with fresh random genomes +
     narrator: "Everything ends. Begin again."
- Epoch = a save-file that never gets deleted; epoch history pages are permanent
  content (lineages persist in DB for nostalgia)

## 7. Genetics constants (initial values — TUNE IN PHASE 0, these are starting points)

```
ADULT_LIFESPAN_MEAN:    600 sim-s (10 min)
ADULT_LIFESPAN_STD:     120
EGG_HATCH:              20 s
LARVA_STAGE:            40 s
PUPA_STAGE:             30 s
CLUTCH_SIZE:            4–8 (energy-gated)
GESTATION:              30 s
CLUTCH_ENERGY_COST:     35% of female energy
FOOD_ENERGY_PER_BITE:   ~12% fly energy
MUTATION_RATE:          8% per gene, ±4–12/127
BIG_JUMP_RATE:          0.5% per genome, ±40/127
SWATTER_PERIOD:         10 s auto-sweep (Phase 0 tuning knob)
ZAPPER_ACTIVE:          night 60% of nights (escalates +10% per 10 gens)
```

## 8. Deviations from reality (log all honesty edits here)

| Deviation | Why |
|---|---|
| Time compressed ~3600x | Real fly life = 10 days; game needs minutes |
| Clutch capped 4–8, 6 max | Pop control; real can hit 20/clutch, 500 lifetime |
| Recognition of mates given free | Avoid evolving basic object recognition (expensive GA progress, boring to watch) |
| Energy from food directly, no water | Real flies need moisture; dropped for simplicity |
| Brains = 24-param RNN | Real = 100K neurons. Honest framing rule D4 governs all copy |
