# 06 — ASSETS (3D models, sources, licenses)

> Everything must be FREE (CC0 preferred; CC-BY allowed WITH attribution log
> here). No paid assets without explicit user approval. Log every asset you add:
> what, source URL, author, license, where used, conversion notes.

## 1. Verified available (researched Sept 14, 2026)

### Flies
| Asset | Source | License | Notes |
|---|---|---|---|
| Fly - Low Poly | sketchfab.com/3d-models/fly-low-poly-bc214680306e460d8ec72db056d76858 (Leomaderart) | check listing (free tier) | Optimized low-poly, real-time ready, clean UVs |
| Low Poly House Fly (Diptera) | sketchfab.com/3d-models/low-poly-house-fly-diptera-2baa84955f704a4091a274ef4acec24a | free | Basic fly; good LOD1 candidate |
| Drosophila - Adult Fruit Fly - CT Scan | sketchfab.com/3d-models/drosophila-adult-fruit-fly-ct-scan-ad29b897bd2b4e27bb04ab9d31baa117 (etainproject) | free | REAL anatomy from CT — hero/close-up model basis |
| Insect pack (animated, optimized) | sketchfab.com/3d-models/very-optimized-animated-insect-pack-bd7b1d2d9a5344838c4520cfd396d45b (Mostafa) | free | Reference for wing/leg animation rigs |

**ACTION for agents:** Sketchfab listings need per-asset license verification at
download time (free ≠ CC0 always). Download → check license → log here → convert
GLB (Sketchfab downloadable as glTF) → optimize in Blender (decimate to LOD
targets from `04-VISUAL-TARGET.md` §4: LOD0 ≤3.5k tris, LOD1 ~800).

### Food
| Asset | Source | License |
|---|---|---|
| Food Kit (200+ models) | kenney.nl/assets/food-kit | CC0 |
| Low Poly Fruit (MightFineBros) | sketchfab .../low-poly-fruit-2ce59930a269482b813dc013c0bd413c | free |
| Low Poly Cartoon Fruit Collection (chroma3d) | sketchfab .../low-poly-cartoon-fruit-collection-5cc69fbc15674c5091c5730289ab68f3 | free |

Kenney Food Kit is the backbone (CC0, game-ready GLB available). Banana,
strawberry, orange, apple — matches `03-BIOLOGY-SYSTEMS.md` food kinds.

### Kitchen / environment
| Asset | Source | License |
|---|---|---|
| Kenney props (furniture/food/kitchen-ish packs) | kenney.nl/assets (browse "furniture", "food") | CC0 |
| Quaternius packs (furniture/props) | quaternius.com | CC0 |
| 72 Free Blender insect models | blendswap.com/3d/insects | CC-BY/CC0 varies — verify each |

NOTE: a complete photoreal kitchen interior kit in CC0 is the weakest link in
the free ecosystem. Options in priority order:
1. Poly Pizza (poly.pizza) — search "kitchen" (many CC0 low-poly; stylized more
   than photoreal)
2. Build the kitchen from modular primitives + PBR texture sets (ambientCG —
   CC0 PBR textures: wood, marble, tile, steel — this gets 80% of photorealism
   with full control; RECOMMENDED path for the quality bar)
3. BlenderKit free tier (CC0 section) — individual props (faucet, bowl, board)
4. If truly stuck: Quaternius kitchen-style props, retextured with ambientCG maps

**Photorealism strategy (decided):** geometry can be simple/modular; the LOOK
comes from PBR texture sets (ambientCG CC0), HDRI lighting (polyhaven CC0), and
the post stack. This is how archviz people hit photoreal with free assets.

### Environment / HDRI / textures
| Asset | Source | License |
|---|---|---|
| HDRI (kitchen, sunny window, skies) | polyhaven.com/hdris | CC0 |
| PBR textures: walnut, marble, tile, brushed steel, ceramic, banana peel, strawberry | ambientcg.com | CC0 |
| 3D scans reference | polyhaven.com/models | CC0 |

### Audio
- NO audio files in v1 — all WebAudio-synthesized (wing buzz via oscillator,
  courtship pulse-song, swatter whoosh/thwack, zapper arc, kitchen hum ambience).
  Zero licensing surface, tiny bundle. See `04-VISUAL-TARGET.md` §6.

## 2. Asset pipeline (how assets get in)

1. Download (check license AT download time — free tier ≠ CC0; if CC-BY, add
   attribution to `ATTRIBUTIONS.md` at repo root)
2. Blender: decimate to LOD budget, fix scale (1u=1m; flies 5x real scale per
   `04-VISUAL-TARGET.md` §2 scale trick), rename objects sanely
   (`fly_lod0`, `banana`, `counter_top`)
3. Export GLB + KTX2-compressed textures (gltf-transform: `gltf-transform optimize in.glb out.glb --compress draco` or KTX2 for large scenes)
4. Drop in `packages/sim-3d/assets/`, log in this file §3 below
5. Budget: entire scene < 15 MB gz for first paint; hero kitchen GLB < 8 MB;
   fly LOD0 < 200 KB; food per-item < 300 KB

## 3. Asset log (append as you add — never delete rows)

| Date | Asset | File | Source URL | Author | License | Used in | Notes |
|---|---|---|---|---|---|---|---|
| (none yet — Phase 0 needs NO art) | | | | | | | |

## 4. Character (fly) design spec for custom build (if free models disappoint)

If free fly models don't hit the quality bar, custom-build ONE hero fly in
Blender (a focused 1–2 day job, better than settling):
- Body: tan/gold thorax with dark bristle stripes; abdomen with checkerboard
  tail (male darker tip); 6 legs, 2 wings (right only vibrates in courtship)
- Eyes: two big red compound eyes (slight emissive #a33) + 3 ocelli dots
- Scale: ~18 mm long rendered (5x real) with clean topology, LOD0 ≤ 3.5k tris
- Textures: procedural in Blender (spots/stripes via noise), bake to 1K map
- Reference: macro photos of D. melanogaster (red-eye, striped thorax is iconic)
- Export GLB with 2 materials max (body, wings) — instancing-friendly
