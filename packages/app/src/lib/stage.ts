/**
 * The Kitchen Stage — the photoreal diorama the fly lives in (docs 04 + 09 §4).
 *
 * Built from REAL assets, all CC0/CC-BY and credited in ASSET-MANIFEST.md:
 *   - Poly Haven `warm_restaurant` 2k HDRI  → image-based lighting + backdrop
 *   - ambientCG Wood095 / Marble012 1k PBR  → counter top + backsplash
 *   - poly.pizza food GLBs                  → banana bundle, strawberries
 *   - the flybody MuJoCo rig                → the fly (lib/fly-model.ts)
 *
 * Scale: the fly model is authored at MuJoCo's x2500 scale (0.30 units long),
 * so the stage uses millimetre-ish "diorama units" around it: the counter is
 * ~2.4 units deep, props are 0.03–0.12 units. Everything is photoreal-lit by
 * the HDRI; the directional key light adds warm shadows. No dynamics are
 * claimed for the environment — it is a stage, and the fly's only
 * model-driven motion is the proboscis (MN9_r) and optional wing flutter.
 */
import * as THREE from "three";
import { loadFoodProp, type FlyModel } from "@/lib/fly-model";

const BASE = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/assets`;

/** fly group scale: MuJoCo-authored rig (0.30 units ≈ 3 mm × 80) */
export const FLY_TO_STAGE_SCALE = 0.8;

export interface Stage {
  root: THREE.Group;
  /** dimmable rim/normal lights for brain↔stage cross-fades */
  setDim: (k: number) => void;
  dispose: () => void;
}

function pbrMat(
  mapFile: string,
  normalFile: string,
  roughFile: string | null,
  opts: { repeat: [number, number]; color?: number; metalness?: number; roughnessScale?: number },
): THREE.MeshStandardMaterial {
  const tex = (file: string, srgb: boolean) => {
    const t = new THREE.TextureLoader().load(`${BASE}/pbr/${mapFile.split("/")[0]}/${file}`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...opts.repeat);
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  // files share the ambientCG naming: <Set>_1K-JPG_<slot>.jpg
  const set = mapFile.split("/")[1].replace(/_[^_]+$/, ""); // e.g. Wood095_1K-JPG
  const m = new THREE.MeshStandardMaterial({
    color: opts.color ?? 0xffffff,
    map: tex(mapFile.split("/")[1], true),
    normalMap: tex(normalFile.split("/")[1], false),
    metalness: opts.metalness ?? 0.0,
  });
  if (roughFile) {
    m.roughnessMap = tex(roughFile.split("/")[1], false);
    m.roughness = opts.roughnessScale ?? 1.0;
  } else {
    m.roughness = 0.65;
  }
  void set;
  return m;
}

export async function buildStage(renderer: THREE.WebGLRenderer): Promise<Stage> {
  const root = new THREE.Group();
  root.name = "stage";
  const disposables: Array<{ dispose(): void }> = [];

  // ---- environment: warm restaurant HDRI (lighting + backdrop)
  // PMREM off the LIVE renderer - a second GL context fails on headless/
  // SwiftShader setups and would silently black the stage.
  const pmrem = new THREE.PMREMGenerator(renderer);
  // .hdr is Radiance format - needs RGBELoader (TextureLoader would throw)
  const { RGBELoader } = await import("three/examples/jsm/loaders/RGBELoader.js");
  const hdriTex = await new RGBELoader().loadAsync(`${BASE}/hdri/warm_restaurant_2k.hdr`);
  hdriTex.mapping = THREE.EquirectangularReflectionMapping;
  const envRT = pmrem.fromEquirectangular(hdriTex);
  // the canvas-level stage scene adopts these in SceneCanvas:
  //   scene.background = scene.environment = root.userData.envMap
  root.userData.envMap = envRT.texture;
  pmrem.dispose();
  hdriTex.dispose();
  disposables.push(envRT);

  // ---- counter: wood slab + marble backsplash
  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.09, 1.6),
    pbrMat("wood095/Wood095_1K-JPG_Color.jpg", "wood095/Wood095_1K-JPG_NormalGL.jpg", "wood095/Wood095_1K-JPG_Roughness.jpg", {
      repeat: [2.2, 1.4],
    }),
  );
  counter.name = "counter";
  counter.position.set(0, -0.045, 0);
  counter.receiveShadow = true;
  counter.castShadow = true;
  root.add(counter);

  const backsplash = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 1.1, 0.05),
    pbrMat("marble012/Marble012_1K-JPG_Color.jpg", "marble012/Marble012_1K-JPG_NormalGL.jpg", "marble012/Marble012_1K-JPG_Roughness.jpg", {
      repeat: [2.6, 1.1],
    }),
  );
  backsplash.name = "backsplash";
  backsplash.position.set(0, 0.5, -0.85);
  backsplash.receiveShadow = true;
  root.add(backsplash);

  // ---- warm key light + soft fill (HDRI does most of the lighting)
  const key = new THREE.DirectionalLight(0xffe0b0, 2.6);
  key.position.set(1.4, 2.2, 1.1);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 8;
  key.shadow.camera.left = -1.6;
  key.shadow.camera.right = 1.6;
  key.shadow.camera.top = 1.6;
  key.shadow.camera.bottom = -1.6;
  key.shadow.bias = -0.0004;
  key.shadow.radius = 4;
  root.add(key);
  root.add(new THREE.AmbientLight(0xfff2e0, 0.25));

  // ---- food props (CC-BY poly.pizza, see ASSET-MANIFEST)
  const props: THREE.Group[] = [];
  try {
    const bananas = await loadFoodProp("banana_bundle.glb", 0.0055, [-0.55, 0.0, -0.35]);
    bananas.rotation.y = -0.5;
    root.add(bananas);
    props.push(bananas);
  } catch { /* optional prop */ }
  try {
    const berries = await loadFoodProp("strawberries.glb", 0.42, [-0.34, 0.0, -0.12]);
    berries.rotation.y = 0.7;
    root.add(berries);
    props.push(berries);
  } catch { /* optional prop */ }

  // ---- the fly lands front-and-centre, facing +z (toward camera start)
  // (fly group added by SceneCanvas; we just publish the anchor)
  const anchor = new THREE.Object3D();
  anchor.name = "fly-anchor";
  anchor.position.set(0.08, 0, 0.16);
  anchor.rotation.y = -0.55;
  root.add(anchor);
  root.userData.flyAnchor = anchor;

  return {
    root,
    setDim(k: number) {
      key.intensity = 2.6 * k;
      root.traverse((c) => {
        const mesh = c as THREE.Mesh;
        if (mesh.isMesh) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mat && "opacity" in mat) {
            mat.transparent = k < 0.98;
            mat.opacity = k;
            mat.depthWrite = k > 0.5;
          }
        }
      });
      counter.visible = backsplash.visible = k > 0.02;
      for (const p of props) p.visible = k > 0.02;
    },
    dispose() {
      for (const d of disposables) d.dispose();
      root.traverse((c) => {
        const mesh = c as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry.dispose();
          const m = mesh.material as THREE.MeshStandardMaterial;
          if (m) m.dispose();
        }
      });
    },
  };
}

/** Placement for the fly on the stage (called by SceneCanvas in stage mode). */
export function placeFlyOnStage(fly: FlyModel, stage: Stage): void {
  fly.group.scale.setScalar(FLY_TO_STAGE_SCALE);
  const anchor = stage.root.userData.flyAnchor as THREE.Object3D;
  fly.group.position.copy(anchor.position);
  fly.group.rotation.set(0, 0, 0);
}
