import * as THREE from "three";
import { loadNeurons, loadGraphMeta, type GraphMeta } from "@/lib/data";

/**
 * Builds the real neuron point cloud: all 139,248 FlyWire neurons at their
 * annotated soma coordinates (FAFB14 nm). Colour = super-class. Coordinates
 * are centred on the annotated centroid and mapped y-up; they are NOT warped
 * into an atlas template (graph-meta.json records the coordinate space).
 */
export const SUPER_CLASS_COLORS: Record<string, string> = {
  optic: "#60a5fa",
  central_brain: "#f59e0b",
  ventral_nerve_cord: "#34d399",
  olfactory: "#a78bfa",
  mechanosensory: "#f472b6",
  thermosensory: "#fbbf24",
  visual: "#38bdf8",
};

export function superColor(sup: string): string {
  const key = sup.toLowerCase().replace(/[\s-]+/g, "_");
  return SUPER_CLASS_COLORS[key] ?? (sup === "unknown" ? "#3f3f46" : "#e5e7eb");
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return h;
}

const FALLBACK = [
  "#f59e0b", "#60a5fa", "#34d399", "#f472b6", "#a78bfa",
  "#fbbf24", "#4ade80", "#38bdf8", "#fb7185", "#c084fc",
];

export interface BrainPoints {
  meta: GraphMeta;
  points: THREE.Points;
  dispose: () => void;
}

export async function buildBrainPoints(): Promise<BrainPoints> {
  const meta = await loadGraphMeta();
  const { n, positions, labels } = await loadNeurons();
  const c = meta.positions.centroid;

  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    // FlyWire: x = left-right, y = anterior-posterior, z = dorsal-ventral.
    // three.js is y-up, so visual up = FlyWire z.
    arr[i * 3] = positions[i * 3] - c[0];
    arr[i * 3 + 1] = positions[i * 3 + 2] - c[2];
    arr[i * 3 + 2] = positions[i * 3 + 1] - c[1];
  }

  const supList = meta.labels.sup ?? [];
  const supIdx = labels[3]; // field order: type, cls, sub, sup, nt
  const colors = new Float32Array(n * 3);
  const col = new THREE.Color();
  const paletteCache = new Map<string, THREE.Color>();
  for (let i = 0; i < n; i++) {
    const s = supList[supIdx[i]] ?? "unknown";
    let pc = paletteCache.get(s);
    if (!pc) {
      const named = superColor(s);
      pc = new THREE.Color(
        named !== "#e5e7eb" ? named : FALLBACK[Math.abs(hash(s)) % FALLBACK.length],
      );
      paletteCache.set(s, pc);
    }
    colors[i * 3] = pc.r;
    colors[i * 3 + 1] = pc.g;
    colors[i * 3 + 2] = pc.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 1600,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
  });
  const points = new THREE.Points(geo, mat);
  return {
    meta,
    points,
    dispose: () => {
      geo.dispose();
      mat.dispose();
    },
  };
}