#!/usr/bin/env python3
"""Rewrite data/processed/seeds.json with root IDs as STRINGS.

seeds.json stored root IDs as JSON numbers. FlyWire root IDs are ~7.2e17,
above Number.MAX_SAFE_INTEGER (9.007e15), so every JavaScript JSON.parse
rounded them (e.g. 720575940624963786 -> 720575940624963800), and 20 sugar
GRN lookups silently missed the graph. Python parses them exactly, so this
conversion is lossless: read with json (exact ints), emit str(int).

Run from flylab/:  python data/fix_seeds_json.py
"""
import json
from pathlib import Path

PATH = Path(__file__).resolve().parent / "processed" / "seeds.json"

doc = json.loads(PATH.read_text(encoding="utf-8"))
converted = 0
for group in doc.get("groups", []):
    ids = group.get("root_ids")
    if ids is None:
        continue
    strs = [str(int(i)) for i in ids]
    converted += sum(1 for a, b in zip(ids, strs) if not isinstance(a, str))
    group["root_ids"] = strs

PATH.write_text(json.dumps(doc, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"seeds.json: {converted} numeric root IDs converted to exact decimal strings")
