/* levels.test.js — ZG.Levels 关卡展开、识别码矩阵、星级判定
 * 覆盖：33 关元数据、各关展开数量、确定性、无重复题面、
 *       编码题合法性 / strictLen 匹配、识别码矩阵与示例、星级阈值、短文速度。
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const H = require("./harness.js");

H.load();
const g = globalThis;
const { Levels, Dict } = g.ZG;
const DEFS = Levels.defs();
const CHAPTERS = Levels.chapters();

function expandById(id) {
  const def = Levels.get(id);
  assert.ok(def, `关卡 ${id} 不存在`);
  return Levels.expand(def);
}

test("33 个关卡定义：id 唯一、章节 7 卷、归属一致", () => {
  assert.ok(Array.isArray(DEFS), "ZG_LESSON_DEFS 必须是数组");
  assert.equal(DEFS.length, 33);
  const ids = DEFS.map((d) => d.id);
  assert.equal(new Set(ids).size, 33, "关卡 id 不得重复");
  assert.deepEqual(ids.slice(0, 3), ["0-1", "0-2", "0-3"]);
  assert.deepEqual(ids.slice(-3), ["6-1", "6-2", "6-3"]);
  assert.equal(CHAPTERS.length, 7);
  const chapterIds = CHAPTERS.map((c) => c.id);
  assert.deepEqual(chapterIds, ["序", "一", "二", "三", "四", "五", "六"]);
  for (const def of DEFS) {
    assert.ok(Number.isInteger(def.chapterIndex), `${def.id} 缺 chapterIndex`);
    assert.ok(def.chapterIndex >= 0 && def.chapterIndex < 7, `${def.id} chapterIndex 越界`);
    assert.equal(def.chapter, CHAPTERS[def.chapterIndex].id, `${def.id} 章节归属不一致`);
    assert.equal(typeof def.title, "string");
    assert.equal(typeof def.kind, "string");
  }
  // 每卷关卡数
  const perChapter = CHAPTERS.map((c) => DEFS.filter((d) => d.chapter === c.id).length);
  assert.deepEqual(perChapter, [3, 6, 4, 6, 7, 4, 3]);
});

test("expand 数量：2-1/2-2/2-3/2-4/3-1/3-2/4-7/5-1", () => {
  const expected = {
    "2-1": 13, "2-2": 12, "2-3": 13, "2-4": 12,
    "3-1": 16, "3-2": 16, "4-7": 8, "5-1": 12
  };
  for (const [id, count] of Object.entries(expected)) {
    const items = expandById(id);
    assert.equal(items.length, count, `${id} 应展开 ${count} 项，实际 ${items.length}`);
  }
  // 类型抽查
  for (const id of ["2-1", "2-2"]) {
    assert.ok(expandById(id).every((it) => it.kind === "code"), `${id} 应为编码题`);
  }
  for (const id of ["2-3", "2-4"]) {
    assert.ok(expandById(id).every((it) => it.kind === "code" && it.strictLen === 1), `${id} 应为一级简码题`);
  }
  for (const id of ["3-1", "3-2"]) {
    assert.ok(expandById(id).every((it) => it.kind === "code" && it.strictLen === 2), `${id} 应为二级简码题`);
  }
  const idc = expandById("4-7");
  assert.ok(idc.every((it) => it.kind === "idc"), "4-7 应全部是识别码题");
  const words = expandById("5-1");
  assert.ok(words.every((it) => it.kind === "code"), "5-1 应为编码题");
  assert.ok(words.every((it) => Dict.isWord(it.text)), "5-1 每题都必须是词库中的词组");
  assert.ok(words.every((it) => it.text.length === 2), "5-1 是二字词关");
  assert.ok(words.every((it) => (it.codes || []).every((c) => c.length === 4)), "词组编码应为 4 位");
});

test("关卡展开是确定性的：同一关两次展开完全一致", () => {
  for (const def of DEFS) {
    const a = JSON.stringify(Levels.expand(def));
    const b = JSON.stringify(Levels.expand(def));
    assert.equal(a, b, `${def.id} 两次展开结果不同（随机数未按关卡 seeding）`);
  }
});

test("同一关内题面不重复", () => {
  for (const def of DEFS) {
    const items = Levels.expand(def);
    const seen = new Map();
    for (const item of items) {
      const key = item.text != null ? item.text : item.prompt;
      assert.ok(key, `${def.id} 存在无题面的项`);
      assert.equal(seen.has(key), false, `${def.id} 题面重复：${key}`);
      seen.set(key, true);
    }
  }
});

test("每道编码题的 codes 合法、与 Dict.codesOf 一致、full 是真实全码", () => {
  const bad = [];
  for (const def of DEFS) {
    for (const item of Levels.expand(def)) {
      if (item.kind !== "code") continue;
      assert.ok(Array.isArray(item.codes) && item.codes.length > 0, `${def.id}/${item.text} codes 为空`);
      for (const code of item.codes) {
        if (!/^[a-y]{1,4}$/.test(code)) bad.push(`${def.id}/${item.text}: 非法编码 ${code}`);
      }
      const actual = Dict.codesOf(item.text);
      assert.deepEqual(item.codes, actual, `${def.id}/${item.text} codes 与词库不一致`);
      assert.ok(actual.includes(item.full), `${def.id}/${item.text} full=${item.full} 不是真实编码 ${actual}`);
      assert.equal(item.full, Dict.fullCode(item.text), `${def.id}/${item.text} full 应为最长码`);
    }
  }
  assert.deepEqual(bad, []);
});

test("每道编码题 strictLen 与自身编码匹配（含识别码题）", (t) => {
  const bad = [];
  for (const def of DEFS) {
    for (const item of Levels.expand(def)) {
      if (item.kind !== "code" && item.kind !== "idc") continue;
      const label = `${def.id}/${item.text}`;
      if (!Number.isInteger(item.strictLen) || item.strictLen < 0 || item.strictLen > 4) {
        bad.push(`${label}: strictLen=${JSON.stringify(item.strictLen)} 不是 0–4 的整数`);
        continue;
      }
      if (item.strictLen > 0 && !item.codes.some((c) => c.length === item.strictLen)) {
        bad.push(
          `${label}: strictLen=${item.strictLen} 但 codes=${JSON.stringify(item.codes)}（无该长度编码，无法上屏）`
        );
      }
    }
  }
  if (bad.length) {
    t.diagnostic("strictLen 与编码长度不匹配的题：" + bad.join("；"));
  }
  assert.deepEqual(bad, []);
});

test("识别码矩阵：5 笔形 × 3 字型 = 15 个互不相同的字母", () => {
  const expected = {
    横: { 左右: "g", 上下: "f", 杂合: "d" },
    竖: { 左右: "h", 上下: "j", 杂合: "k" },
    撇: { 左右: "t", 上下: "r", 杂合: "e" },
    捺: { 左右: "y", 上下: "u", 杂合: "i" },
    折: { 左右: "n", 上下: "b", 杂合: "v" }
  };
  assert.deepEqual(Levels.IDC_MATRIX, expected);
  const letters = [];
  for (const stroke of Object.keys(expected)) {
    assert.deepEqual(Object.keys(Levels.IDC_MATRIX[stroke]).sort(), ["上下", "左右", "杂合"]);
    for (const structure of Object.keys(expected[stroke])) {
      letters.push(Levels.IDC_MATRIX[stroke][structure]);
    }
  }
  assert.equal(letters.length, 15);
  assert.equal(new Set(letters).size, 15, "15 个识别码字母必须互不相同");
});

test("识别码示例：8 个，full 是真实编码，末笔/字型是矩阵合法键", () => {
  const examples = Levels.IDC_EXAMPLES;
  assert.equal(examples.length, 8);
  const bad = [];
  for (const x of examples) {
    if (!Dict.isChar(x.text)) bad.push(`${x.text}: 不在字库`);
    if (!Dict.codesOf(x.text).includes(x.full)) bad.push(`${x.text}: full=${x.full} 不在真实编码中`);
    if (!Levels.IDC_MATRIX[x.stroke]) bad.push(`${x.text}: 未知末笔 ${x.stroke}`);
    else if (!Levels.IDC_MATRIX[x.stroke][x.structure]) bad.push(`${x.text}: 未知字型 ${x.structure}`);
  }
  assert.deepEqual(bad, []);
  // 展开 4-7 后，idcKey 必须等于 full 末位
  for (const item of expandById("4-7")) {
    assert.equal(item.idcKey, item.full[item.full.length - 1]);
    assert.ok(Levels.IDC_MATRIX[item.stroke]);
    assert.ok(Levels.IDC_MATRIX[item.stroke][item.structure]);
  }
});

test("识别码示例的末笔/字型标注应与全码末位一致（矩阵自洽）", (t) => {
  const bad = [];
  for (const x of Levels.IDC_EXAMPLES) {
    const letter = Levels.IDC_MATRIX[x.stroke] && Levels.IDC_MATRIX[x.stroke][x.structure];
    const actual = x.full[x.full.length - 1];
    if (letter !== actual) {
      bad.push(
        `${x.text}: full=${x.full} 末位 ${actual}（矩阵 ${x.stroke}/${x.structure}=${letter}）` +
        `，标注的末笔 ${x.stroke} / 字型 ${x.structure} 与全码矛盾`
      );
    }
  }
  if (bad.length) t.diagnostic("IDC_EXAMPLES 标注错误：" + bad.join("；"));
  assert.deepEqual(bad, []);
});

test("星级阈值（非短文关）", () => {
  const def = { kind: "code" };
  const star = (correct, total, ms) => Levels.stars({ correct, total, ms }, def);
  assert.equal(star(79, 100, 1000), 0, "正确率 79% → 0 星");
  assert.equal(star(80, 100, 400000), 1, "正确率 80% 且平均 4s/题 → 1 星");
  assert.equal(star(79, 100, 100), 0, "正确率不足 80% 时速度再快也是 0 星");
  assert.equal(star(92, 100, 290000), 2, "92% + 平均 2.9s/题 → 2 星");
  assert.equal(star(92, 100, 310000), 1, "92% 但平均 3.1s/题 → 1 星");
  assert.equal(star(98, 100, 190000), 3, "98% + 平均 1.9s/题 → 3 星");
  assert.equal(star(98, 100, 250000), 2, "98% 但平均 2.5s/题 → 2 星");
  assert.equal(star(97, 100, 100000), 2, "97% 未达 98% → 最多 2 星");
  // 无结果
  assert.equal(Levels.stars(null, { kind: "code" }), 0);
  assert.equal(Levels.stars(null, { kind: "tour" }), 1);
  assert.equal(Levels.stars(null, { kind: "idcTutorial" }), 1);
});

test("星级阈值（短文关按速度 字/分）", () => {
  const def = { kind: "passage" };
  // speed = correct / (ms / 60000)
  assert.equal(Levels.stars({ correct: 50, total: 50, ms: 200000 }, def), 1, "15 字/分 → 1 星");
  assert.equal(Levels.stars({ correct: 50, total: 50, ms: 120000 }, def), 2, "25 字/分 → 2 星");
  assert.equal(Levels.stars({ correct: 50, total: 50, ms: 100000 }, def), 3, "30 字/分 → 3 星");
  // 速度够但正确率不足
  assert.equal(Levels.stars({ correct: 46, total: 60, ms: 90000 }, def), 0, "正确率 76.7% → 0 星");
  assert.equal(Levels.stars({ correct: 56, total: 60, ms: 90000 }, def), 2, "93.3% + 37 字/分 → 2 星");
});

test("短文关：6-1/6-2/6-3 各展开 1 段文本，回退文本存在", () => {
  for (const id of ["6-1", "6-2", "6-3"]) {
    const items = expandById(id);
    assert.equal(items.length, 1);
    assert.equal(items[0].kind, "passage");
    assert.ok(typeof items[0].text === "string" && items[0].text.length > 0);
    assert.equal(items[0].passageIndex, Number(id.slice(2)) - 1);
  }
  assert.equal(Levels.FALLBACK_PASSAGES.length, 3);
  assert.ok(Levels.FALLBACK_PASSAGES.every((s) => typeof s === "string" && s.length > 0));
});

test("tour / idcTutorial 关不产出题目", () => {
  assert.deepEqual(expandById("0-1"), []);
  assert.deepEqual(expandById("4-6"), []);
  assert.equal(Levels.get("不存在的关卡"), null);
});
