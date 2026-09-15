# 01 — PRODUCT SPEC

## 1. The Experience (user's-eye view)

A visitor lands on the site. A warm, photorealistic kitchen fills the screen —
sunlight through a window, overripe bananas on the counter, a faint hum. Dozens of
flies with red eyes buzz through shafts of light. A caption fades in:

> *"The kitchen has been running for 41 days. This is generation 312. The flies have
> opinions about the banana."*

The visitor does nothing. Flies live their lives on camera. The narrator notes drama.
The visitor can just... watch. Or: click a fly to name it, drop a strawberry, slam
the swatter, follow a single fly's life cinematically.

## 2. Core features (v1)

### 2.1 The Living Kitchen (the stage)
- Photoreal 3D kitchen diorama (see `04-VISUAL-TARGET.md`)
- Self-renewing food system: fruit periodically appears/ripens/rots
- Hazards: swatter (user or auto-triggered), bug zapper (deadly blue light),
  spider web in the window corner, open window (escape = death)
- Day/night cycle (lighting mood, night = zapper hazard active)

### 2.2 The Flies (the actors)
- 50–150 flies, male/female (females slightly larger)
- Lifecycle: egg → larva (in fruit) → pupa → adult → death. Time-compressed
  (see `03-BIOLOGY-SYSTEMS.md` for timings)
- Needs: hunger (food), energy (rest), age (death). No water needed (fly fact)
- Sex-tagged behavior: males court; females accept/reject and lay eggs
- Per-fly state machine: IDLE / EXPLORE / SEEK_FOOD / EAT / COURT / FLEE / REST / DIE

### 2.3 The Brains (the evolution)
- Every fly has a tiny neural net (~20–100 params) — NOT a connectome, marketing
  calls them "artificial fly brains"
- Inputs: food gradient smell, nearest hazard vector, zapper glow, fly-crowding,
  energy, random noise. Outputs: turn/accelerate (+ court-or-not for males)
- Genetic algorithm: survivors breed → offspring inherit + mutate weights
- Selection pressure: starvation, zapper, swatter, spider, old age
- **Legibility mandate:** evolved behaviors must be VISIBLE (dodging, food-rush
  waves, courtship skill) — fitness shaping to avoid degenerate strategies
  (corner-camping). GA tuning details in `02b-SIM-CORE.md`

### 2.4 The Narrator (the moat)
- Event-driven narration, Attenborough-deadpan tone
- Caption-first (free); Web Speech API voice on milestone events only
- Event types → narration templates (examples):
  - Gen milestone: *"Generation 100. The flies have discovered that the blue
    light means death. Most of them."*
  - Named-fly near-death: *"Gerald has survived the swatter four times now.
    Statistically, Gerald should not exist."*
  - Courtship fail: *"He sang for eleven seconds. She left. It happens."*
  - Mass extinction: *"The swarm has learned that the blue light means death. Most of them. Gerald has not."* (do not reuse; template variety required)
  - Famine: *"The banana is gone. What follows is mathematics."*
- Narrator never repeats exact phrasing twice within a session (generation via
  LLM with variety constraint, or template bank rotation)

### 2.5 Named Flies & Lineages (the retention engine)
- Click any fly → name it (free, rate-limited). Named flies get a spotlight ring
- Named fly has a lineage page: parents, children, notable events, "OBITUARY"
  generated at death
- Dynasty = lineage with ≥10 descendants. Dynasty tree view
- When a named fly dies, narrator eulogizes it

### 2.6 The Daily Recap (the viral artifact — flagship)
- Every day (sim-day), a 30–60s auto-generated clip: best moments (dodges,
  courtships, disasters, deaths of named flies), time-compressed, narrated
- Client-side MediaRecorder capture of the 3D canvas + audio track
- Posted as shareable MP4/WebM (download + socials)

### 2.7 User interactions (optional, non-required)
| Action | Effect | Cost |
|---|---|---|
| Drop fruit | Spawns food item (choices: strawberry, banana slice, orange) | 1 per 5 min (anti-spam) |
| Swatter strike | Player-aimed swat at a spot; big FX | 1 per 30 s |
| Name a fly | Names an unnamed fly | 3 names per day |
| Follow mode | Cinematic camera tracks one fly | unlimited |
| Photo mode | Freeze-frame with DoF, export PNG | unlimited |
| Info panel | Click anything → "field guide" card (fly, banana, zapper) | unlimited |

## 3. Anti-boredom mandates (council findings)
- Deaths must be legible: splat FX, slow-mo, brief camera push on notable deaths
- No dead air: if nothing happens for >30 s sim-time, narrator fills (ambient lines bank)
- Scheduled disasters: "Bug-Bomb Monday" (fog event), window left open Friday
  (escape risk), zapper nights. Announced by narrator

## 4. Explicitly NOT in v1 (do not build)
- Betting/wagering (moderation + legal)
- Multiplayer co-op interaction
- Fly editor/modding (that was the killed "Fork the Fly Brain" idea — v3 dream)
- Accounts/auth for v1 (anonymous naming with localStorage token)
- Real connectome data (honesty framing D4)
- Mobile-native app (responsive web only)

## 5. Success metrics
- Phase 0 gate: visible dodging behavior by Gen ≤50 (hard requirement to proceed)
- v1 launch: median session >3 min; ≥1 organic share per 100 visitors
- Clip pipeline: daily recap produced without human intervention
