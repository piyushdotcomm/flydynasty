# Real Fly Lab — Asset Manifest

Downloaded: 2026-09-15 | All files verified: size > 0 + correct magic bytes (glTF magic / PK zip / #?RADIANCE hdr / OBJ header / PNG signature / generated-by-VFB OBJ).

---

## FLY MODELS (`fly/`)

### Realistic fly body — flybody (RECOMMENDED for photoreal exhibit)
Photogrammetry-grade adult *Drosophila melanogaster* body meshes from the **flybody** MuJoCo model (Vaxenburg et al. 2024, https://doi.org/10.1101/2024.03.11.584515). Repo: https://github.com/TuragaLab/flybody (Apache-2.0). Direct raw URLs: `https://raw.githubusercontent.com/TuragaLab/flybody/main/flybody/fruitfly/assets/<file>`.

| File | Size | Source | License | Status | Quality |
|---|---|---|---|---|---|
| head_body.obj | 6.2 MB | raw.githubusercontent.com/TuragaLab/flybody/main/flybody/fruitfly/assets/head_body.obj | Apache-2.0 | downloaded | ★★★★★ real anatomy |
| head_red.obj | 31.1 MB | .../head_red.obj | Apache-2.0 | downloaded | ★★★★★ high-detail variant |
| thorax_body.obj | 9.4 MB | .../thorax_body.obj | Apache-2.0 | downloaded | ★★★★★ real anatomy |
| abdomen_1_body.obj | 0.8 MB | .../abdomen_1_body.obj | Apache-2.0 | downloaded | ★★★★★ real anatomy (8 abdomen segments available) |
| wing_left_membrane.obj / wing_right_membrane.obj | 0.2 MB ea | .../wing_{left,right}_membrane.obj | Apache-2.0 | downloaded | ★★★★★ translucent wing membranes |
| haltere_left_body.obj / haltere_right_body.obj | 0.65 MB ea | .../haltere_{left,right}_body.obj | Apache-2.0 | downloaded | ★★★★★ real halteres |
| flybody_texture.png | 0.8 MB | raw.githubusercontent.com/TuragaLab/flybody/main/fly-white.png | Apache-2.0 | downloaded | ★★★★★ body texture (repo root) |

Notes: `fruitfly.xml` (65 KB, same assets dir) contains MuJoCo geometry+pose data — useful for assembling/correctly positioning parts. Remaining segment OBJs (abdomen 2–8, legs, antennae, proboscis) available at same URL pattern — see repo tree.

### Stylized fallbacks — Poly Pizza (CC-BY 3.0, direct GLB)
| File | Size | Source | Author | License | Status | Quality |
|---|---|---|---|---|---|---|
| fly_jeremy.glb | 30 KB | https://poly.pizza/m/f8kM9xA_5sV (static.poly.pizza/fa8bb370-000d-4d94-8ca9-84a0df65cdba.glb) | jeremy | CC-BY 3.0 | downloaded | ★★★ stylized low-poly housefly |
| fly_poly_google.glb | 47 KB | https://poly.pizza/m/c7w1u4mSnXZ (static.poly.pizza/afd2f2cd-8a36-49e4-9d18-5bb7dd657e8d.glb) | Poly by Google | CC-BY 3.0 | downloaded | ★★★ stylized |
| fly_kohyzazi.glb | 85 KB | https://poly.pizza/m/kCLW4c0kGx (static.poly.pizza/2eeae94c-7eae-452a-b0ea-838a37863498.glb) | Kohyzazi | CC-BY 3.0 | downloaded | ★★★ stylized |
| wasp.glb | 431 KB | https://poly.pizza/m/3aQgc75sUR (static.poly.pizza/71cadefd-8e65-423a-9a95-3cdf7e012586.glb) | (Poly Pizza) | CC-BY 3.0 | downloaded | ★★★ wasp body — visually close to fly |

### FLY MODEL VERDICT
**Best realistic option: flybody (TuragaLab/flybody)** — real scanned *Drosophila* anatomy, Apache-2.0, direct raw GitHub downloads, and it is the very model Virtual Fly Brain uses as its own hero render ("Hero body model from flybody, Apache-2.0"). All core parts downloaded. The Three.js loader can import OBJs directly, or parts can be assembled/converted to GLB using the bundled `fruitfly.xml` poses (blender_model/drosophila.blend also in repo, 20 MB, MANUAL-NEEDED if wanted).

---

## HDRI (`hdri/`)

| File | Size | Source | Author | License | Status | Quality |
|---|---|---|---|---|---|---|
| warm_restaurant_4k.hdr | 25.5 MB | https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/4k/warm_restaurant_4k.hdr | Poly Haven | CC0 | downloaded (MD5 verified 61d44615da982bb70ca36a710bc4966e) | ★★★★★ warm interior, kitchen-adjacent |
| wooden_lounge_4k.hdr | 25.2 MB | https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/4k/wooden_lounge_4k.hdr | Poly Haven | CC0 | downloaded (MD5 verified 34784f3d0c88c56a319bdfd66f0b072d) | ★★★★★ warm wood interior |

Pre-existing (verify before use): brown_photostudio_02_4k.hdr (25.4 MB), sunflowers_4k.hdr (26.6 MB) — Poly Haven CC0.

---

## PBR TEXTURES — kitchen (`kitchen/`)

All from ambientCG (CC0). Direct pattern: `https://ambientcg.com/get?file=<AssetID>_<res>-<fmt>.zip`.

| File | Size | Asset | Purpose | Status | Quality |
|---|---|---|---|---|---|
| Wood095_1K-JPG.zip | 3.9 MB | https://ambientcg.com/a/Wood095 | wood counter (clean modern wood) | downloaded | ★★★★★ |
| Marble012_1K-JPG.zip | 4.7 MB | https://ambientcg.com/a/Marble012 | marble counter | downloaded | ★★★★★ |
| Metal009_1K-JPG.zip | 4.8 MB | https://ambientcg.com/a/Metal009 | brushed steel appliances | downloaded | ★★★★★ |
| Tiles141_1K-JPG.zip | 5.0 MB | https://ambientcg.com/a/Tiles141 | white kitchen/bath backsplash tiles | downloaded | ★★★★★ |

Each zip contains Color/Displacement/Normal/Metalness/Roughness JPGs + USD preview (verified by listing). ambientCG "Kitchen" collection has 116 assets: https://ambientcg.com/list?type=material&collection=Kitchen — more available on demand.

---

## FOOD (`food/`)

Poly Pizza GLBs (direct static.poly.pizza URLs above each; all CC-BY 3.0).

| File | Size | Source | Status | Quality |
|---|---|---|---|---|
| banana.glb | 7 KB | poly.pizza/m/ahOO6wz8sV0 (static.poly.pizza/10e92ada-...glb) | downloaded | ★★★ |
| banana_bundle.glb | 27 KB | poly.pizza/m/1ySgHdwK0q | downloaded | ★★★ |
| strawberry.glb | 17 KB | poly.pizza/m/4W3g1NixX1K | downloaded | ★★★ |
| strawberries.glb | 212 KB | poly.pizza/m/5n1vYWflaFt | downloaded | ★★★★ cluster, more detail |

Pre-existing: kenney_food-kit.zip (4.6 MB, Kenney CC0 food pack) — fallback/stylized options.

---

## BRAIN (`brain/`)

| File | Size | Source | Author/License | Status | Quality |
|---|---|---|---|---|---|
| JRC2018U_brain_template.obj | 7.2 MB | https://virtualflybrain.org/data/VFB/i/0010/1567/VFB_00101567/volume.obj | JRC/VFB (Bogovic et al. 2020); Janelia open-science template | downloaded | ★★★★★ REAL adult Drosophila brain (JRC2018Unisex standard template) |
| JRC2018U_VNC_template.obj | 15.4 MB | https://virtualflybrain.org/data/VFB/i/0020/0000/VFB_00200000/volume.obj | VFB/JRC | downloaded | ★★★★★ REAL ventral nerve cord (JRC2018Unisex VNC) |

**BRAIN MESH STATUS: SOLVED — real anatomy acquired.** Direct OBJ downloads from virtualflybrain.org work (no auth). Brain + VNC downloaded from VFB's JRC2018Unisex templates — the current standard adult atlas. Alternative sources documented: Janelia open-science JRC-2018 templates (janelia.org/open-science/jrc-2018-brain-templates), FlyEM (janelia-flyem GitHub), VFB painted-neuropil OBJs at `https://virtualflybrain.org/data/VFB/i/0010/xxxx/ID/volume.obj` per Term Info page.

---

## MANUAL-ACTION LIST

Nothing blocking. Optional extras:
1. **flybody .blend** (20 MB): https://github.com/TuragaLab/flybody/raw/main/flybody/fruitfly/assets/blender_model/drosophila.blend — assembled rigged fly, useful if OBJ assembly becomes painful.
2. **More flybody parts** (abdomen 2–8, legs, antennae): same raw URL pattern as above.
3. **More ambientCG kitchen textures**: https://ambientcg.com/list?type=material&collection=Kitchen
4. **More painted neuropil meshes from VFB**: pick any region from https://virtualflybrain.org/docs/data/templates/ and use the volume.obj pattern.
