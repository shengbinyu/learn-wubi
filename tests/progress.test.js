/* progress.test.js — ZG.Progress 间隔复习、关卡星级、存档与演示模式
 * 覆盖：record 盒级升降、due 到期、markLevel 保最高星、导出/导入、
 *       损坏存档自愈、统计准确率、每日连续打卡、demo 模式不落盘。
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const H = require("./harness.js");

H.load();
const g = globalThis;
const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;

function P() {
  return g.ZG.Progress;
}

test("record：答对升级 box，答错降回 box 1，到期时间同步", () => {
  H.freshProgress();
  const now = Date.now();
  const r1 = P().record("明", "char", true, 1000);
  assert.equal(r1.box, 1);
  assert.ok(r1.due > now + 9 * MIN, "box 1 的复习间隔应约为 10 分钟");
  assert.equal(r1.extra, null);
  const e = P().get().chars["明"];
  assert.equal(e.seen, 1);
  assert.equal(e.ok, 1);
  assert.equal(e.bad, 0);
  assert.equal(e.box, 1);
  assert.equal(e.ms, 1000);

  const r2 = P().record("明", "char", true, 800);
  assert.equal(r2.box, 2);
  const r3 = P().record("明", "char", true, 700);
  assert.equal(r3.box, 3);
  assert.ok(r3.due > now + 2 * DAY, "box 3 的复习间隔应约为 3 天");

  const r4 = P().record("明", "char", false, 900);
  assert.equal(r4.box, 1, "答错后回到 box 1");
  assert.ok(r4.due > now + 9 * MIN && r4.due < now + 11 * MIN, "答错后 10 分钟内复习");
  assert.equal(e.seen, 4);
  assert.equal(e.ok, 3);
  assert.equal(e.bad, 1);
  assert.equal(P().get().wrongQueue[0].text, "明");
  assert.equal(P().get().wrongQueue[0].kind, "char");
});

test("record：box 最高 5，答对后错误队列移除该字", () => {
  H.freshProgress();
  const r0 = P().record("好", "char", false, 1000);
  assert.equal(r0.box, 1);
  assert.equal(P().get().wrongQueue.length, 1);
  let last = null;
  for (let i = 0; i < 5; i++) last = P().record("好", "char", true, 500);
  assert.equal(last.box, 5, "box 上限为 5");
  const r = P().record("好", "char", true, 500);
  assert.equal(r.box, 5, "box 5 后继续答对仍为 5");
  assert.equal(P().get().wrongQueue.length, 0, "答对后应移出错误队列");
  assert.equal(P().get().chars["好"].bad, 1);
  assert.equal(P().get().chars["好"].ok, 6);
});

test("firstTry 语义：引擎首试错误 → 按失败记录（box 1、错误队列）", () => {
  H.freshProgress();
  const { Engine } = g.ZG;
  const engine = Engine.create({ text: "明", codes: ["je", "jeg"] });
  engine.press("j");
  engine.press("x"); // 首试错误
  engine.press("e");
  engine.space();
  const result = engine.state.result;
  assert.equal(result.ok, true);
  assert.equal(result.firstTry, false);

  const rec = P().record(result.text, result.kind, result.firstTry, result.ms);
  assert.equal(rec.box, 1, "首试不干净应回到 box 1");
  const entry = P().get().chars["明"];
  assert.equal(entry.bad, 1);
  assert.equal(entry.ok, 0);
  assert.equal(P().get().wrongQueue[0].text, "明");
  assert.equal(P().stats().accuracy, 0, "记录 1 次失败，正确率 0");
});

test("due：只返回到期且未掌握的条目，limit 生效", () => {
  H.freshProgress();
  P().record("明", "char", true, 1000);
  P().record("好", "char", false, 1000);
  assert.deepEqual(P().due(), [], "刚记录（未到期）的条目不出现");
  assert.equal(P().due(5).length, 0);

  const chars = P().get().chars;
  chars["明"].due = Date.now() - 1;
  const list = P().due();
  assert.equal(list.length, 1);
  assert.equal(list[0].text, "明");
  assert.equal(list[0].kind, "char");
  assert.equal(list[0].box, 1);
  assert.deepEqual(list[0].codes, g.ZG.Dict.codesOf("明"));

  chars["好"].due = Date.now() - 1;
  assert.equal(P().due(1).length, 1, "limit=1 只返回 1 条");
  assert.equal(P().due(10).length, 2);
  // 已掌握（box 5）不再进入到期队列
  chars["明"].box = 5;
  assert.equal(P().due(10).filter((x) => x.text === "明").length, 0);
});

test("markLevel：只升不降，记录最高星级", () => {
  H.freshProgress();
  const a = P().markLevel("3-1", 2);
  assert.equal(a.prev, 0);
  assert.equal(a.stars, 2);
  assert.equal(a.improved, true);
  const b = P().markLevel("3-1", 1);
  assert.equal(b.prev, 2);
  assert.equal(b.stars, 2, "低星不得覆盖高星");
  assert.equal(b.improved, false);
  assert.equal(P().get().stars["3-1"], 2);
  const c = P().markLevel("3-1", 3);
  assert.equal(c.stars, 3);
  assert.equal(c.improved, true);

  const stats = P().stats();
  assert.equal(stats.stars, 3);
  assert.equal(stats.levelsDone, 1);
  assert.equal(stats.levelsTotal, 33);
});

test("exportJSON / importJSON 往返一致", () => {
  H.freshProgress();
  P().record("明", "char", true, 1000);
  P().record("工作", "word", true, 2400);
  P().markLevel("3-1", 2);
  P().addXp(120);
  const before = P().stats();
  const json = P().exportJSON();
  const parsed = JSON.parse(json);
  assert.equal(parsed.app, "zigen-gongfang");
  assert.equal(parsed.version, 1);
  assert.equal(parsed.data.v, 1);
  assert.ok(typeof parsed.exportedAt === "string");

  H.freshProgress(); // 新开一份干净存档
  assert.equal(P().stats().xp, 0);
  const after = P().importJSON(json);
  assert.equal(after.xp, before.xp);
  assert.equal(after.stars, before.stars);
  assert.equal(after.levelsDone, before.levelsDone);
  assert.equal(after.learnedChars, before.learnedChars);
  assert.equal(after.learnedWords, before.learnedWords);
  assert.equal(after.totalSeen, before.totalSeen);
  assert.equal(after.totalOk, before.totalOk);
  assert.equal(after.accuracy, before.accuracy);
  assert.equal(after.streak, before.streak);
  assert.deepEqual(P().get().stars, { "3-1": 2 });
});

test("损坏存档：备份原始串、重置为可用状态并重写合法存档", () => {
  H.load();
  H.storage.clear();
  g.localStorage.setItem(H.STORAGE_KEY, "not json");
  H.reload("progress");
  const state = P().init();
  assert.equal(state.xp, 0);
  assert.equal(state.v, 1);
  assert.equal(H.storage.getItem(H.BACKUP_KEY), "not json", "原始损坏内容应写入备份键");
  const raw = H.storage.getItem(H.STORAGE_KEY);
  assert.ok(raw && raw !== "not json", "应重写一份新存档");
  const parsed = JSON.parse(raw);
  assert.equal(parsed.v, 1);
  assert.equal(parsed.xp, 0);
  // 自愈后功能正常
  P().record("明", "char", true, 1000);
  assert.equal(P().get().chars["明"].box, 1);
});

test("stats：正确率、总次数、学习量", () => {
  H.freshProgress();
  P().record("明", "char", true, 1000);
  P().record("好", "char", false, 1000);
  let s = P().stats();
  assert.equal(s.totalSeen, 2);
  assert.equal(s.totalOk, 1);
  assert.equal(s.accuracy, 0.5);
  assert.equal(s.learnedChars, 2);
  assert.equal(s.learnedWords, 0);
  assert.equal(s.wrongCount, 1);
  assert.equal(s.due, 0);
  assert.equal(s.mastered, 0);
  assert.equal(s.totalCharsTyped, 2);

  P().record("工作", "word", true, 3000);
  s = P().stats();
  assert.equal(s.totalSeen, 3);
  assert.equal(s.totalOk, 2);
  assert.ok(Math.abs(s.accuracy - 2 / 3) < 1e-12);
  assert.equal(s.learnedWords, 1);
  assert.equal(s.wrongCount, 1, "答对不影响错误队列中的其它字");
});

test("completeDaily：当天只记一次，昨天续签 +1，断签归 1", () => {
  H.freshProgress();
  const U = g.ZG.Util;
  assert.equal(P().completeDaily(), true);
  assert.equal(P().get().daily.done, true);
  assert.equal(P().get().daily.streak, 1);
  assert.equal(P().completeDaily(), false, "当天重复打卡返回 false");

  const st = P().get();
  st.daily.date = U.dateKeyOffset(-1); // 昨天打过卡
  st.daily.done = true;
  st.daily.streak = 4;
  st.daily.best = 6;
  assert.equal(P().completeDaily(), true);
  assert.equal(st.daily.streak, 5, "连续签到应 +1");
  assert.equal(st.daily.date, U.todayKey());
  assert.equal(st.daily.best, 6, "best 取历史最大");

  st.daily.date = U.dateKeyOffset(-2); // 断签
  st.daily.done = true;
  st.daily.streak = 9;
  assert.equal(P().completeDaily(), true);
  assert.equal(st.daily.streak, 1, "断签应从 1 重新开始");
  assert.equal(st.daily.best, 6, "best 只在连续数超过历史时更新");
});

test("demo 模式：record/markLevel/save 均不写 localStorage", () => {
  const state = H.freshProgress({ demo: true });
  assert.equal(P().isDemo(), true);
  assert.equal(state.xp, 1280);
  assert.equal(state.daily.streak, 7);
  assert.equal(state.daily.done, true);
  assert.equal(H.storage.getItem(H.STORAGE_KEY), null);
  assert.equal(H.storage.getItem(H.BACKUP_KEY), null);

  P().record("明", "char", true, 800);
  P().markLevel("9-9", 3);
  P().completeDaily();
  P().addXp(50);
  P().save(true);
  assert.equal(H.storage.getItem(H.STORAGE_KEY), null, "demo 模式不得写入主存档");
  assert.equal(H.storage.getItem(H.BACKUP_KEY), null);
  assert.equal(P().get().xp, 1330, "内存中的 demo 进度仍可变化");
  assert.equal(P().get().stars["9-9"], 3);
  assert.equal(P().stats().levelsTotal, 33);
});
