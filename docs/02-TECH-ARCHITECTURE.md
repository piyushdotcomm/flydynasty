# 02 — TECHNICAL ARCHITECTURE

Stack: **Next.js (App Router) + TypeScript + Three.js (r160+) + Zustand** for client,
**Supabase** (Postgres) for shared state, **Vercel** hosting, **GitHub Actions** cron.
All simulation runs CLIENT-SIDE in the browser. $0/month total.

## 1. High-level data flow

```
                    ┌────────────────────────────────────────────┐
                    │            BROWSER (visitor)               │
                    │                                            │
 Visitor opens ───► │  1. Load site (static, Vercel CDN)          │
                    │  2. Fetch latest checkpoint (Supabase)      │
                    │  3. HEADLESS CATCH-UP: fast-forward sim     │
                    │     from checkpoint → now (no rendering,    │
                    │     pure math; thousands of gens/seconds)   │
                    │     — bounded: catch-up runs while initial  │
                    │       scene streams in; if not done by     │
                    │       then, catch-up runs 2–3 ticks/frame   │
                    │       until caught up (progress bar:        │
                    │       "Fast-forwarding 41 days...")         │
                    │  4. JOIN LIVE: sim ticks + renders at 60fps │
                    │  5. Periodically push new checkpoint        │
                    │     (only the LATEST visitor pushes;       │
                    │     lease-based, see §5)                   │
                    └────────────────────────────────────────────┘

                    ┌────────────────────────────────────────────┐
                    │        GITHUB ACTIONS CRON (hourly)        │
                    │  Runs headless Node sim (same TS code as   │
                    │  browser, compiled) for N minutes, advances │
                    │ world, writes checkpoint to Supabase +     │
                    │ commits summary to repo ("fossil record")  │
                    └────────────────────────────────────────────┘
```

**The "always alive" illusion:** no server runs 24/7. World advances via (a) live
visitors, (b) hourly cron catch-up, (c) lazy fast-forward on next open. Checkpoint
JSON is small (see §4).

## 2. Monorepo layout

```
fruitfly/
  docs/                      # this knowledge base
  packages/
    sim-core/                 # PURE TypeScript: sim, brains, GA, events
      src/
        brain.ts              # tiny MLP/RNN + forward pass
        genome.ts             # genome type, mutation, crossover
        fly.ts                # fly entity + behavior state machine
        world.ts              # world state: flies, food, hazards, time
        tick.ts               # fixed-step tick (deterministic!)
        events.ts             # event detection → narrator feed
        checkpoint.ts         # serialize/deserialize world state
        fastforward.ts        # headless multi-tick (browser + cron + tests)
        rng.ts                # SEEDED RNG (determinism requirement)
      tests/                  # vitest: determinism, GA improvement, balance
    sim-3d/                   # Three.js rendering of sim-core state (no logic!)
      src/
        scene.ts              # kitchen scene assembly
        flyRenderer.ts        # instanced fly rendering + LOD
        foodRenderer.ts       # fruit meshes, rot states
        fx.ts                 # splats, zapper sparks, particles, slow-mo
        camera.ts             # orbit, cinematic, follow-Gerald, photo mode
        postfx.ts             # SSAO/bloom/DoF composer
        capture.ts            # MediaRecorder clip export
      assets/                 # GLB models (see 06-ASSETS.md)
    narrator/                 # LLM narration service
      src/
        prompts.ts            # persona + variety constraints
        eventsToPrompt.ts     # event → narration request
        tts.ts                # Web Speech API wrapper (milestones only)
        templates.ts          # offline fallback template bank
    app/                      # Next.js site (marketing + live view + lineage pages)
      app/
        page.tsx              # landing → live kitchen
        fly/[id]/page.tsx     # lineage/obituary page
        epoch/[n]/page.tsx    # epoch history
        api/og/[id]/route.tsx # OG images for shares (fly portraits)
    cron/                     # GitHub Actions workflows + headless runner
  supabase/
    migrations/               # checkpoints table, names, epochs, metrics
```

**Hard rule:** `sim-core` has ZERO rendering/Three.js/DOM imports. It must run in
browser, Node (cron), and vitest identically. Rendering reads sim state; never
writes it.

## 3. Determinism requirement

- All randomness through one seeded RNG (rng.ts). RNG state is part of checkpoint.
- Fixed tick (e.g., 20 ticks/sec sim-time at 1x speed; speed multiplier separate
  from tick count).
- Same checkpoint + same tick count + same inputs = same world. This makes
  catch-up, cron, and debugging all share one code path. Test: vitest replays
  10k ticks from fixture, asserts hash of world state.

## 4. Checkpoint format (the shared-world artifact)

```ts
interface Checkpoint {
  version: 1;
  epochId: number;          // resets on extinction
  simTimeMs: number;        // total simulated time
  generation: number;
  rngState: number;
  flies: FlySnapshot[];     // alive flies: genome, pos, age, sex, name?, lineageId
  eggsLarvaePupae: Array<{stage, pos, genome, hatchAt}>;  // compressed
  food: FoodSnapshot[];     // items with rot state
  nextLineageId: number;
  eventLog: EventEntry[];   // last 500 events (narrator memory)
  stats: GenerationStats[]; // per-generation aggregates (sparklines)
}
```
- Size estimate: 150 flies × ~200B + eggs + food + events ≈ **80–150 KB JSON**.
- Supabase row: `(id, created_at, epoch_id, payload jsonb, pushed_by, lease_until)`.

## 5. Lease-based checkpoint pushing (multi-visitor safety)

Problem: two visitors both advancing the world → divergence. Solution: lightweight lease.
- On join, request lease (Supabase RPC): if no active lease, acquire for 10 min
  (renewed by heartbeat). Visitor with lease is the "world host" — their sim is
  authoritative and they push checkpoints every 60 s.
- Non-lease visitors: render the world but their interactions send "intents"
  (food drop, swat) via Supabase realtime to the host, which applies them to the
  authoritative sim. (v1 simplification: if interactions-by-guests get complex,
  make interactions host-only and guests watch. Decide at Phase 4.)
- On lease expiry/crash: next visitor picks up from last checkpoint; loses ≤60 s.
- Cron also respects lease (skips if active visitor lease).

## 6. Narrator pipeline

1. `sim-core/events.ts` emits typed events: `{type: 'gen_milestone'|'near_death_escape'|'courtship'|'named_death'|'famine'|'disaster'..., subjects, meta}`
2. Renderer displays caption immediately via template bank (0 latency, offline-safe)
3. In background, LLM generates a "premium" variant line (Gemini Flash free tier /
   on-device Gemma — builder has RescueMesh on-device experience). If response
   arrives within 5 s and beats template score, swap caption / use for voice.
4. Milestones additionally speak via Web Speech API (voice only, no paid TTS in v1)
5. All narration lines logged to event log (narrator never repeats verbatim —
   check against last 500 lines before showing)

## 7. Clip generation (daily recap)

- Trigger: sim-day rollover (or manual "recap" button)
- Client-side: replay last day's recorded KEYFRAME LOG at 4–8x speed into the
  renderer (deterministic sim = we can re-render the past!), auto-camera picks
  best-framed moments from event log, MediaRecorder captures canvas + TTS audio
  → WebM/MP4 → download / social upload manual in v1
- KEYFRAME LOG: sim-core writes every tick's world digest every 2 sim-min to a
  ring buffer (in-memory + Supabase for cron days). Recap = re-render digest.

## 8. Performance budget (60fps mid-range laptop)
- Flies: 1 instanced mesh, ≤150 instances (LOD: near = full model, far = billboard)
- Larvae/eggs: instanced points; food: ≤30 GLBs; particles: 1 pooled system
- Draw calls < 120; postFX chain: SSAO + bloom only (DoF only in photo/follow mode)
- Sim tick: budget 3 ms/frame (20 ticks/s × 150 flies × tiny MLP = trivial)
- Worker: sim-core runs in a Web Worker; renderer reads snapshots via
  transferable buffers (never blocks main thread)

## 9. Testing strategy
- sim-core: vitest unit (brain forward, mutation bounds), integration (10k-tick
  determinism), balance simulations (population survives 100 sim-days without
  extinction across 20 seeds; food system self-balances)
- GA quality gate: automated "behavior probe" — swatter-bot harasses population;
  median survival time must increase 2x+ from Gen 1 to Gen 50 (this is the
  Phase 0 gate, kept as a regression test forever)
- sim-3d: visual smoke tests (Playwright + WebGL screenshot diff on fixtures)
- app: Playwright e2e (load, catch-up completes, name a fly, drop fruit)

## 10. Cron details
- `.github/workflows/evolve.yml`: hourly, job: checkout → `pnpm tsx
  cron/headless.ts` (imports sim-core, loads checkpoint, runs 40 min sim-time
  fast-forward, pushes checkpoint unless visitor lease active) → commit digest
  to `fossil-record/` (epoch summaries only, not raw state)
- Free tier check: public repo Actions minutes unlimited-ish for small jobs;
  keep job < 5 min wall time
