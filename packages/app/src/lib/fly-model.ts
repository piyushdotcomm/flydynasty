/**
 * Real fly body v2 — the full Drosophila rig from the flybody MuJoCo model
 * (TuragaLab/flybody, Apache-2.0; Vaxenburg et al. 2024), baked by
 * scripts/pack-fly-meshes.py into one compact binary (fly-meshes.bin.gz,
 * 4.6 MB): welded vertices, MJCF body×geom transforms + default mesh scale
 * applied, ground-aligned, converted to three.js y-up.
 *
 * Runtime meshes (ranges in the pack):
 *   static (body+legs+halteres) | proboscis | wing L/R | antenna L/R
 *
 * MODEL-DRIVEN behavior API (honest labeling):
 *   - extendProboscis(level 0..1): rostrum→haustellum→labrum unfold. Driven
 *     by MN9_r spikes in the precomputed runs and the live what-if lab —
 *     proboscis extension on sugar GRN activation is the paper's behavioral
 *     readout (Shiu et al. 2024 Fig 1c). Pure kinematics of a real rig.
 *   - wingBuzz(level): visual garnish at arousal — wings do NOT beat in the
 *     model; the flag defaults off in replay mode.
 *   - tick(nowMs): gentle antenna/leg idle so the animal feels alive.
 */
import * as THREE from "three";

const BASE = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/assets/fly`;

/** part name → material code (must match scripts/pack-fly-meshes.py) */
const MAT_CODE = ["cuticle", "dark", "membrane", "eye"] as const;

export interface FlyModel {
  group: THREE.Group;
  /** MN9_r spike level 0..1 → proboscis extension (kinematic unfold) */
  extendProboscis: (level: number) => void;
  /** generic wing flutter 0..1 (visual garnish, honestly labeled) */
  wingBuzz: (level: number) => void;
  /** per-frame idle (antenna sweep, leg fidget); call from the render loop */
  tick: (nowMs: number) => void;
  dispose: () => void;
}

interface PackHeader {
  parts: Array<{ name: string; vStart: number; vCount: number; iStart: number; iCount: number; mat: number }>;
  V: number;
  I: number;
}

async function loadPack(): Promise<{ header: PackHeader; pos: Float32Array; nor: Float32Array; uv: Float32Array; col: Float32Array; idx: Uint32Array }> {
  const res = await fetch(`${BASE}/fly-meshes.bin.gz`);
  if (!res.ok) throw new Error(`fly-meshes.bin.gz: HTTP ${res.status}`);
  const ds = new DecompressionStream("gzip");
  const stream = res.body!.pipeThrough(ds);
  const buf = await new Response(stream).arrayBuffer();
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== 0x50594c46) throw new Error("fly-meshes: bad magic");
  const ver = dv.getUint16(4, true);
  if (ver !== 4) throw new Error(`fly-meshes: version ${ver} != 4`);
  const nParts = dv.getUint16(6, true);
  const V = dv.getUint32(8, true);
  const I = dv.getUint32(12, true);
  let off = 16;
  const parts: PackHeader["parts"] = [];
  for (let p = 0; p < nParts; p++) {
    const nameLen = dv.getUint16(off, true);
    off += 2;
    const name = new TextDecoder().decode(new Uint8Array(buf, off, nameLen));
    off += nameLen;
    const vStart = dv.getUint32(off, true);
    const vCount = dv.getUint32(off + 4, true);
    const iStart = dv.getUint32(off + 8, true);
    const iCount = dv.getUint32(off + 12, true);
    const mat = dv.getUint8(off + 16);
    off += 17;
    parts.push({ name, vStart, vCount, iStart, iCount, mat });
  }
  // v4 stride: 11 floats (pos3 + normal3 + uv2 + tint3). Slice (not view):
  // the 17-byte part records leave `off` unaligned for typed arrays.
  const STRIDE = 11;
  const f32 = new Float32Array(buf.slice(off, off + V * STRIDE * 4));
  const pos = new Float32Array(V * 3);
  const nor = new Float32Array(V * 3);
  const uv = new Float32Array(V * 2);
  const col = new Float32Array(V * 3);
  for (let i = 0; i < V; i++) {
    pos[i * 3] = f32[i * STRIDE];
    pos[i * 3 + 1] = f32[i * STRIDE + 1];
    pos[i * 3 + 2] = f32[i * STRIDE + 2];
    nor[i * 3] = f32[i * STRIDE + 3];
    nor[i * 3 + 1] = f32[i * STRIDE + 4];
    nor[i * 3 + 2] = f32[i * STRIDE + 5];
    uv[i * 2] = f32[i * STRIDE + 6];
    uv[i * 2 + 1] = f32[i * STRIDE + 7];
    col[i * 3] = f32[i * STRIDE + 8];
    col[i * 3 + 1] = f32[i * STRIDE + 9];
    col[i * 3 + 2] = f32[i * STRIDE + 10];
  }
  const idx = new Uint32Array(buf.slice(off + V * STRIDE * 4, off + V * STRIDE * 4 + I * 4));
  return { header: { parts, V, I }, pos, nor, uv, col, idx };
}

export async function buildFlyModel(): Promise<FlyModel> {
  const { header, pos, nor, uv, col, idx } = await loadPack();

  const group = new THREE.Group();
  group.name = "flybody-real";

  // Per-part anatomical tints are baked per-vertex (pack v4): dark head,
  // tan thorax, banded abdomen, dark antennae. Materials stay neutral so
  // the HDRI lighting does the photorealism; vertexColors modulate.
  const matCuticle = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.55,
    metalness: 0.08,
  });
  const matDark = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.5,
    metalness: 0.1,
  });
  const matMembrane = new THREE.MeshStandardMaterial({
    color: 0xd8cdb4,
    roughness: 0.35,
    metalness: 0.0,
    transparent: true,
    opacity: 0.42,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const matEye = new THREE.MeshStandardMaterial({ color: 0x8a1f1a, roughness: 0.3, metalness: 0.05 });
  const mats: Array<{ dispose(): void }> = [matCuticle, matDark, matMembrane, matEye];

  const byPart = new Map(header.parts.map((p) => [p.name, p]));

  const makeMesh = (partName: string): THREE.Mesh | null => {
    const part = byPart.get(partName);
    if (!part) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos.slice(part.vStart * 3, (part.vStart + part.vCount) * 3), 3));
    g.setAttribute("normal", new THREE.BufferAttribute(nor.slice(part.vStart * 3, (part.vStart + part.vCount) * 3), 3));
    g.setAttribute("uv", new THREE.BufferAttribute(uv.slice(part.vStart * 2, (part.vStart + part.vCount) * 2), 2));
    g.setAttribute("color", new THREE.BufferAttribute(col.slice(part.vStart * 3, (part.vStart + part.vCount) * 3), 3));
    g.setIndex(new THREE.BufferAttribute(idx.slice(part.iStart, part.iStart + part.iCount), 1));
    const code = part.mat;
    const mat = code === 2 ? matMembrane : code === 1 ? matDark : code === 3 ? matEye : matCuticle;
    const mesh = new THREE.Mesh(g, mat);
    mesh.name = `flybody:${partName}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  // ---- static body (thorax/head/abdomen/legs/halteres) — one draw call
  const staticMesh = makeMesh("static");
  if (staticMesh) group.add(staticMesh);

  // ---- animated chains: pivots chosen from the pack's baked world geometry
  // (each chain group sits at its pivot; child mesh vertices were baked in
  //  world space, so we translate the mesh by -pivot inside the group)
  const pivotFor = (partName: string): { group: THREE.Group; mesh: THREE.Mesh } | null => {
    const mesh = makeMesh(partName);
    if (!mesh) return null;
    mesh.geometry.computeBoundingBox();
    const bb = mesh.geometry.boundingBox!;
    // proboscis hinge: rear-top of the chain (under the head); wings: root
    const pivot =
      partName === "proboscis"
        ? new THREE.Vector3(0.045, 0.05, 0)
        : new THREE.Vector3((bb.min.x + bb.max.x) / 2, bb.max.y, (bb.min.z + bb.max.z) / 2);
    const g = new THREE.Group();
    g.position.copy(pivot);
    mesh.position.sub(pivot);
    g.add(mesh);
    return { group: g, mesh };
  };

  const prob = pivotFor("proboscis");
  if (prob) group.add(prob.group);

  const wingL = pivotFor("wing_left");
  const wingR = pivotFor("wing_right");
  if (wingL) group.add(wingL.group);
  if (wingR) group.add(wingR.group);

  const antL = pivotFor("antenna_left");
  const antR = pivotFor("antenna_right");
  if (antL) group.add(antL.group);
  if (antR) group.add(antR.group);

  // rest poses
  const rest = {
    probRotX: prob?.group.rotation.x ?? 0,
    probPosX: prob?.group.position.x ?? 0,
    probPosZ: prob?.group.position.z ?? 0,
    wingLZ: wingL?.group.rotation.z ?? 0,
    wingRZ: wingR?.group.rotation.z ?? 0,
    antLY: antL?.group.rotation.y ?? 0,
    antRY: antR?.group.rotation.y ?? 0,
  };
  let probLevel = 0;
  let buzz = 0;

  // ---- the fly faces +x in pack space (head at +x). We rotate the whole
  // group so it faces +z (toward the default camera), keeping feet on y=0.
  const FACING = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
  group.quaternion.copy(FACING);

  return {
    group,
    extendProboscis(level) {
      probLevel = Math.min(1, Math.max(0, level));
      if (!prob) return;
      // unfold: pitch the proboscis down-forward and slide it out slightly
      prob.group.rotation.x = rest.probRotX + probLevel * 0.9;
      prob.group.position.x = rest.probPosX + probLevel * 0.018;
      prob.group.position.z = rest.probPosZ;
    },
    wingBuzz(level) {
      buzz = Math.min(1, Math.max(0, level));
    },
    tick(nowMs) {
      const t = nowMs / 1000;
      if (buzz > 0.02 && wingL && wingR) {
        const a = Math.sin(t * 95) * 0.5 * buzz;
        wingL.group.rotation.z = rest.wingLZ + a;
        wingR.group.rotation.z = rest.wingRZ - a;
      } else if (wingL && wingR) {
        wingL.group.rotation.z += (rest.wingLZ - wingL.group.rotation.z) * 0.15;
        wingR.group.rotation.z += (rest.wingRZ - wingR.group.rotation.z) * 0.15;
      }
      if (antL && antR) {
        antL.group.rotation.y = rest.antLY + Math.sin(t * 0.9) * 0.18;
        antR.group.rotation.y = rest.antRY + Math.sin(t * 0.9 + 0.9) * 0.18;
      }
      // gentle breathing of the proboscis at rest (subtle life)
      if (prob) {
        const idle = probLevel < 0.02 ? Math.sin(t * 1.3) * 0.02 : 0;
        prob.group.rotation.x = rest.probRotX + probLevel * 0.9 + idle;
      }
    },
    dispose() {
      for (const m of mats) m.dispose();
      group.traverse((c) => {
        const mesh = c as THREE.Mesh;
        if (mesh.isMesh) mesh.geometry.dispose();
      });
    },
  };
}

// ---------------------------------------------------------------- food props

export interface FoodProp {
  group: THREE.Group;
  dispose: () => void;
}

/** Load one poly.pizza food GLB (CC-BY; credited in ASSET-MANIFEST.md). */
export async function loadFoodProp(file: string, scale: number, pos: [number, number, number]): Promise<THREE.Group> {
  const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
  const gltf = await new GLTFLoader().loadAsync(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/assets/food/${file}`);
  const g = gltf.scene;
  g.scale.setScalar(scale);
  g.position.set(...pos);
  g.traverse((c: THREE.Object3D) => {
    const m = c as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  return g;
}
