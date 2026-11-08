/* data.test.js — 校对 data/wubi86-chars.js 与 data/wubi86-words.js 的数据契约
 * 依据 data/build-report.json 与任务书：87,514 条记录、6,890 字、76,378 词，
 * 码长分布 25 / 599 / 4,411 / 6,044。
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const H = require("./harness.js");

H.load();

const g = globalThis;
const CHARS = g.WUBI_CHARS;
const WORDS = g.WUBI_WORDS;

// 25 个一级简码字及其唯一单码（任务书给定）
const C1_SINGLE = {
  一: "g", 地: "f", 在: "d", 要: "s", 工: "a", 上: "h", 是: "j", 中: "k", 国: "l",
  同: "m", 和: "t", 的: "r", 有: "e", 人: "w", 我: "q", 主: "y", 产: "u", 不: "i",
  为: "o", 这: "p", 民: "n", 了: "b", 发: "v", 以: "c", 经: "x"
};

// 25 个键名字（每个都必须有 4 码）
const KEYNAMES = ["王", "土", "大", "木", "工", "目", "日", "口", "田", "山",
  "禾", "白", "月", "人", "金", "言", "立", "水", "火", "之", "已", "子", "女", "又", "纟"];

const CODE_RE = /^[a-y]{1,4}$/;

function charCodes(ch) {
  const list = CHARS.chars[ch];
  return list;
}

test("WUBI_CHARS.meta：87,514 条记录 / 6,890 字 / 76,378 词", () => {
  assert.ok(CHARS && typeof CHARS === "object", "window.WUBI_CHARS 必须存在");
  const meta = CHARS.meta;
  assert.ok(meta, "meta 必须存在");
  assert.equal(meta.records, 87514);
  assert.equal(meta.chars, 6890);
  assert.equal(meta.words, 76378);
  assert.equal(Object.keys(CHARS.chars).length, 6890);
  // 与构建报告交叉核对
  const report = JSON.parse(fs.readFileSync(H.PATHS.buildReport, "utf8"));
  assert.equal(report.records, meta.records);
  assert.equal(report.chars, meta.chars);
  assert.equal(report.words, meta.words);
  assert.deepEqual(report.codeLenDist, meta.codeLenDist);
});

test("码长分布：25 / 599 / 4,411 / 6,044", () => {
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const ch of Object.keys(CHARS.chars)) {
    const codes = charCodes(ch);
    assert.ok(Array.isArray(codes) && codes.length > 0, `${ch} 没有编码数组`);
    for (const code of codes) {
      assert.match(code, CODE_RE, `${ch} 的编码 ${JSON.stringify(code)} 非法`);
      dist[code.length] += 1;
    }
  }
  assert.deepEqual(dist, { 1: 25, 2: 599, 3: 4411, 4: 6044 });
  assert.deepEqual(CHARS.meta.codeLenDist, { 1: 25, 2: 599, 3: 4411, 4: 6044 });
});

test("每个字 1–4 个编码，无空码、无重复码", () => {
  const bad = [];
  for (const ch of Object.keys(CHARS.chars)) {
    const codes = charCodes(ch);
    if (!Array.isArray(codes) || codes.length === 0 || codes.length > 4) {
      bad.push(`${ch}: 编码数量 ${Array.isArray(codes) ? codes.length : typeof codes}`);
      continue;
    }
    const seen = new Set();
    for (const code of codes) {
      if (typeof code !== "string" || !CODE_RE.test(code)) {
        bad.push(`${ch}: 非法编码 ${JSON.stringify(code)}`);
      } else if (seen.has(code)) {
        bad.push(`${ch}: 重复编码 ${code}`);
      }
      seen.add(code);
    }
  }
  assert.deepEqual(bad.slice(0, 20), [], `共 ${bad.length} 条问题（前 20 条）`);
});

test("25 个键名字每个都有 4 码", () => {
  const missing = KEYNAMES.filter((ch) => {
    const codes = charCodes(ch) || [];
    return !codes.some((c) => c.length === 4);
  });
  assert.deepEqual(missing, [], "以下键名字缺少 4 码：" + missing.join("、"));
});

test("25 个一级简码字各有指定单码，且单码字集合恰好是这 25 个", () => {
  for (const [ch, letter] of Object.entries(C1_SINGLE)) {
    const codes = charCodes(ch) || [];
    assert.ok(codes.includes(letter), `${ch} 缺少单码 ${letter}，实际：${JSON.stringify(codes)}`);
  }
  const singleCodeChars = Object.keys(CHARS.chars)
    .filter((ch) => (charCodes(ch) || []).some((c) => c.length === 1))
    .sort();
  assert.deepEqual(singleCodeChars, Object.keys(C1_SINGLE).sort(),
    "拥有单码的字集合必须恰好是 25 个一级简码字");
  // 单码之间不得复用
  const letters = Object.keys(C1_SINGLE).map((ch) => charCodes(ch).find((c) => c.length === 1));
  assert.equal(new Set(letters).size, 25, "25 个一级简码的单码必须互不相同");
});

test("WUBI_WORDS：76,378 条词条，编码均为 4 位小写 a–y", () => {
  assert.ok(WORDS && typeof WORDS === "object", "window.WUBI_WORDS 必须存在");
  assert.equal(WORDS.meta.words, 76378);
  const keys = Object.keys(WORDS.words);
  assert.equal(keys.length, 76378);
  const bad = [];
  for (const word of keys) {
    if (!word) bad.push("空词条");
    const code = WORDS.words[word];
    if (typeof code !== "string" || !/^[a-y]{4}$/.test(code)) {
      bad.push(`${word}: 非法编码 ${JSON.stringify(code)}`);
    }
  }
  assert.deepEqual(bad.slice(0, 20), [], `共 ${bad.length} 个词条编码非法（前 20 条）`);
});

test("重码报告：汶川（build-report 记录的重复词条）", (t) => {
  const code = WORDS.words["汶川"];
  assert.ok(code, "汶川 必须存在于词库");
  assert.match(code, /^[a-y]{4}$/);
  const sameCode = Object.keys(WORDS.words).filter((w) => WORDS.words[w] === code);
  t.diagnostic(
    `汶川 编码 ${code}；同码词（${sameCode.length}）：${sameCode.join("、")}`
  );
  // build-report 里 duplicateWordCodeCount=1，样本为 汶川 ["iyhh","iykt"]
  const report = JSON.parse(fs.readFileSync(H.PATHS.buildReport, "utf8"));
  assert.equal(report.duplicateWordCodeCount, 1);
  assert.equal(report.duplicateWordCodeSamples[0].word, "汶川");
  t.diagnostic(
    `build-report: 汶川 源词条重复 ${JSON.stringify(report.duplicateWordCodeSamples[0].codes)}，` +
    `词库最终保留 ${code}`
  );
  // 重码在五笔里很正常：同码词必须 ≥2 才叫重码
  assert.ok(sameCode.length >= 2, "汶川 的编码应至少被两个词共用（重码）");
});
