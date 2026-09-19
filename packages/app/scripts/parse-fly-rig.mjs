/**
 * parse-fly-rig.mjs — parses the flybody MuJoCo model (fruitfly.xml, Apache-2.0,
 * Vaxenburg et al. 2024, TuragaLab/flybody) into a JSON rig: every body's world
 * transform (position + quaternion, MJCF wxyz), its mesh file(s), and every
 * joint (type/pos/axis/range) so the app animates the REAL joint axes instead
 * of guessing. Also emits the list of OBJ files that must be downloaded.
 *
 * Usage: node scripts/parse-fly-rig.mjs <path-to-fruitfly.xml> <out-rig.json>
 */
import { readFileSync, writeFileSync } from "node:fs";

const [, , xmlPath, outPath] = process.argv;
const xml = readFileSync(xmlPath, "utf8");

// --- tokenize MuJoCo XML: track <body> nesting to build the parent map ------
const tagRe = /<(\/?)(body|joint|geom|mesh)\b([^>]*)>/g;
const attr = (s, name) => {
  const m = s.match(new RegExp(name + '="([^"]*)"'));
  return m ? m[1] : undefined;
};
const vec = (s) => (s === undefined ? null : s.trim().split(/\s+/).map(Number));

const bodies = [];
const stack = [];
const meshAssets = new Map(); // mesh asset name -> file

let m;
while ((m = tagRe.exec(xml)) !== null) {
  const close = m[1] === "/";
  const tag = m[2];
  const rest = m[3];
  if (tag === "body") {
    if (close) { stack.pop(); continue; }
    const rec = {
      name: attr(rest, "name") ?? ("body" + bodies.length),
      parent: stack.length ? stack[stack.length - 1].name : null,
      pos: vec(attr(rest, "pos")) || [0, 0, 0],
      quat: vec(attr(rest, "quat")) || [1, 0, 0, 0],
      meshes: [], joints: [],
    };
    bodies.push(rec);
    stack.push(rec);
  } else if (tag === "joint" && !close) {
    const top = stack[stack.length - 1];
    if (!top) continue;
    top.joints.push({
      name: attr(rest, "name") ?? "",
      type: attr(rest, "type") ?? "hinge",
      pos: vec(attr(rest, "pos")) || [0, 0, 0],
      axis: vec(attr(rest, "axis")) || [0, 0, 1],
      range: vec(attr(rest, "range")),
    });
  } else if (tag === "geom" && !close) {
    const top = stack[stack.length - 1];
    if (!top) continue;
    const meshName = attr(rest, "mesh");
    if (meshName) top.meshes.push(meshName);
  } else if (tag === "mesh" && !close) {
    const name = attr(rest, "name");
    const file = attr(rest, "file");
    if (name) meshAssets.set(name, (file || name + ".obj").replace(/\.stl$/i, ".obj"));
  }
}

// --- forward kinematics: world pos + quat per body ---------------------------
function quatMul(a, b) {
  const aw = a[0], ax = a[1], ay = a[2], az = a[3];
  const bw = b[0], bx = b[1], by = b[2], bz = b[3];
  return [
    aw * bw - ax * bx - ay * by - az * bz,
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
  ];
}
function quatRotate(q, v) {
  const w = q[0], x = q[1], y = q[2], z = q[3];
  const vx = v[0], vy = v[1], vz = v[2];
  const tx = 2 * (y * vz - z * vy);
  const ty = 2 * (z * vx - x * vz);
  const tz = 2 * (x * vy - y * vx);
  return [
    vx + w * tx + (y * tz - z * ty),
    vy + w * ty + (z * tx - x * tz),
    vz + w * tz + (x * ty - y * tx),
  ];
}

const world = new Map();
for (const b of bodies) {
  const parent = b.parent ? world.get(b.parent) : null;
  const parentQuat = parent ? parent.worldQuat : [1, 0, 0, 0];
  const parentPos = parent ? parent.worldPos : [0, 0, 0];
  const worldQuat = parent ? quatMul(parentQuat, b.quat) : b.quat;
  const rotated = quatRotate(parentQuat, b.pos);
  world.set(b.name, {
    name: b.name,
    parent: b.parent,
    localPos: b.pos,
    localQuat: b.quat,
    worldPos: [
      parentPos[0] + rotated[0],
      parentPos[1] + rotated[1],
      parentPos[2] + rotated[2],
    ],
    worldQuat,
    meshFiles: b.meshes.map((mn) => meshAssets.get(mn) ?? mn).filter(Boolean),
    joints: b.joints,
  });
}

const allFiles = [...new Set([...world.values()].flatMap((b) => b.meshFiles))].sort();
const withJoints = [...world.values()].filter((b) => b.joints.length > 0).length;
const rig = {
  source: "TuragaLab/flybody fruitfly.xml (Apache-2.0), Vaxenburg et al. 2024 bioRxiv 2024.03.11.584515",
  units: "meters (MJCF)",
  bodies: [...world.values()],
};
writeFileSync(outPath, JSON.stringify(rig, null, 1));
console.log("bodies: " + bodies.length + ", with joints: " + withJoints + ", mesh assets: " + meshAssets.size);
console.log("mesh files referenced (" + allFiles.length + "):");
console.log(allFiles.join("\n"));
