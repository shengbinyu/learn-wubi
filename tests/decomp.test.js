/* decomp.test.js — 可选数据 js/data/decompositions.js / js/data/passages.js
 * 数据文件尚未生成时用 test.skip 明确报告；生成后校验：
 *   - 120 条单字拆解；roots 键位拼接 + idc.key 必须是该字真实编码，full 也是真实编码；
 *   - 识别码标注与 IDC_MATRIX 自洽；
 *   - 每段短文 50–80 个汉字，且所有汉字都在字库中。
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const H = require("./harness.js");

H.load();
const g = globalThis;
const { Dict, Levels } = g.ZG;

const hasDecomp = fs.existsSync(H.PATHS.decompositions);
const hasPassages = fs.existsSync(H.PATHS.passages);
const HAN_RE = /[\u4e00-\u9fff]/g;

function entriesOf(table) {
  if (!table) return [];
  return Object.keys(table).map((k) => ({ key: k, entry: table[k] }));
}
function charOf(key, entry) {
  return (entry && (entry.char || entry.text)) || key;
}
function rootLetter(r) {
  if (Array.isArray(r)) return r[1];
  if (r && typeof r === "object") return r.key || r.letter;
  return undefined;
}
function rootText(r) {
  if (Array.isArray(r)) return r[0];
  if (r && typeof r === "object") return r.text || r.char;
  return undefined;
}

test("decompositions.js：120 条单字拆解", { skip: hasDecomp ? false : "js/data/decompositions.js 尚未生成，跳过" }, (t) => {
  H.loadScript("decompositions");
  const D = g.ZG_DECOMPOSITIONS;
  assert.ok(D && typeof D === "object", "window.ZG_DECOMPOSITIONS 必须存在");
  const entries = entriesOf(D);
  t.diagnostic(`ZG_DECOMPOSITIONS 共 ${entries.length} 条（${Array.isArray(D) ? "数组" : "按字索引对象"}）`);
  assert.equal(entries.length, 120, `期望 120 条，实际 ${entries.length} 条`);
  const chars = entries.map(({ key, entry }) => charOf(key, entry));
  assert.equal(new Set(chars).size, chars.length, "拆解条目的汉字不得重复");
  assert.ok(chars.every((ch) => Dict.isChar(ch)), "每条拆解的键都必须是字库中的单字");
});

test("decompositions.js：roots 键位拼接（+idc.key）与 full 都是真实编码", { skip: hasDecomp ? false : "js/data/decompositions.js 尚未生成，跳过" }, (t) => {
  H.loadScript("decompositions");
  const entries = entriesOf(g.ZG_DECOMPOSITIONS);
  const bad = [];
  let idcCount = 0;
  for (const { key, entry } of entries) {
    const ch = charOf(key, entry);
    const label = `${ch}（key=${key}）`;
    if (!entry || typeof entry !== "object") { bad.push(`${label}: 条目不是对象`); continue; }
    if (!Array.isArray(entry.roots) || entry.roots.length === 0) {
      bad.push(`${label}: roots 必须是非空数组`);
      continue;
    }
    const letters = [];
    for (const r of entry.roots) {
      const text = rootText(r);
      const letter = rootLetter(r);
      if (typeof text !== "string" || !text.length) bad.push(`${label}: 字根文本非法 ${JSON.stringify(r)}`);
      if (typeof letter !== "string" || !/^[a-y]$/.test(letter)) {
        bad.push(`${label}: 字根键位非法 ${JSON.stringify(r)}`);
      }
      letters.push(letter);
    }
    let seq = letters.join("");
    if (entry.idc) {
      idcCount += 1;
      if (!entry.idc.key || !/^[a-y]$/.test(entry.idc.key)) {
        bad.push(`${label}: idc.key 非法 ${JSON.stringify(entry.idc.key)}`);
      } else {
        seq += entry.idc.key;
      }
      const stroke = entry.idc.stroke;
      const structure = entry.idc.structure;
      const expected = Levels.IDC_MATRIX[stroke] && Levels.IDC_MATRIX[stroke][structure];
      if (expected !== entry.idc.key) {
        bad.push(
          `${label}: idc.key=${entry.idc.key} 与矩阵 ${stroke}/${structure}=${expected} 不符`
        );
      }
    }
    const codes = Dict.codesOf(ch);
    if (!codes.length) {
      bad.push(`${label}: 不在字库`);
    } else {
      if (!codes.includes(seq)) bad.push(`${label}: roots+idc 拼接码 ${JSON.stringify(seq)} 不是真实编码 ${JSON.stringify(codes)}`);
      if (typeof entry.full !== "string" || !codes.includes(entry.full)) {
        bad.push(`${label}: full ${JSON.stringify(entry.full)} 不是真实编码 ${JSON.stringify(codes)}`);
      }
      if (entry.full && !/^[a-y]{1,4}$/.test(entry.full)) bad.push(`${label}: full 格式非法 ${entry.full}`);
    }
  }
  t.diagnostic(`含识别码的条目：${idcCount} / ${entries.length}`);
  if (bad.length) t.diagnostic("非法拆解：" + bad.join("；"));
  assert.deepEqual(bad, []);
});

test("decompositions.js：字根键位与 roots.js 的键名表不冲突（键位存在）", { skip: hasDecomp ? false : "js/data/decompositions.js 尚未生成，跳过" }, () => {
  H.loadScript("decompositions");
  const entries = entriesOf(g.ZG_DECOMPOSITIONS);
  const rootKeys = new Set((g.ZG_ROOTS && g.ZG_ROOTS.keys || []).map((k) => k.key));
  const bad = [];
  for (const { key, entry } of entries) {
    const ch = charOf(key, entry);
    const letters = (entry.roots || []).map(rootLetter);
    if (entry.idc) letters.push(entry.idc.key);
    for (const letter of letters) {
      if (letter && !rootKeys.has(letter)) bad.push(`${ch}: 键位 ${letter} 不在 ZG_ROOTS`);
    }
  }
  assert.deepEqual(bad, []);
});

test("passages.js：每段 50–80 个汉字，且全部汉字在字库中", { skip: hasPassages ? false : "js/data/passages.js 尚未生成，跳过" }, (t) => {
  H.loadScript("passages");
  const P = g.ZG_PASSAGES;
  assert.ok(Array.isArray(P), "window.ZG_PASSAGES 必须是数组");
  t.diagnostic(`ZG_PASSAGES 共 ${P.length} 段`);
  assert.equal(P.length, 3, "短文关 6-1/6-2/6-3 需要 3 段短文");
  P.forEach((p, i) => {
    const text = typeof p === "string" ? p : p && p.text;
    assert.ok(typeof text === "string" && text.length > 0, `第 ${i + 1} 段短文为空`);
    const han = text.match(HAN_RE) || [];
    assert.ok(
      han.length >= 50 && han.length <= 80,
      `第 ${i + 1} 段短文汉字数 ${han.length}，应在 50–80 之间`
    );
    const missing = [...new Set(han.filter((ch) => !Dict.has(ch)))];
    assert.deepEqual(missing, [], `第 ${i + 1} 段短文含字库外汉字（无法跟打）：${missing.join("")}`);
    if (typeof p === "object" && p.id) assert.ok(typeof p.id === "string");
  });
});

test("passages.js 与关卡展开联动：6-1/6-2/6-3 使用真实短文", { skip: hasPassages ? false : "js/data/passages.js 尚未生成，跳过" }, () => {
  H.loadScript("passages");
  const P = g.ZG_PASSAGES;
  ["6-1", "6-2", "6-3"].forEach((id, i) => {
    const items = Levels.expand(Levels.get(id));
    assert.equal(items.length, 1);
    assert.equal(items[0].kind, "passage");
    assert.equal(items[0].text, (typeof P[i] === "string" ? P[i] : P[i].text), `${id} 未使用 passages.js 第 ${i + 1} 段`);
  });
});
