# FLY DYNASTY — Master Project Bible

> **Read this file first.** It is the single source of truth for the entire project.
> Companion files: `01-PRODUCT.md` (what we're building), `02-TECH-ARCHITECTURE.md` (how),
> `03-BIOLOGY-SYSTEMS.md` (game design math), `04-VISUAL-TARGET.md` (quality bar),
> `05-AGENTS-GUIDE.md` (how to work in this repo), `06-ASSETS.md` (3D models/sources),
> `09-REAL-MODEL-AND-DATA.md` (**THE PIVOT — real model, real data — READ THIS**).
> Status legend: each system has a status tag: `DRAFT / BUILDING / PLAYABLE / POLISHED / LIVE`

## ⚠️ 0. CRITICAL PIVOT — EVERYTHING REAL (user mandate, Sept 14, 2026)

**"Use the actual data, nothing of your own. Do not assume anything. Everything real."**

This SUPERSEDES the original Fly Dynasty design. The project now runs the
**published, experimentally validated computational model** (Shiu et al., Nature
2024: leaky integrate-and-fire on the real FlyWire connectome, validated >90%
against optogenetics) on **real open data** (FlyWire connectome, neurotransmitter
predictions, cell-type annotations, male CNS 2026). No invented brains, no
assumed behaviors, no fake evolution. Behavior claims restricted to validated
results. **All details in `09-REAL-MODEL-AND-DATA.md` — agents read it before
anything else.** Original docs (01–08) remain as history/presentation-layer
reference; where they conflict with doc 09, doc 09 WINS.

## 1. WHAT IS FLY DYNASTY

An always-on, self-running **3D evolution spectacle** in a photorealistic kitchen diorama.
Hundreds of digital flies — each with a tiny neural-network brain — live, eat, court,
breed, die, and get smarter every generation. A deadpan AI nature-documentary narrator
(Attenborough-style) commentates on the drama. Users watch; optionally they interact
(drop food, name a fly, trigger the swatter). Shareable auto-generated clips spread it.

**One-line pitch:** "A 24/7 kitchen where digital flies evolve intelligence on camera,
narrated like a nature documentary."

**Origin:** Idea developed Sept 14, 2026 with extensive brainstorming + council
(multi-judge) skill review. Council verdict: WARN → conditional PASS. The winning
insight: evolution sims go viral through *time-compressed narrative clips*, not live
viewing. The narrator + named-fly storylines are the moat. No prior art combines
evolution sim + serialized narration.

## 2. NON-NEGOTIABLE DESIGN PRINCIPLES

1. **The sim runs itself.** No user input required to enjoy. It is a living diorama.
2. **Show, never explain.** No fitness curves, no mutation-rate UI, no "MLP" jargon
   on screen. The genetic algorithm is invisible. Normal users see flies behaving.
3. **Narrator is the translation layer.** 300 dots = noise; 300 dots + Attenborough =
   drama. Every visible event maps to narration.
4. **Honest framing.** Brains are tiny neural nets "inspired by" biology. NEVER claim
   connectome/real-brain fidelity (avoids the Eon Systems dunk cycle). Marketing copy
   says "artificial fly brains."
5. **Free forever.** $0/month. Client-side compute. GitHub Pages static
   hosting (the deployed build replays precomputed model data; see
   `07-DEPLOYMENT.md`).
6. **Extinction is content.** Near-extinction events and Epoch resets are dramatic
   story moments, not failures.
7. **Clips > live stream.** The daily auto-generated recap clip ("Yesterday on Fly
   Dynasty") is the flagship product. The 24/7 world is the archive.

## 3. PROJECT PHASES (roadmap)

| Phase | Scope | Status |
|---|---|---|
| **0 — Reproduction Gate** | Implement Shiu et al. LIF model on real FlyWire data. Success = sugar GRN activation fires MN9 (as in paper); shuffled control fails. No art before this. | `NOT STARTED` |
| **1 — Real Data ETL** | FlyWire connectivity (Zenodo), NT predictions (Eckstein), annotations (Schlegel), region meshes | `NOT STARTED` |
| 2 — Replay Engine | Precomputed canonical runs; sparse trace format; browser replay + interpolate | `NOT STARTED` |
| 3 — Diorama | Photoreal kitchen/stage; real anatomy brain view; real-region glow driven by real traces | `NOT STARTED` |
| 4 — Interactive Lab | Click-to-activate/silence neurons (recruited-subgraph live approximation, honestly labeled) | `NOT STARTED` |
| 5 — Narrator + Clips | Narrate real events, cite papers; daily recap clips | `NOT STARTED` |
| 6 — Live | Deploy, male CNS courtship chapter, launch | `NOT STARTED` |

**The Phase 0 rule (revised):** do NOT build any 3D, narrator, or site before the
model reproduction passes (sugar → MN9). One verified real cascade is the product;
everything else is presentation around it.

## 4. KEY DECISIONS LOG (do not relitigate without strong reason)

| # | Decision | Rationale |
|---|---|---|
| D1 | Three.js + Next.js + TypeScript | Builder's stack; Editron experience |
| D2 | 3D photoreal diorama (NOT 2.5D) | User explicit requirement; better clips |
| D3 | Free CC0 assets only (Kenney, Sketchfab) | $0 budget |
| D2 | Client-side sim + lazy catch-up checkpoints | Free 24/7 "always evolving" illusion |
| D5 | GA with tiny MLP/RNN brains (~20–100 params) | Legible behavior, cheap compute |
| D6 | No betting, no multiplayer in v1 | Council cut: moderation burden |
| D7 | 50–150 expressive flies, not 300 dots | Legibility > count |
| D8 | Time-compressed lifecycle (egg→adult ~2 min) | Real fly life = 10 days; game = minutes |
| D9 | Food auto-renews (ripening fruit events) | Users never *must* feed; population self-balances |
| D10 | Sex-tagged flies; male courts, female lays eggs | Real biology as game design |
| D11 | Narration: captions free; Web Speech API voice at milestones | $0 cost |
| D12 | Extinction → "Epoch" reset ceremony + hidden compost eggs safety net | Death is drama |
| D13 | Photoreal target: PBR + HDRI + post-processing (SSAO, bloom) | "GTA-like" quality is 100+ artists; achievable ceiling is Unreal-demo diorama. This is the honest quality bar |
| D14 | Connectome = real-anatomy brain view layer (not behavior engine) | User mandate to use the discovery; honest per council; marketing hook with zero debunk risk. See 08-CONNECTOME-INTEGRATION.md |
| D15 | **PIVOT: Everything real.** Run Shiu et al. 2024 LIF model on real FlyWire data; no invented brains/evolution/assumed behavior; behavior claims limited to validated results; all parameters cited from literature | User mandate Sept 14, 2026: "use the actual data, nothing of your own, no assumptions." Supersedes GA/evolution design (D5, D7, D8 biology-loop, D10 courtship-evolution). Presentation layer (kitchen, narrator, clips) survives to display REAL runs. See 09-REAL-MODEL-AND-DATA.md |

## 4.5 VISUAL QUALITY BAR (user's explicit requirement)

User demands **high quality, realistic, "GTA 5/6-level"** visuals. Store this as the bar:
- **Target aesthetic:** "Photorealistic kitchen diorama" — Unreal Engine 5 demo quality
  (think: Kitchen appliance ads, Pixar's "Inside Out" memory-ornament detail level)
- **Renderer:** Three.js with WebGL2 + post-processing chain (SSAO, bloom, depth-of-field)
- **Materials:** Full PBR (albedo/normal/roughness/metallic), not flat colors
- **Lighting:** HDRI environment lighting + warm directional sun through window, soft shadows (PCFSoft), subtle volumetric light shafts if cheap
- **Kitchen model:** Detailed modular kitchen (cabinets, counter, tiled backsplash,
  window with view, hanging pendant lights) — see `04-VISUAL-TARGET.md` and `06-ASSETS.md`
- **Fly model:** Anatomically accurate Drosophila (red compound eyes, striped thorax, 
  veined wings) — asset sourced or custom-built, see `06-ASSETS.md`
- **Frames:** 60fps on mid-range laptop (instanced rendering, LODs)
- IMPORTANT: If photoreal assets prove unavailable, fall back to premium **stylized-real**
  (cozy diorama aesthetic), but ONLY after exhausting photoreal options. User wants
  REAL looking.

## 5. THE STATE OF KNOWLEDGE (what we know, as of Sept 14, 2026)

### Verified prior art (from web research)
- Fly brain plays Doom (Alex Wormuth, CNET Sept 2026) — connectome as game controller
- Fly brain plays Overwatch (viral) — same pattern
- Eon Systems "brain upload" — full emulation + virtual body; got scientific dunking for overclaiming
- "Fly brain emulated in browser, pleasant life" (Reddit r/SideProject, 515 upvotes)
- VirtualFlyBrain, neuprint, FlyWire — scientific viewers, not consumer
- Genetic-algorithm "cars learning to park/finish track" — YouTube genre, hundreds of millions of views, from *time-compressed best-of clips*
- "Nothing, Forever" (AI Seinfeld 24/7 stream) — faded: lesson = serialized memory keeps audiences; raw spectacle alone doesn't
- Twitch Plays Pokemon — collective input precedent
- Creatures (1996) — editable brains, fictional nets; closest ancestor, no real-data/narrator layer
- **Empty lane (verified):** nobody combines evolution sim + serialized narrative + named-character lineages

### Council findings (two rounds, multi-judge)
Round 1 (strategist + red team, "Fork the Fly Brain" modding platform): killed — dynamics model unbuildable honestly, scope trap, tourist audience.
Round 2 (viral content judge, Fly Dynasty): WARN → conditional PASS:
- Virality 0.70 — genre-proven but clips must be manufactured (event→clip pipeline)
- Retention lever ranking: named-fly drama > gen milestones > narrator > betting (cut betting)
- Boring risks: illegible deaths (add splat FX + slow-mo death cam), dead air
- Hardest part is GA tuning (the invisible 80%) — evolution finds degenerate optima first
- Must ship: daily recap clip as flagship; lineage pages; scheduled disasters; camera follow mode
- v1 cuts: 2.5D→ overridden by user to full 3D photoreal (D2), betting, live interaction
- Realistic timeline with 3D photoreal: 8–12 weekends of work

### Fruit fly biology (verified facts, mapped to game)
- Egg hatches 2–4 days → larva eats fruit ~4 days → pupa → adult. Egg-to-adult ~1 week ideal.
- Adult lifespan 2–6 weeks. Females bigger than males.
- Female lays 1–20 eggs per clutch; up to ~500 lifetime. Eggs laid in ripening produce.
- Courtship ritual (fixed sequence!): male orients → taps female with foreleg → circles
  her → extends+vibrates ONE wing → species-specific song → licks → mounts → mates.
  Female accepts or rejects.
- Flies attracted to: overripe banana, vinegar, sugar, juice. Repelled by: swatters, zappers.
- Full biology→game mapping in `03-BIOLOGY-SYSTEMS.md`.

### Free assets found (verified available Sept 2026)
- Sketchfab free models: "Fly - Low Poly" (Leomaderart), "Low Poly House Fly (Diptera)",
  "Drosophila - Adult Fruit Fly - CT Scan" (etainproject — real anatomy!)
- Kenney Food Kit: 200+ CC0 food models
- Kenney/Quaternius CC0 kitchen props
- Full list + links + license notes in `06-ASSETS.md`.

## 6. QUICK REFERENCE — FILE MAP

| File | Contents |
|---|---|
| `README.md` | This bible — start here |
| `01-PRODUCT.md` | Product spec: features, user experience, narrator lines, interactions |
| `02-TECH-ARCHITECTURE.md` | Architecture, data flow, checkpoint system, deploy plan |
| `02b-SIM-CORE.md` | Sim/brain/GA design — the engineering core |
| `03-BIOLOGY-SYSTEMS.md` | Fly lifecycle, courtship, genetics, population math |
| `04-VISUAL-TARGET.md` | Quality bar, scene layout, lighting, materials, camera |
| `05-AGENTS-GUIDE.md` | How AI agents should work in this repo (MANDATORY reading) |
| `06-ASSETS.md` | 3D models, sources, licenses, conversion pipeline |
| `07-DEPLOYMENT.md` | GitHub Pages deploy of the static export (see that file for the historical Vercel/Supabase plan) |
| `08-CONNECTOME-INTEGRATION.md` | Real brain anatomy layer (the 2026 discovery, used honestly) |

**IMPORTANT (user decision D14):** the 2026 fly connectome discovery IS used —
as a real-anatomy brain view layer (real neuropil meshes, real region names,
real courtship P1 / giant-fiber escape circuits displayed when flies act).
Behavior stays evolved-artificial and is labeled as such. Details in
`08-CONNECTOME-INTEGRATION.md`. Do not build behavior on connectome data; do
not remove the brain view — both are settled.
`