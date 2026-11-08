/* engine.test.js — ZG.Engine 编码输入状态机
 * 覆盖：空格上屏、严格码长、错误键、4 码自动上屏、退格、重置、提示键、
 *       reveal 揭示、结果结构、错误消息。
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const H = require("./harness.js");

H.load();
const { Engine } = globalThis.ZG;

const MING = ["je", "jeg"]; // 明
const GONG = ["a", "aaa", "aaaa"]; // 工

function make(codes, extra) {
  return Engine.create(Object.assign({ text: "明", codes: codes.slice() }, extra || {}));
}

test("明：按 j/e 后用空格上屏 je", () => {
  const e = make(MING, { strictLen: 2 });
  e.press("j");
  assert.equal(e.state.buffer, "j");
  assert.equal(e.state.done, false);
  e.press("e");
  assert.equal(e.state.buffer, "je");
  assert.equal(e.state.done, false, "autoSpace=false 时不能自动上屏");
  e.space();
  assert.equal(e.state.done, true);
  assert.equal(e.state.result.ok, true);
  assert.equal(e.state.result.usedCode, "je");
  assert.equal(e.state.result.firstTry, true);
  assert.equal(e.state.result.revealed, false);
  assert.equal(e.state.result.errors, 0);
});

test("错误键 x 不追加字符，errors+1 且 firstTry 变 false", () => {
  const e = make(MING);
  const errors = [];
  e.on("error", (payload) => errors.push(payload));
  e.press("j");
  e.press("x");
  assert.equal(e.state.buffer, "j", "x 不应进入缓冲区");
  assert.equal(e.state.errors, 1);
  assert.equal(e.state.firstTry, false);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].message, "这个键不在当前编码里。");
  assert.equal(errors[0].count, 1);
  assert.equal(errors[0].key, "x");
  // 之后补全仍可完成，但 firstTry=false
  e.press("e");
  e.space();
  assert.equal(e.state.result.ok, true);
  assert.equal(e.state.result.firstTry, false);
  assert.equal(e.state.result.errors, 1);
});

test("工：四码自动上屏 aaaa", () => {
  const e = Engine.create({ text: "工", codes: GONG.slice() });
  e.press("a");
  e.press("a");
  assert.equal(e.state.buffer, "aa");
  e.press("a");
  assert.equal(e.state.buffer, "aaa");
  assert.equal(e.state.done, false, "3 码不应自动上屏");
  const completes = [];
  e.on("complete", (r) => completes.push(r));
  e.press("a");
  assert.equal(e.state.buffer, "aaaa");
  assert.equal(e.state.done, true);
  assert.equal(e.state.result.usedCode, "aaaa");
  assert.equal(completes.length, 1);
});

test("四码纯全码字：输入 4 键立即完成", () => {
  const e = Engine.create({ text: "测", codes: ["abcd"] });
  e.press("a");
  e.press("b");
  e.press("c");
  assert.equal(e.state.done, false);
  e.press("d");
  assert.equal(e.state.done, true);
  assert.equal(e.state.result.usedCode, "abcd");
  assert.equal(e.state.result.firstTry, true);
});

test("退格：删除末码，可重新输入", () => {
  const e = make(MING, { strictLen: 2 });
  e.press("j");
  e.press("e");
  e.backspace();
  assert.equal(e.state.buffer, "j");
  e.backspace();
  assert.equal(e.state.buffer, "");
  e.backspace();
  assert.equal(e.state.buffer, "", "空缓冲区退格应无副作用");
  assert.equal(e.state.errors, 0);
  e.press("j");
  e.press("e");
  e.space();
  assert.equal(e.state.done, true);
  assert.equal(e.state.result.usedCode, "je");
});

test("reset：清空输入与错误，恢复 firstTry", () => {
  const e = make(MING);
  e.press("j");
  e.press("x"); // 制造错误
  e.press("e");
  e.space(); // 完成
  assert.equal(e.state.done, true);
  e.reset();
  assert.equal(e.state.buffer, "");
  assert.equal(e.state.errors, 0);
  assert.equal(e.state.firstTry, true);
  assert.equal(e.state.revealed, false);
  assert.equal(e.state.done, false);
  assert.equal(e.state.result, null);
  // 重置后可重新完成
  e.press("j");
  e.press("e");
  e.space();
  assert.equal(e.state.result.usedCode, "je");
  assert.equal(e.state.result.firstTry, true);
});

test("reveal：返回编码与全码，firstTry 变 false，完成后 result.revealed=true", () => {
  const e = make(MING);
  e.press("j");
  const reveals = [];
  e.on("reveal", (p) => reveals.push(p));
  e.reveal();
  assert.equal(reveals.length, 1);
  assert.equal(reveals[0].code, "je", "chooseCode 应返回最短可用码");
  assert.equal(reveals[0].full, "jeg", "full 应是最长码");
  assert.equal(e.state.revealed, true);
  assert.equal(e.state.firstTry, false);
  assert.equal(e.state.buffer, "");
  // 按揭示的码输入后完成
  e.press("j");
  e.press("e");
  e.space();
  assert.equal(e.state.result.ok, true);
  assert.equal(e.state.result.revealed, true);
  assert.equal(e.state.result.firstTry, false);
});

test("strictLen 不匹配：空格报错并保持缓冲区", () => {
  const e = make(MING, { strictLen: 2 });
  const errs = [];
  e.on("error", (p) => errs.push(p));
  e.press("j");
  e.space();
  assert.equal(e.state.done, false);
  assert.equal(e.state.buffer, "j");
  assert.equal(errs.length, 1);
  assert.equal(errs[0].message, "本关需要 2 码，现在 1 码。");
  assert.equal(e.state.errors, 1);
  assert.equal(e.state.firstTry, false);
  // 补齐后仍可上屏
  e.press("e");
  e.space();
  assert.equal(e.state.done, true);
  assert.equal(e.state.result.usedCode, "je");
  assert.equal(e.state.result.firstTry, false);
});

test("strictLen 已满后继续按键：报『已经是 N 码』", () => {
  const e = make(MING, { strictLen: 2 });
  e.press("j");
  e.press("e");
  const errs = [];
  e.on("error", (p) => errs.push(p));
  e.press("j"); // 第 3 个键
  assert.equal(e.state.buffer, "je", "超长按键不得追加");
  assert.equal(errs.length, 1);
  assert.equal(errs[0].message, "已经是 2 码，按空格上屏。");
});

test("空格错误：空缓冲区 / 编码未打全", () => {
  const e = make(MING);
  const errs = [];
  e.on("error", (p) => errs.push(p.message));
  e.space();
  assert.equal(errs[0], "先敲字根，再按空格。");
  e.press("j");
  e.space();
  assert.equal(errs[1], "编码还没打全，看看提示。");
  assert.equal(e.state.done, false);
});

test("错误键不属于任何编码前缀时拒绝（含 4 码边界）", () => {
  const e = Engine.create({ text: "测", codes: ["abcd"] });
  e.press("a");
  e.press("c"); // ac 不是 abcd 前缀
  assert.equal(e.state.buffer, "a");
  assert.equal(e.state.errors, 1);
  // 正常补全
  e.press("b");
  e.press("c");
  e.press("d");
  assert.equal(e.state.done, true);
});

test("hint / chooseCode / maxLen", () => {
  const e = make(MING, { strictLen: 2 });
  assert.equal(e.maxLen(), 2);
  assert.equal(e.chooseCode(), "je");
  assert.equal(e.hint(), "j");
  e.press("j");
  assert.equal(e.hint(), "e");
  e.press("e");
  assert.equal(e.hint(), " ", "已输入码长时提示空格");
});

test("完成后的 press/space/reveal/backspace 不再生效", () => {
  const e = make(MING, { strictLen: 2 });
  e.press("j");
  e.press("e");
  e.space();
  const done = e.state.done;
  e.press("x");
  e.space();
  e.reveal();
  e.backspace();
  assert.equal(e.state.done, done);
  assert.equal(e.state.result.usedCode, "je");
  assert.equal(e.state.errors, 0);
});

test("结果结构：{ok,firstTry,revealed,errors,ms,usedCode,text,kind}", () => {
  const e = make(MING, { strictLen: 2 });
  let result = null;
  e.on("complete", (r) => { result = r; });
  e.press("j");
  e.press("e");
  e.space();
  assert.ok(result, "complete 事件必须携带结果");
  for (const key of ["ok", "firstTry", "revealed", "errors", "ms", "usedCode", "text", "kind"]) {
    assert.ok(key in result, `结果缺少字段 ${key}`);
  }
  assert.equal(result.ok, true);
  assert.equal(result.firstTry, true);
  assert.equal(result.revealed, false);
  assert.equal(result.errors, 0);
  assert.equal(result.text, "明");
  assert.equal(result.kind, "char");
  assert.equal(typeof result.ms, "number");
  assert.ok(result.ms >= 0);
  assert.equal(result.usedCode, "je");
});
