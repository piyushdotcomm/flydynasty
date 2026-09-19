"""
pack-fly-uv.py — build the UV atlas mapping for the flybody texture.

The OBJs share ONE texture (flybody_texture.png) but each mesh has its own UV
island in the same 0..1 space (that's how the flybody MuJoCo model works: all
body geoms sample the single flybody.png). So no atlas is needed — the packed
per-vertex UVs already address the shared texture. This script just VERIFIES
that the kept meshes' UV bounds sit inside 0..1 and reports the coverage so we
can bind the texture directly at runtime.

Run:  python scripts/pack-fly-uv.py   (also patches nothing; diagnostics only)
"""
import json
import os
import re
import xml.etree.ElementTree as ET

XML_PATH = os.environ.get("FLY_XML", "E:/fruitfly/.work/flybody/fruitfly.xml")
ASSET_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                         "assets-src/fly")

mjcf = ET.parse(XML_PATH).getroot()
default_scale = (0.1, 0.1, 0.1)
for el in mjcf.iter("mesh"):
    if "scale" in el.attrib and "file" not in el.attrib and "name" not in el.attrib:
        default_scale = tuple(float(v) for v in el.attrib["scale"].split())
        break

mesh_assets = {}
for el in mjcf.iter("mesh"):
    if "file" in el.attrib:
        name = el.attrib.get("name") or os.path.splitext(el.attrib["file"])[0]
        mesh_assets[name] = el.attrib["file"]

SKIP = re.compile(r"_ocelli$|_bristle|_lower$|claw|_red$")

uv_stats = {}
for asset_name, file in sorted(set(mesh_assets.items())):
    if SKIP.search(asset_name):
        continue
    path = os.path.join(ASSET_DIR, file)
    if not os.path.exists(path):
        continue
    n_uv = 0
    umin = [1e9, 1e9]
    umax = [-1e9, -1e9]
    with open(path) as fh:
        for line in fh:
            if line.startswith("vt "):
                s = line.split()
                u, v = float(s[1]), float(s[2])
                n_uv += 1
                umin[0] = min(umin[0], u); umin[1] = min(umin[1], v)
                umax[0] = max(umax[0], u); umax[1] = max(umax[1], v)
    if n_uv:
        uv_stats[file] = {"n": n_uv, "min": [round(umin[0], 3), round(umin[1], 3)],
                          "max": [round(umax[0], 3), round(umax[1], 3)]}

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fly-uv-report.json")
with open(out, "w") as fh:
    json.dump(uv_stats, fh, indent=1)
print(f"{len(uv_stats)} meshes with UVs -> {out}")
inside = sum(1 for s in uv_stats.values() if s["min"][0] >= -0.01 and s["min"][1] >= -0.01 and s["max"][0] <= 1.01 and s["max"][1] <= 1.01)
print(f"UV bounds within 0..1: {inside}/{len(uv_stats)}")
for f, s in list(uv_stats.items())[:8]:
    print(" ", f, s)
