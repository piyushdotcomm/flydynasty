/**
 * obj-stats.mjs — prints vertex count / face count / AABB bounds for an OBJ.
 * Usage: node scripts/obj-stats.mjs <file.obj> [more.obj ...]
 */
import { readFileSync } from "node:fs";

for (const path of process.argv.slice(2)) {
  const lines = readFileSync(path, "latin1").split(/\r?\n/);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let nv = 0, nf = 0;
  for (const line of lines) {
    if (line.charCodeAt(0) === 118 && line.charCodeAt(1) === 32) { // "v "
      const p = line.slice(2).trim().split(/\s+/).map(Number);
      nv++;
      for (let i = 0; i < 3; i++) {
        if (p[i] < min[i]) min[i] = p[i];
        if (p[i] > max[i]) max[i] = p[i];
      }
    } else if (line.charCodeAt(0) === 102) { // "f"
      nf++;
    }
  }
  const ext = max.map((v, i) => (v - min[i]).toFixed(1)).join(" x ");
  console.log(
    path.split(/[\\/]/).pop() +
      ": verts=" + nv + " faces=" + nf +
      " min=[" + min.map((v) => v.toFixed(1)).join(",") + "]" +
      " max=[" + max.map((v) => v.toFixed(1)).join(",") + "]" +
      " extents=" + ext,
  );
}
