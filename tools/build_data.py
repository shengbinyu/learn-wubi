#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build browser data files for 字根工坊 from Microsoft's Wubi 86 lexicon.

Source (Windows): C:\\WINDOWS\\InputMethod\\CHS\\ChsWubi.lex
Format (verified against the 1,808,326-byte file shipped by Windows 11):

    b"imscwubi" header, payload at 0xA8
    record := uint16 size | uint16 hash | uint16 codeLen |
              char16 code[4] (NUL padded) | char16 word[n] | uint16 0
    n := (size - 16) / 2

Outputs:
    data/wubi86-chars.js   window.WUBI_CHARS
    data/wubi86-words.js   window.WUBI_WORDS
    data/build-report.json

Run from the project root:
    python tools/build_data.py --src "C:\\WINDOWS\\InputMethod\\CHS" --out data
"""

from __future__ import annotations

import argparse
import hashlib
import json
import struct
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path

MAGIC = b"imscwubi"
PAYLOAD_OFFSET = 0xA8
VALID_CODE_CHARS = set("abcdefghijklmnopqrstuvwxy")

# The base Microsoft Wubi 86 lexicon. If these change, investigate the source
# (a different .lex version may be installed) before relaxing the assertion.
EXPECTED = {
    "records": 87514,
    "chars": 6890,
    "words": 76378,
    "one": 25,
    "two": 599,
    "three": 4411,
    "four": 6044,
}


def fail(message: str) -> None:
    print(f"[build_data] ERROR: {message}", file=sys.stderr)
    raise SystemExit(2)


def parse_lex(path: Path) -> dict:
    raw = path.read_bytes()
    if len(raw) < PAYLOAD_OFFSET:
        fail(f"{path} is too small to be a Wubi lexicon")
    if not raw.startswith(MAGIC):
        fail(f"{path} does not start with the expected {MAGIC!r} magic")

    pos = PAYLOAD_OFFSET
    total = len(raw)
    chars: dict[str, set[str]] = {}
    words: dict[str, set[str]] = {}
    code_len_dist: Counter[int] = Counter()
    word_len_dist: Counter[int] = Counter()
    records = 0

    while pos < total:
        if pos + 16 > total:
            fail(f"truncated record header at offset {pos}")
        size, _hash, code_len = struct.unpack_from("<HHH", raw, pos)
        if size < 16 or size % 2 != 0:
            fail(f"bad record size {size} at offset {pos}")
        if code_len < 1 or code_len > 4:
            fail(f"bad code length {code_len} at offset {pos}")
        if pos + size > total:
            fail(f"record at offset {pos} runs past end of file")
        n = (size - 16) // 2
        if n < 1:
            fail(f"empty word at offset {pos}")

        code_field = raw[pos + 6 : pos + 14].decode("utf-16-le", "strict")
        code = code_field.rstrip("\x00")
        if len(code) != code_len:
            fail(f"code length mismatch at offset {pos}: {code!r} vs {code_len}")
        if any(ch not in VALID_CODE_CHARS for ch in code):
            fail(f"non a-y code {code!r} at offset {pos}")

        word = raw[pos + 14 : pos + 14 + 2 * n].decode("utf-16-le", "strict")
        if len(word) != n:
            fail(f"word length mismatch at offset {pos}")
        terminator = struct.unpack_from("<H", raw, pos + size - 2)[0]
        if terminator != 0:
            fail(f"missing record terminator at offset {pos + size - 2}")

        if n == 1:
            code_len_dist[len(code)] += 1
            chars.setdefault(word, set()).add(code)
        else:
            if len(code) != 4:
                fail(f"word record with non-4-letter code {code!r} at offset {pos}")
            word_len_dist[n] += 1
            words.setdefault(word, set()).add(code)

        records += 1
        pos += size

    if pos != total:
        fail(f"parser stopped at {pos}, expected {total}")

    unique_chars = len(chars)
    unique_words = len(words)
    one = code_len_dist[1]
    two = code_len_dist[2]
    three = code_len_dist[3]
    four = code_len_dist[4]
    min_len_dist = Counter(min(len(c) for c in codes) for codes in chars.values())

    actual = {
        "records": records,
        "chars": unique_chars,
        "words": unique_words,
        "one": one,
        "two": two,
        "three": three,
        "four": four,
    }
    if actual != EXPECTED:
        fail(
            "lexicon counts differ from the verified Windows base file.\n"
            f"  expected: {EXPECTED}\n"
            f"  actual:   {actual}\n"
            "Do not ship data generated from an unverified lexicon."
        )

    digest = hashlib.sha256(raw).hexdigest()
    return {
        "path": path,
        "raw": raw,
        "sha256": digest,
        "records": records,
        "chars": chars,
        "words": words,
        "code_len_dist": dict(sorted(code_len_dist.items())),
        "word_len_dist": dict(sorted(word_len_dist.items())),
        "min_len_dist": dict(sorted(min_len_dist.items())),
    }


def build_outputs(parsed: dict, out_dir: Path) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)

    chars_out: dict[str, list[str]] = {}
    for char in sorted(parsed["chars"]):
        codes = sorted(parsed["chars"][char], key=lambda c: (len(c), c))
        chars_out[char] = codes

    words_out: dict[str, str] = {}
    duplicate_word_codes: list[dict] = []
    for word in sorted(parsed["words"]):
        codes = sorted(parsed["words"][word], key=lambda c: (len(c), c))
        if len(codes) > 1:
            duplicate_word_codes.append({"word": word, "codes": codes})
        words_out[word] = codes[0]

    meta_common = {
        "scheme": "wubi86",
        "source": parsed["path"].name,
        "sourceBytes": len(parsed["raw"]),
        "sourceSha256": parsed["sha256"],
        "records": parsed["records"],
        "chars": len(chars_out),
        "words": len(words_out),
        "builtAt": datetime.now().astimezone().isoformat(timespec="seconds"),
    }

    chars_meta = {
        **meta_common,
        "codeLenDist": parsed["code_len_dist"],
        "minLenDist": parsed["min_len_dist"],
    }
    words_meta = {
        **meta_common,
        "wordLenDist": parsed["word_len_dist"],
    }

    chars_js = (
        "/* Generated by tools/build_data.py — do not edit by hand. */\n"
        "window.WUBI_CHARS="
        + json.dumps({"meta": chars_meta, "chars": chars_out}, ensure_ascii=False, separators=(",", ":"))
        + ";\n"
    )
    words_js = (
        "/* Generated by tools/build_data.py — do not edit by hand. */\n"
        "window.WUBI_WORDS="
        + json.dumps({"meta": words_meta, "words": words_out}, ensure_ascii=False, separators=(",", ":"))
        + ";\n"
    )

    (out_dir / "wubi86-chars.js").write_text(chars_js, encoding="utf-8", newline="\n")
    (out_dir / "wubi86-words.js").write_text(words_js, encoding="utf-8", newline="\n")

    report = {
        **meta_common,
        "path": str(parsed["path"]),
        "codeLenDist": parsed["code_len_dist"],
        "wordLenDist": parsed["word_len_dist"],
        "minLenDist": parsed["min_len_dist"],
        "duplicateWordCodeCount": len(duplicate_word_codes),
        "duplicateWordCodeSamples": duplicate_word_codes[:5],
        "samples": {
            char: chars_out.get(char)
            for char in ["明", "好", "只", "国", "远", "你", "林", "森", "品", "工", "王", "这", "的", "我", "是", "中", "同", "民", "发", "经", "亲"]
        },
        "wordSamples": {word: words_out.get(word) for word in ["工作", "我们", "中国", "学习", "五笔", "字根"]},
        "files": {
            "chars": {"bytes": len(chars_js.encode("utf-8")), "entries": len(chars_out)},
            "words": {"bytes": len(words_js.encode("utf-8")), "entries": len(words_out)},
        },
        "expected": EXPECTED,
    }
    (out_dir / "build-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n"
    )
    return report


def main(argv: list[str]) -> int:
    default_out = Path(__file__).resolve().parents[1] / "data"
    parser = argparse.ArgumentParser(description="Build 字根工坊 Wubi 86 data files")
    parser.add_argument("--src", default=r"C:\WINDOWS\InputMethod\CHS", help="directory or .lex file")
    parser.add_argument("--out", default=str(default_out), help="output directory (default: <repo>/data)")
    parser.add_argument("--file", default="ChsWubi.lex", help="lexicon filename inside --src")
    args = parser.parse_args(argv)

    src = Path(args.src)
    path = src if src.is_file() else src / args.file
    if not path.exists():
        fail(f"lexicon not found: {path}")
    out_dir = Path(args.out)

    parsed = parse_lex(path)
    report = build_outputs(parsed, out_dir)

    print(f"[build_data] source   {report['path']} ({report['sourceBytes']:,} bytes)")
    print(f"[build_data] sha256   {report['sourceSha256']}")
    print(f"[build_data] records  {report['records']:,}")
    print(f"[build_data] chars    {report['chars']:,}  (codes 1/2/3/4 = "
          f"{report['codeLenDist'].get(1, 0)}/{report['codeLenDist'].get(2, 0)}/"
          f"{report['codeLenDist'].get(3, 0)}/{report['codeLenDist'].get(4, 0)})")
    print(f"[build_data] words    {report['words']:,}")
    print(f"[build_data] chars.js {report['files']['chars']['bytes']:,} bytes")
    print(f"[build_data] words.js {report['files']['words']['bytes']:,} bytes")
    print(f"[build_data] report   {out_dir / 'build-report.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
