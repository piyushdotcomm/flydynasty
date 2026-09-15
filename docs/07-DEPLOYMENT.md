# 07 — DEPLOYMENT ($0/month, exactly how)

## 1. Services

| Service | Tier | Role |
|---|---|---|
| Vercel | Hobby (free) | Next.js app hosting, CDN, OG images |
| Supabase | Free (2 projects) | Postgres: checkpoints, names/lineages, epochs, event log, realtime (guest→host intents) |
| GitHub Actions | Free (public repo) | Hourly evolution cron, "fossil record" commits, daily recap trigger |
| Domain | existing or free subdomain | `flydynasty.vercel.app` is fine to start |

NOTE: Supabase free pauses idle projects — but our DB is only touched on visits
and by cron (hourly), so idle-pause is not an issue (cron counts as activity).

## 2. Supabase schema (migration 001)

```sql
-- Checkpoints: the shared world state
create table checkpoints (
  id bigint primary key generated always as identity,
  created_at timestamptz default now(),
  epoch_id int not null,
  payload jsonb not null,          -- Checkpoint JSON (02-ARCH §4)
  pushed_by text,                  -- 'cron' | lease token
  lease_until timestamptz          -- active visitor lease
);
create index on checkpoints (created_at desc);

-- Named flies / lineages (permanent content)
create table flies (
  id bigint primary key generated always as identity,
  epoch_id int not null,
  name text not null,
  lineage_id bigint not null,
  parent_lineage_ids bigint[] default '{}',
  born_sim_ms bigint,
  died_sim_ms bigint,               -- null = still alive at last write
  epitaph text,                     -- narrator's obituary line
  notable_events jsonb default '[]'
);

-- Narrator memory + event archive (recaps, epoch pages)
create table events (
  id bigint primary key generated always as identity,
  epoch_id int not null,
  sim_time_ms bigint not null,
  type text not null,
  payload jsonb,
  narration text                   -- the line shown (for recaps)
);

-- Anti-spam naming: anonymous tokens
create table name_quotas (
  anon_token text primary key,
  names_today int default 0,
  day date not null
);

-- RPC: acquire_world_lease(anon_token) returns lease if free
-- RPC: push_checkpoint(payload, lease_token) validates lease
-- RLS: all tables public-read (it's a public spectacle), writes via RPC only
```

## 3. GitHub Actions cron (`.github/workflows/evolve.yml`)

```yaml
name: evolve
on:
  schedule: [{cron: "0 * * * *"}]   # hourly
  workflow_dispatch: {}              # manual trigger
jobs:
  evolve:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: {node-version: 20, cache: pnpm}
      - run: pnpm install --frozen-lockfile
      - run: pnpm tsx cron/headless.ts   # loads checkpoint (unless visitor lease),
        # runs ~40 sim-min headless, pushes checkpoint to Supabase,
        # writes epoch digest to fossil-record/YYYY-MM-DD.md
      - run: |
          git config user.name "fly-dynasty-bot"
          git config user.email "bot@flydynasty.local"
          git add fossil-record/ || true
          git commit -m "fossil: epoch digest" || echo "nothing new"
          git push
```

The "fossil record" (markdown digests committed by the bot) is a feature, not a
log: the repo's commit history literally becomes the dynasty's geology.

## 4. Vercel

- Import monorepo, root = `packages/app`, standard Next.js settings
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- OG image route (`app/api/og/[id]`) renders fly portraits + dynasty cards for
  social shares (edge runtime)

## 5. Failure modes & responses

| Failure | Behavior |
|---|---|
| No visitors for days | Cron keeps world alive hourly. Cost: $0 |
| Supabase down | Site loads, starts from bundled last-known checkpoint (committed to repo weekly). "The kitchen is running on memory." |
| Cron fails | Next visitor's lazy catch-up covers the gap (fast-forward) |
| Two visitors, lease race | Lease RPC is atomic; loser renders as guest, sends intents (or watches — see 02-ARCH §5 v1 simplification) |
| Checkpoint corrupt | Fallback to previous checkpoint (never delete old rows; keep last 100) |
| Extinction | Epoch ceremony → fresh Epoch (D12) — by design, not a failure |

## 6. Launch checklist (Phase 5)

- [ ] Vercel project + domain
- [ ] Supabase migration applied, RLS on
- [ ] Actions cron green for 3 consecutive days
- [ ] First daily recap clip generated + shared manually (Reddit r/SideProject,
  r/InternetIsBeautiful, X — the fly-brain meme audience is primed Sept 2026)
- [ ] README with the story + demo clip embedded
- [ ] Attribution complete (ATTRIBUTIONS.md — CC-BY assets)
- [ ] Landing page: "The kitchen has been running for N days" counter from
      checkpoint history (first impression = it's ALIVE)
