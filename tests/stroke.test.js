/* 字根工坊 · 整字笔画数据测试
 *
 * data/hanzi-strokes.js 由 tools/fetch_hanzi_strokes.py 生成：
 * 120 个精选拆解字的 hanzi-writer 笔画轮廓（1024²，y-up）。
 * 这里只校验数据形状与覆盖，不依赖 DOM。
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const assert = require("node:assert/strict");

const ROOT = path.resolve(__dirname, "..");
const strokesFile = path.join(ROOT, "data", "hanzi-strokes.js");
const decompFile = path.join(ROOT, "js", "data", "decompositions.js");

function loadWindow(file) {
  const window = {};
  vm.runInNewContext(fs.readFileSync(file, "utf8"), { window });
  return window;
}

const strokeWindow = loadWindow(strokesFile);
const decompWindow = loadWindow(decompFile);
const STROKES = strokeWindow.HANZI_STROKES;
const DECOMP = decompWindow.ZG_DECOMPOSITIONS;

test("笔画数据覆盖全部 120 个拆解字", () => {
  assert.ok(STROKES, "window.HANZI_STROKES 未定义");
  assert.ok(DECOMP, "window.ZG_DECOMPOSITIONS 未定义");
  const strokeKeys = Object.keys(STROKES).sort();
  const decompKeys = Object.keys(DECOMP).sort();
  assert.deepEqual(strokeKeys, decompKeys);
  assert.equal(strokeKeys.length, 120);
});

test("每个字都有笔顺轮廓与中线，路径以 M 开头", () => {
  for (const [char, data] of Object.entries(STROKES)) {
    assert.ok(Array.isArray(data.strokes) && data.strokes.length > 0, char + " 缺笔画");
    assert.ok(Array.isArray(data.medians), char + " 缺中线");
    assert.equal(data.medians.length, data.strokes.length, char + " 笔画/中线数量不一致");
    for (const d of data.strokes) {
      assert.match(d, /^\s*M\s*[-0-9.]/, char + " 的路径不是 SVG path");
    }
  }
});

test("已知字的笔画数可作为数据回归基准", () => {
  assert.equal(STROKES["说"].strokes.length, 9);
  assert.equal(STROKES["明"].strokes.length, 8);
  assert.equal(STROKES["国"].strokes.length, 8);
  assert.equal(STROKES["中"].strokes.length, 4);
});
