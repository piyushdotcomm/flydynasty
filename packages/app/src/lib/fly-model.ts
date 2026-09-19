/**
 * Real fly body — photogrammetry-grade Drosophila meshes from the flybody
 * MuJoCo model (TuragaLab/flybody, Apache-2.0; Vaxenburg et al. 2024,
 * bioRxiv 2024.03.11.584515). See packages/app/public/assets/ASSET-MANIFEST.md
 * (moved next to the app so the static export serves it).
 *
 * Parts present in public/assets/fly are assembled with the world transforms
 * parsed from the model's own fruitfly.xml (.work/flybody/fly-rig.json
 * pipeline: scripts/parse-fly-rig.mjs), so part placement is the published
 * rig's placement, not a guess. MJCF is z-up and the sim fly faces +y
 * (anterior +y per fruitfly.xml); three.js here is y-up, so we rotate
 * z-up -> y-up the same way the brain point cloud does (visual up = -y_mjcf…
 * concretely: x stays lateral, mjcf-y (anterior) becomes -z, mjcf-z (dorsal)
 * becomes +y).
 */
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

/** MJCF world poses for the parts we ship (from .work/flybody/fly-rig.json). */
export interface RigBody {
  name: string;
  worldPos: [number, number, number];
  worldQuat: [number, number, number, number]; // MJCF wxyz
  meshFiles: string[];
}

const BASE = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/assets/fly`;

/**
 * The subset of flybody meshes committed under public/assets/fly, mapped to
 * their MJCF body names (fruitfly.xml). head_red is the higher-detail head
 * variant; we use it and skip head_body to avoid double-drawing.
 */
export const FLY_PARTS: Array<{ body: string; file: string }> = [
  { body: "thorax", file: "thorax_body.obj" },
  { body: "head", file: "head_body.obj" },
  { body: "abdomen", file: "abdomen_1_body.obj" },
  { body: "wing_left", file: "wing_left_membrane.obj" },
  { body: "wing_right", file: "wing_right_membrane.obj" },
  { body: "haltere_left", file: "haltere_left_body.obj" },
  { body: "haltere_right", file: "haltere_right_body.obj" },
];

function quatToMatrix(q: [number, number, number, number]): THREE.Matrix4 {
  // MJCF quaternion order wxyz -> three.js setFromAxisAngle-friendly compose
  const m = new THREE.Matrix4();
  const [w, x, y, z] = q;
  m.makeRotationFromQuaternion(new THREE.Quaternion(x, y, z, w));
  return m;
}

/** MJCF world pose -> three.js world transform (z-up to y-up swap). */
function mjcfToWorld(pos: [number, number, number], quat: [number, number, number, number]): THREE.Matrix4 {
  const rot = quatToMatrix(quat);
  // axes remap R: mjcf(x,y,z) -> three(x, z, -y)  (z-up to y-up, anterior -z)
  const remap = new THREE.Matrix4().set(
    1, 0, 0, 0,
    0, 0, 1, 0,
    0, -1, 0, 0,
    0, 0, 0, 1,
  );
  const m = new THREE.Matrix4().multiplyMatrices(remap, rot);
  m.setPosition(
    pos[0],
    pos[2],
    -pos[1],
  );
  return m;
}

/**
 * The OBJ vertex data is in MuJoCo geom space: millimetre-scale offsets
 * (e.g. thorax spans x −0.6..0.5, z 0.7..1.7) relative to each body frame,
 * scaled 1000x vs the MJCF metre poses. Mesh vertices are pre-multiplied by
 * 0.001 so the published metre-scale world transforms place them correctly
 * (verified against obj-stats.mjs bounding boxes).
 */
const MESH_SCALE = 0.001;

export interface FlyModel {
  group: THREE.Group;
  dispose: () => void;
}

/**
 * Build the assembled real fly. Returns a group with one mesh per part,
 * transformed by its published world pose. Scale 1:1 (metres — the fly is
 * ~2.5 mm long; scenes scale the group as needed).
 */
export async function buildFlyModel(): Promise<FlyModel> {
  const group = new THREE.Group();
  group.name = "flybody-real";

  // Real MJCF world poses for these bodies — verbatim from the parsed rig
  // (scripts/parse-fly-rig.mjs over fruitfly.xml; .work/flybody/fly-rig.json).
  const poses: Record<string, { pos: [number, number, number]; quat: [number, number, number, number] }> = {
    thorax: { pos: [0, 0, 0], quat: [1, 0, 0, 0] },
    head: { pos: [0.0567, 0, -0.00305], quat: [0.702, -0.087, 0.087, -0.702] },
    abdomen: { pos: [-0.0447, -0.00056, 0.00428], quat: [-0.704, -0.0859, -0.0853, -0.7] },
    wing_left: { pos: [-0.00694, 0.0432, 0.0091], quat: [0, -0.403, 0, -0.915] },
    wing_right: { pos: [-0.00694, -0.0432, 0.0091], quat: [0, 0.915, 0, -0.403] },
    haltere_left: { pos: [-0.0386, 0.0247, -0.00866], quat: [0.291, -0.204, 0.826, 0.439] },
    haltere_right: { pos: [-0.0386, -0.0247, -0.00866], quat: [-0.438, -0.829, 0.206, -0.28] },
  };

  const mat = new THREE.MeshStandardMaterial({
    color: 0xc8a06a,
    roughness: 0.62,
    metalness: 0.05,
    side: THREE.DoubleSide, // wing membranes are single-sided surfaces
  });
  const matWing = new THREE.MeshStandardMaterial({
    color: 0xd8cdb4,
    roughness: 0.35,
    metalness: 0.0,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const matDark = new THREE.MeshStandardMaterial({
    color: 0x3a2c20,
    roughness: 0.5,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });

  const loader = new OBJLoader();
  const meshes: THREE.Mesh[] = [];

  for (const part of FLY_PARTS) {
    const res = await fetch(`${BASE}/${part.file}`);
    if (!res.ok) continue; // a missing optional part must not break the viewer
    const text = await res.text();
    const obj = loader.parse(text);
    const pose = poses[part.body];
    if (!pose) continue;
    const m = mjcfToWorld(pose.pos, pose.quat);
    obj.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.material = part.file.includes("wing") ? matWing : mat;
        mesh.scale.setScalar(MESH_SCALE);
        mesh.applyMatrix4(m);
        mesh.name = `flybody:${part.body}`;
        meshes.push(mesh);
        group.add(mesh);
      }
    });
  }

  // dev/verification side-channel: how many parts actually loaded
  if (typeof window !== "undefined") {
    (window as unknown as { __flyParts?: number }).__flyParts = meshes.length;
  }

  return {
    group,
    dispose: () => {
      for (const mesh of meshes) {
        mesh.geometry.dispose();
      }
      mat.dispose();
      matWing.dispose();
      matDark.dispose();
    },
  };
}
