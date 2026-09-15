# @flylab/app

Next.js 15+ (App Router) front-end shell for Real Fly Lab — the dark cinematic
stage the 3D connectome visualizer and sim-core plug into.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- three.js (placeholder scene; full visualizer lands separately)
- Zustand (experiment state: activeStimulus / isSimulating / lastResult)

## Develop

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

## Build

```bash
pnpm build
```

## Routes

- `/` — landing: full-screen 3D scene canvas, experiment dock (Sugar / Water /
  Bitter / Low Salt), live status card, connectome loading state
- `/about` — methodology + what's real vs simulated

## Env

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_DATA_URL` to the
gzipped connectome graph the visualizer will consume.
