"""
pack-fly-meshes.py — bake the flybody MuJoCo rig (fruitfly.xml) into one
compact binary the browser can load: fly-meshes.bin.gz.

v4: per-vertex tint + per-vertex UV. The runtime binds flybody_texture.png;
if the texture is absent the tint column gives every body part its real
anatomical color (dark head/antennae, tan thorax, banded abdomen).

Output layout (little-endian, after gunzip):
  u32 magic 'FLYP' | u16 ver=4 | u16 nParts | u32 V | u32 I
  parts: nParts * { u16 nameLen, utf8 name, u32 vStart, u32 vCount,
                    u32 iStart, u32 iCount, u8 mat }
  vertices: V * 11 float32 (x, y, z, nx, ny, nz, u, v, r, g, b)
  indices:  I * uint32

Run:  python scripts/pack-fly-meshes.py
"""

import gzip
import json
import os
import re
import struct
import sys
import xml.etree.ElementTree as ET

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
XML_PATH = os.environ.get(
    "FLY_XML", "E:/fruitfly/.work/flybody/fruitfly.xml"
)
ASSET_DIR = os.path.join(ROOT, "assets-src/fly")
OUT_PATH = os.path.join(ROOT, "packages/app/public/assets/fly/fly-meshes.bin.gz")

tree = ET.parse(XML_PATH)
mjcf = tree.getroot()

default_mesh_scale = (0.1, 0.1, 0.1)
for el in mjcf.iter("mesh"):
    if "scale" in el.attrib and "file" not in el.attrib and "name" not in el.attrib:
        default_mesh_scale = tuple(float(v) for v in el.attrib["scale"].split())
        break

mesh_assets = {}
for el in mjcf.iter("mesh"):
    if "file" in el.attrib:
        name = el.attrib.get("name") or os.path.splitext(el.attrib["file"])[0]
        scale = (
            tuple(float(v) for v in el.attrib["scale"].split())
            if "scale" in el.attrib
            else default_mesh_scale
        )
        mesh_assets[name] = (el.attrib["file"], scale)


def parse_vec(s, n=3):
    return [float(v) for v in s.split()][:n]


def quat_from_axisangle(x, y, z, a):
    n = (x * x + y * y + z * z) ** 0.5 or 1.0
    x, y, z = x / n, y / n, z / n
    s = np.sin(a / 2)
    return [float(np.cos(a / 2)), x * s, y * s, z * s]


def euler_to_quat(rx, ry, rz):
    cx, sx, cy, sy, cz, sz = np.cos(rx/2), np.sin(rx/2), np.cos(ry/2), np.sin(ry/2), np.cos(rz/2), np.sin(rz/2)
    w = cx * cy * cz - sx * sy * sz
    x = sx * cy * cz - cx * sy * sz
    y = cx * sy * cz + sx * cy * sz
    z = cx * cy * sz + sx * sy * cz
    return [float(w), float(x), float(y), float(z)]


def quat_mul(a, b):
    aw, ax, ay, az = a
    bw, bx, by, bz = b
    return [
        aw * bw - ax * bx - ay * by - az * bz,
        aw * bx + ax * bw + ay * bz - az * by,
        aw * by - ax * bz + ay * bw + az * bx,
        aw * bz + ax * by - ay * bx + az * bw,
    ]


def quat_to_mat(q):
    w, x, y, z = q
    return np.array([
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
    ])


def el_quat(el):
    if "quat" in el.attrib:
        return [float(v) for v in el.attrib["quat"].split()]
    if "euler" in el.attrib:
        return euler_to_quat(*parse_vec(el.attrib["euler"]))
    if "axisangle" in el.attrib:
        x, y, z, a = parse_vec(el.attrib["axisangle"], 4)
        return quat_from_axisangle(x, y, z, a)
    return [1.0, 0.0, 0.0, 0.0]


def el_pose(el):
    pos = parse_vec(el.attrib["pos"]) if "pos" in el.attrib else [0.0, 0.0, 0.0]
    return pos, el_quat(el)


bodies = {}


def collect_geoms(body_el, body_rec):
    for geom in body_el.findall("geom"):
        mesh_name = geom.attrib.get("mesh")
        if not mesh_name:
            continue
        gp, gq = el_pose(geom)
        mat = geom.attrib.get("material", "")
        body_rec["geoms"].append((mesh_name, gp, gq, mat))


def walk2(el, ppos, pquat):
    for child in el.findall("body"):
        name = child.attrib["name"]
        lp, lq = el_pose(child)
        wq = quat_mul(pquat, lq)
        wp = np.array(ppos) + quat_to_mat(pquat) @ np.array(lp)
        rec = {"pos": wp, "quat": wq, "geoms": []}
        bodies[name] = rec
        collect_geoms(child, rec)
        walk2(child, wp, wq)


walk2(mjcf.find("worldbody"), np.zeros(3), [1.0, 0.0, 0.0, 0.0])
print(f"parsed {len(bodies)} bodies")

SKIP_MESHES = re.compile(r"_ocelli$|_bristle|_lower$|claw|_red$")

# ---------------- anatomical tint palette (sRGB 0..1) per body part -------
TINTS = {
    "thorax":        (0.62, 0.47, 0.30),
    "head":          (0.42, 0.30, 0.20),
    "abdomen":       (0.55, 0.40, 0.28),
    "abdomen_2":     (0.34, 0.24, 0.17),
    "abdomen_3":     (0.58, 0.43, 0.30),
    "abdomen_4":     (0.34, 0.24, 0.17),
    "abdomen_5":     (0.58, 0.43, 0.30),
    "abdomen_6":     (0.34, 0.24, 0.17),
    "abdomen_7":     (0.50, 0.37, 0.27),
    "rostrum":       (0.45, 0.33, 0.23),
    "haustellum":    (0.40, 0.29, 0.20),
    "labrum_left":   (0.35, 0.25, 0.18),
    "labrum_right":  (0.35, 0.25, 0.18),
    "antenna_left":  (0.30, 0.22, 0.16),
    "antenna_right": (0.30, 0.22, 0.16),
    "wing_left":     (0.82, 0.78, 0.68),
    "wing_right":    (0.82, 0.78, 0.68),
    "haltere_left":  (0.70, 0.66, 0.58),
    "haltere_right": (0.70, 0.66, 0.58),
}
LEG_TINT = (0.48, 0.36, 0.25)
DEFAULT_TINT = (0.52, 0.38, 0.27)

# geoms whose material is 'black' (chitin bristles etc.) render darker
BLACK_MULT = 0.45

GROUPS = {
    "static": (
        ["thorax", "head", "abdomen", "abdomen_2", "abdomen_3", "abdomen_4",
         "abdomen_5", "abdomen_6", "abdomen_7"],
        ["coxa_T1_left", "femur_T1_left", "tibia_T1_left", "tarsus_T1_left",
         "coxa_T1_right", "femur_T1_right", "tibia_T1_right", "tarsus_T1_right",
         "coxa_T2_left", "femur_T2_left", "tibia_T2_left", "tarsus_T2_left",
         "coxa_T2_right", "femur_T2_right", "tibia_T2_right", "tarsus_T2_right",
         "coxa_T3_left", "femur_T3_left", "tibia_T3_left", "tarsus_T3_left",
         "coxa_T3_right", "femur_T3_right", "tibia_T3_right", "tarsus_T3_right",
         "haltere_left", "haltere_right"],
    ),
    "proboscis": ["rostrum", "haustellum", "labrum_left", "labrum_right"],
    "wing_left": ["wing_left"],
    "wing_right": ["wing_right"],
    "antenna_left": ["antenna_left"],
    "antenna_right": ["antenna_right"],
}
GROUPS["static"] = GROUPS["static"][0] + GROUPS["static"][1]


def tint_for(body_name, material):
    base = TINTS.get(body_name)
    if base is None:
        if re.match(r"^(coxa|femur|tibia|tarsus)_T\d_", body_name):
            base = LEG_TINT
        else:
            base = DEFAULT_TINT
    if material == "black":
        base = tuple(c * BLACK_MULT for c in base)
    return base


obj_cache = {}


def load_obj(file):
    if file in obj_cache:
        return obj_cache[file]
    vs, vns, vts, faces = [], [], [], []
    with open(os.path.join(ASSET_DIR, file), "r") as fh:
        for line in fh:
            if line.startswith("v "):
                s = line.split()
                vs.append((float(s[1]), float(s[2]), float(s[3])))
            elif line.startswith("vn "):
                s = line.split()
                vns.append((float(s[1]), float(s[2]), float(s[3])))
            elif line.startswith("vt "):
                s = line.split()
                vts.append((float(s[1]), float(s[2])))
            elif line.startswith("f "):
                faces.append(line.split()[1:])
    obj_cache[file] = (vs, vns, vts, faces)
    return vs, vns, vts, faces


groups_out = {}
total_v = total_i = 0
warn = []

for gname, body_names in GROUPS.items():
    verts = []
    idxs = []
    for bname in body_names:
        rec = bodies.get(bname)
        if rec is None:
            warn.append(f"body {bname} not in XML")
            continue
        B = quat_to_mat(rec["quat"])
        bp = rec["pos"]
        for mesh_name, gp, gq, material in rec["geoms"]:
            if mesh_name not in mesh_assets:
                warn.append(f"asset {mesh_name} missing")
                continue
            if SKIP_MESHES.search(mesh_name):
                continue
            file, mscale = mesh_assets[mesh_name]
            if not os.path.exists(os.path.join(ASSET_DIR, file)):
                warn.append(f"file {file} missing")
                continue
            G = quat_to_mat(gq)
            M = B @ G
            t = bp + B @ np.array(gp)
            tint = tint_for(bname, material)
            vs, vns, vts, faces = load_obj(file)
            weld = {}
            base = len(verts)
            for face in faces:
                corners = []
                for corner in face:
                    c = corner.split("/")
                    vi = int(c[0]) - 1
                    ti = int(c[1]) - 1 if len(c) > 1 and c[1] else -1
                    ni = int(c[2]) - 1 if len(c) > 2 and c[2] else -1
                    key = (vi, ti, ni)
                    if key in weld:
                        corners.append(weld[key])
                        continue
                    x, y, z = vs[vi]
                    mv = M @ np.array([x * mscale[0], y * mscale[1], z * mscale[2]])
                    w = t + mv
                    if 0 <= ni < len(vns):
                        n = M @ np.array(vns[ni])
                    else:
                        n = np.array([0.0, 1.0, 0.0])
                    uv = vts[ti] if 0 <= ti < len(vts) else (0.0, 0.0)
                    weld[key] = len(verts) - base
                    verts.append((w[0], w[2], w[1], n[0], n[2], n[1], uv[0], uv[1], *tint))
                    corners.append(weld[key])
                for k in range(1, len(corners) - 1):
                    idxs.append(base + corners[0])
                    idxs.append(base + corners[k])
                    idxs.append(base + corners[k + 1])
    groups_out[gname] = (verts, idxs)
    total_v += len(verts)
    total_i += len(idxs)
    print(f"  {gname}: {len(verts)} verts")

if warn:
    print("WARN:", sorted(set(warn)), file=sys.stderr)

min_y = min(v[1] for g in groups_out.values() for v in g[0])
for g in groups_out.values():
    for i, v in enumerate(g[0]):
        g[0][i] = (v[0], v[1] - min_y, v[2], *v[3:])

header = struct.pack("<IHHII", 0x50594C46, 4, len(groups_out), total_v, total_i)
blob = bytearray(header)
vbuf = bytearray()
ibuf = bytearray()
voff = ioff = 0
for gname, (verts, idxs) in groups_out.items():
    nb = gname.encode()
    code = 2 if "wing" in gname else 0
    blob += struct.pack("<H", len(nb)) + nb
    blob += struct.pack("<IIIIB", voff, len(verts), ioff, len(idxs), code)
    for v in verts:
        vbuf += struct.pack("<11f", *v)
    for i in idxs:
        ibuf += struct.pack("<I", i)
    voff += len(verts)
    ioff += len(idxs)
blob += vbuf
blob += ibuf
data = gzip.compress(bytes(blob), 6)
with open(OUT_PATH, "wb") as fh:
    fh.write(data)
print(f"wrote {OUT_PATH}: {len(data)/1e6:.2f} MB gz, V={total_v}, I={total_i}")
