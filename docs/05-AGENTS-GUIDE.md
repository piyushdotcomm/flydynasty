# 05 — AGENTS GUIDE (MANDATORY for any AI agent working here)

You are continuing the project (co-designed with piyushdotcomm — GitHub;
builder of Editron, LifeQuest, RescueMesh, d8fn; started Sept 14, 2026). Read
`docs/README.md` first (note the CRITICAL PIVOT section), then
`docs/09-REAL-MODEL-AND-DATA.md` (THE most important file), then this file,
then the file relevant to your task.

## ⚠️ 0. THE PIVOT RULE (highest priority, user mandate)

**EVERYTHING REAL. NO ASSUMPTIONS. NO INVENTED DATA.**
- Behavior comes ONLY from the published, validated model (Shiu et al., Nature
  2024, LIF on the real FlyWire connectome) run on real open data. See doc 09.
- Every constant in code carries a citation comment (paper + value source).
  If a value's source is unknown, STOP and fetch the paper — never guess.
- Never invent: brain dynamics, fitness functions, behavior rules, "plausible"
  parameters. If it's not in a cited paper, it doesn't ship.
- Behavior claims (UI + marketing) limited to validated results (doc 09 §3).
- The old evolved-AI design (doc 02b) is DEAD — historical reference only.
- Kitchen/narrator/clips survive as PRESENTATION of real model runs.

## 1. Quick project summary (30 seconds)

An interactive exhibit of the REAL fly brain: a photoreal 3D stage where real
stimuli (sugar, water, bitter, touch) trigger the real, experimentally validated
LIF model on the real FlyWire connectome (139K neurons). Visitors watch the real
neural cascade sweep through real anatomy and the real predicted behavior play
out on a virtual fly, with a documentary narrator citing the papers. Click any
neuron to activate/silence it — an in-silico experiment, honestly labeled as
live approximation vs precomputed full-model runs. Stack: Next.js + Three.js +
TypeScript + WASM worker; $0/month (Vercel + Supabase + GHA cron for offline
full-model runs).

## 2. Rules of engagement

1. **Read before writing.** `docs/README.md` (bible) → this file → task-relevant doc.
   The Decision Log in README §4 is binding. Do not relitigate settled decisions
   (e.g., don't propose Unity "because graphics" — Three.js is decided; don't add
   server-side sim — client-side is decided).
2. **The Phase gate is law.** No 3D art, narrator, or site work before Phase 0
   (Reproduction Gate) passes: sugar GRN activation at 100 Hz must produce MN9
   firing (as in Shiu et al. 2024), and the shuffled-connectivity control must
   fail. Details `09-REAL-MODEL-AND-DATA.md` §6. If asked to skip it, warn the
   user once, then follow their explicit instruction and log the deviation.
3. **sim-core purity.** `packages/sim-core` = zero rendering/DOM/Three imports.
   Deterministic (seeded RNG), runs in browser/Node/vitest. Rendering reads
   state; never writes.
4. **Honest framing (D4).** All public copy says "artificial fly brains." Never
   claim real connectome/neuroscience fidelity. Never claim the flies "think"
   like real flies.
5. **Show, never explain.** No ML jargon in user-facing UI. GA invisible.
6. **$0/month.** Any dependency on paid services needs explicit user approval
   in writing (chat counts if user says yes explicitly).
7. **Free assets only** (CC0/CC-BY with attribution log in 06-ASSETS.md). No
   scraped paid assets. Log every asset: source URL, license, author.
8. **Update docs as you work.** Changed a constant? Update `03-BIOLOGY-SYSTEMS.md`
   constants block. New decision? Add to README Decision Log. New asset?
   `06-ASSETS.md`. Keep this knowledge base the source of truth — the user
   explicitly wants continuity across agents ("store all the knowledge in files").
9. **Small PRs, verified work.** Run tests before declaring done
   (`pnpm -r test`). If adding sim behavior, add/probe tests. The GA regression
   gate test must never be deleted or weakened without user approval.

## 3. Repo conventions

- Package manager: **pnpm** (workspace monorepo). Node 20+.
- Style: TypeScript strict, no default exports for modules, colocate tests.
- Naming: sim entities in `sim-core` are framework-agnostic
  (`Fly`, `World`, `Tick`, never `FlyMesh`).
- Commits: conventional commits (`feat(sim):`, `fix(3d):`, `docs:`).
- Branch per phase/milestone. README §3 phase table is the status board —
  update statuses there (DRAFT/BUILDING/PLAYABLE/POLISHED/LIVE).

## 4. Where to start (common entry points)

| If task is... | Read | Then |
|---|---|---|
| "Build Phase 0" | `09-REAL-MODEL-AND-DATA.md` (all) + Shiu et al. 2024 Methods | `packages/sim-core` LIF model + ETL, reproduction test first |
| "Make it look better" | `04-VISUAL-TARGET.md` + `06-ASSETS.md` | renderer upgrades, post stack |
| "Add narrator lines" | `01-PRODUCT.md` §2.4 + doc 09 §3 (allowed claims) | `narrator/` prompts, template bank, citations |
| "Deploy it" | `07-DEPLOYMENT.md` | Vercel/Supabase/GHA setup (GHA also runs offline full-model runs) |
| "Model gives weird results" | doc 09 §1, §6 + paper Methods | re-check parameters against paper, never "tune to taste" |
| "Continue wherever we left off" | README §3 phase table | first non-LIVE phase, first unchecked item |

## 5. Phase 0 checklist (the current frontier — copy into a todo when starting)

- [ ] Fetch Shiu et al. 2024 Methods (open access PDF) + Kakaria & de Bivort 2017
      + Churgin et al. 2021 → extract every LIF parameter WITH citations
- [ ] pnpm workspace scaffold (`packages/sim-core`)
- [ ] ETL: download FlyWire connectivity (Zenodo 10676866) + NT predictions
      (Eckstein 2024) + annotations (flywire_annotations GitHub); build
      connectivity matrix with E/I signs; document file hashes + licenses
- [ ] `lif.ts`: faithful LIF implementation, every constant cited
- [ ] `stimuli.ts`: sugar/water/bitter/Ir94e GRN activation (identities from
      Engert et al. 2022 as used in the paper)
- [ ] `tests/reproduction.test.ts` — THE GATE: sugar GRN @100 Hz → MN9 fires
      (100% of runs, as paper); shuffled-weight control fails (≤1/100)
- [ ] Extend gate: bitter suppresses sugar-driven MN9 (paper Fig. 3);
      mechanosensory → antennal grooming circuit (paper)
- [ ] Update README phase table: Phase 0 → PLAYABLE
- [ ] Log any deviation from paper parameters in doc 09 with justification

## 6. Things already rejected (don't re-propose)

- Evolved/invented brains, GA, breeding mutations (killed by pivot D15 — not real)
- Free-roaming autonomous "fly life" behavior claims (unvalidated — forbidden)
- Betting/wagering, multiplayer co-op, fly editor in v1
- Server-side 24/7 sim (paywall + complexity)
- 2.5D (user overrode to full 3D photoreal)
- "Real brain upload" framing (Eon dunk-cycle — never)
- Tuning model parameters "because it looks better" — only paper values

## 7. The user (whoever works here should know)

- Wants FUN + fascinating + normal-people appeal — but with the Sept 14 pivot:
  REAL science only. Fun now comes from real experiments ("I silenced one neuron
  and the fly forgot how to eat"), not fictional drama
- Demands high visual quality ("GTA 5 or 6") — steer via 04-VISUAL-TARGET honesty box
- Demands: actual data, zero assumptions, everything real, all sources citable
- Ships fast, likes gamified polish, full-stack TS/Next.js expert, has Supabase
  and on-device-AI experience; not a neuroscientist — explain neuroscience
  plainly when proposing features
