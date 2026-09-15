# 🪰 Fly Dynasty

> An always-on 3D evolution spectacle: a photoreal kitchen where digital flies
> with tiny neural-net brains live, court, breed, and get smarter every
> generation — narrated like a nature documentary, generating its own daily
> recap clips. Runs forever, costs $0/month.

**Entry points:**
- **`docs/README.md`** — the project bible (start here — single source of truth)
- **`docs/05-AGENTS-GUIDE.md`** — MANDATORY reading for any AI agent or contributor
- **`docs/01-PRODUCT.md`** — what we're building (features, narrator, UX)
- **`docs/02-TECH-ARCHITECTURE.md`** + **`docs/02b-SIM-CORE.md`** — how (architecture, brains/GA)
- **`docs/03-BIOLOGY-SYSTEMS.md`** — real fly biology → game systems
- **`docs/04-VISUAL-TARGET.md`** — the quality bar (photoreal diorama)
- **`docs/06-ASSETS.md`** — free 3D assets, sources, licenses
- **`docs/07-DEPLOYMENT.md`** — $0/month deploy (Vercel + Supabase + Actions)

**Current status:** Phase 0 (de-risk gate) — not started. Everything you need to
begin is documented, including the exact acceptance test (visible swatter-dodging
by generation ≤ 50).

## Quick summary

| | |
|---|---|
| Stack | Next.js + Three.js + TypeScript (pnpm monorepo), Supabase, Vercel |
| Sim | Client-side, deterministic, seeded RNG, Web Worker; 24-param RNN brains; GA |
| Look | Photoreal kitchen diorama: PBR (ambientCG), HDRI (Polyhaven), ACES + SSAO + bloom |
| Cost | $0/month — world advances via live visitors + hourly GitHub Actions cron + lazy catch-up |
| Moat | Narrator + named flies + lineages; daily auto-generated recap clips |
| License | TBD (MIT suggested) |

## Development

```bash
pnpm install
pnpm -r test        # vitest (sim-core gate test included once built)
pnpm dev            # app dev server
```

(Project scaffold not built yet — docs are the current state. See
`docs/05-AGENTS-GUIDE.md` §5 for the Phase 0 checklist.)
