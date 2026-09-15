# 04 — VISUAL TARGET (the quality bar)

> USER REQUIREMENT (verbatim intent): "I want simulations like high quality not low
> quality. I want 3D models like GTA 5 or 6. It should look real and high quality.
> It should look really good so the user will find it attractive."

## 0. Honesty box (for agents — don't skip)

A true GTA 6 look = 100+ artists, years, licensed scan data. NOT achievable here
and pretending otherwise wastes months. What IS achievable and genuinely close in
*perceived* quality:

**"Photoreal diorama" style** — like Unreal Engine 5 "Lumen in the Land of NaN"
tech demos / architectural product renders / Pixar film sets. Small scene, few
materials, but every material is PBR-correct, every light is real, post-stack is
filmic. On a small scene this is *indistinguishable from AAA* in screenshots and
socials — which is where this project lives (clips!).

## 1. Reference board (text form — the vibe we're matching)

- Warm late-afternoon sunlight through a kitchen window → golden god-rays
  (subtle volumetrics) across a wooden counter
- Materials: honed marble/quartz counter, aged walnut cabinets, brushed steel
  fridge hints, ceramic fruit bowl, tiled backsplash with grout bump
- Micro-scale world feeling: at fly height, a crumb is a boulder, a drop of juice
  is a lake. Macro-to-micro camera transitions = the money shots
- Three-point film lighting: key (sun through window), fill (skylight/HDRI),
  rim (pendant lamp warm)
- Filmic grade: ACES tonemapping, slight vignette, warm LUT, 35mm-look DoF in
  cinematic shots. Color palette: warm ambers, teak, cream, with red fly-eyes
  as the accent color
- Mood references: "Little Nightmares" dioramas (composition), Blender open
  movies (material quality), Unreal kitchen archviz (lighting), macro
  photography of flies (fly look)

## 2. Scene layout (single hero kitchen, built once, perfected)

```
        [WINDOW - sun source, spider web corner top-left, "outside" = HDRI sky]
  ┌────────────────────────────────────────────────────────┐
  │ backsplash tiles; open window (hazard)                 │
  │                                                        │
  │ MAIN COUNTER (flies live here): fruit bowl (banana,   │
  │  strawberries, orange), cutting board with apple core, │
  │  juice puddle, crumbs                                   │
  │                                                        │
  │ SINK CORNER (damp, mold zone later) — compost bin      │
  │ under counter (extinction safety-net lore)             │
  │                                                        │
  │ STOVE/BRAND side: pendant lamp (night source),         │
  │  bug zapper hangs (blue UV glow at night)               │
  └────────────────────────────────────────────────────────┘
  Front edge = camera favorites: low, fly-POV shots against bokeh kitchen
```

- Scale trick: build at real scale (1 unit = 1 m), flies at 3–4 mm real size BUT
  we cheat: flies rendered at ~5x real scale (15–20 mm) so they read on camera;
  food/kitchen at real scale. Do NOT let the camera ever be far enough to break
  the illusion. (This is what every "tiny world" film does.)

## 3. Rendering stack (Three.js r160+)

- Renderer: WebGL2, `ACESFilmicToneMapping`, `outputColorSpace: SRGB`, shadows PCFSoft
- Post: `EffectComposer` → SSAO (or GTAO if cheap) + Bloom (selective: zapper,
  sun shafts, fly eyes catchlight) + DoF (bokeh pass, cinematic modes only) +
  subtle film grain + vignette (custom final shader)
- Lighting: HDRI (polyhaven kitchen/sun) as ambient + directional sun (shadow-casting,
  animated slowly for day cycle) + pendant warm point at night + zapper blue point
- Materials: PBR (albedo/normal/rough/metal/ao maps), food gets subsurface-ish
  look via `transmission` or translucent shading where cheap; counter polished
  with visible reflections (use `RoomEnvironment` for cheap IBL)
- God rays: cheap radial blur pass when sun visible (skip volumetrics)
- Day cycle: 24 sim-min; sun angle/color lerps warm→white→amber→blue-night;
  zapper takes over as light source at night (great shots)

## 4. Fly visual design (the star)

- Base mesh: Drosophila anatomically right — red compound eyes (emissive slight),
  tan thorax with dark stripes, checkerboard abdomen tip, transparent veined wings,
  6 legs (animated procedurally, not rigged — cheap and convincing at this scale)
- Source: adapt free Sketchfab Drosophila/fly models (see 06-ASSETS) OR generate
  base in Blender from reference. Target ≤ 3.5k tris each (LOD0), LOD1 ~800 tris
- Animation: procedural wing-flap (sine, frequency ~200 Hz visual: blur-wing
  trick at speed = semi-transparent ellipse swap), leg walk cycle (simple IK-ish
  bob), courtship wing-single-extend, death ragdoll (fall + tiny bounce + splat decal)
- Instancing: one InstancedMesh, per-instance color tint (lineage hue hints after
  generations — subtle), ≤150 instances
- Named fly: gentle spotlight ring + persistent tiny name label (billboard, only
  in near-camera)
- Growth: larvae = soft segmented capsule (instanced), squishy scale-pulse anim;
  eggs = tiny white ovals cluster; pupae = dark brown capsule that darkens then cracks

## 5. Camera system

1. **Overview orbit** (default): slow drift around kitchen, 3 pre-set framings cycling
2. **Cinematic mode**: auto-director picks events (courtship, swatter strike,
   zapper kill) and frames them (rule-of-thirds, focus pulls, slow-mo 0.25x on kills)
3. **Follow-Gerald mode**: chase-cam on a selected fly, DoF wide, macro vibes
4. **Fly-POV mode** (v2): first person from fly's head
5. **Photo mode**: pause, aperture/shutter DoF UI, filters, PNG export
Transitions: smooth lerp, never cuts (amateur giveaway). Auto-director code in
`sim-3d/camera.ts` (event framing table: event type → shot type list)

## 6. FX

- Splat: decal pool (20), squash anim, tiny juice particles
- Zapper: blue arc flash + smoke puff + sound pop; nearby flies scatter
- Courtship song: WebAudio oscillator pulse (pulse-song ~ "prrrp" chirp), gets
  slightly richer as songs evolve (map rhythm variance → audible difference)
- Ambient: kitchen hum, distant birds (WebAudio synthesis, no files, ~$0 and no licensing)
- Slow-mo: global timeScale 0.25x for 1.5 s on notable deaths (camera auto-zoom)

## 7. UI (diegetic where possible)

- Narrator captions: bottom-third, serif italic, letterboxed cinema bars during
  cinematic moments, fades like documentary subtitles
- HUD (minimal): generation counter (top-right, odometer roll animation),
  population, day/time-of-day icon, epoch number
- Fly info card: click fly → paper "field-guide card" slides in (pencil-sketch
  style portrait rendering of that fly's tint, name, age, lineage count)
- Interactions bar: bottom-left icon buttons (fruit, swatter, name, camera)
- NEVER show: fitness graphs, mutation sliders, anything research-y in the
  main view (debug overlay is a hidden dev mode: `?debug=1`)
