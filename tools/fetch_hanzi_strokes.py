#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fetch stroke outlines for the curated decomposition characters.

Source: hanzi-writer-data 2.0.1 (Make Me a Hanzi), ARPHICPL.
Each character is a JSON file with `strokes`, `medians` and `radStrokes`.
The game renders those strokes as SVG paths, so root colors follow actual
stroke shapes rather than clipping a whole glyph into rectangles.

Usage:
  python tools/fetch_hanzi_strokes.py --out data
"""

import argparse
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

BASE = "https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1"
UA = {"User-Agent": "zigen-workshop/1.0 (personal learning project)"}


def fetch(url: str, retries: int = 4) -> bytes:
    last = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=45) as resp:
                return resp.read()
        except Exception as exc:  # noqa: BLE001 - network retry
            last = exc
            time.sleep(1.2 * (attempt + 1))
    raise RuntimeError(f"fetch failed: {url}: {last}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="data")
    parser.add_argument("--decompositions", default="js/data/decompositions.js")
    args = parser.parse_args()

    root = Path(__file__).resolve().parent.parent
    src = root / args.decompositions
    text = src.read_text(encoding="utf-8")
    chars = re.findall(r'^\s{2}"(.{1,2})":\s*\{', text, re.M)
    if len(chars) != 120:
        raise SystemExit(f"expected 120 curated chars, got {len(chars)}")
    chars = sorted(set(chars))

    out_dir = root / args.out
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "hanzi").mkdir(exist_ok=True)

    license_bytes = fetch(f"{BASE}/ARPHICPL.TXT")
    (out_dir / "hanzi" / "ARPHICPL.txt").write_bytes(license_bytes)

    data = {}
    for i, ch in enumerate(chars, 1):
        url = f"{BASE}/{urllib.parse.quote(ch)}.json"
        payload = json.loads(fetch(url).decode("utf-8"))
        strokes = payload.get("strokes") or []
        medians = payload.get("medians") or []
        if not strokes:
            raise SystemExit(f"no strokes for {ch}")
        data[ch] = {
            "strokes": strokes,
            "medians": medians,
            "radStrokes": payload.get("radStrokes") or [],
        }
        print(f"[{i:3}/{len(chars)}] {ch} strokes={len(strokes)}")

    body = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    out = out_dir / "hanzi-strokes.js"
    out.write_text(
        "/* Stroke outlines from hanzi-writer-data 2.0.1 (Make Me a Hanzi), ARPHICPL. */\n"
        "window.HANZI_STROKES = " + body + ";\n",
        encoding="utf-8",
    )
    print(f"wrote {out} chars={len(data)}")


if __name__ == "__main__":
    main()
