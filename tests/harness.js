/* 字根工坊 · Node 测试夹具
 *
 * 用 vm.runInThisContext 在 Node v24 里加载游戏的传统 <script> 文件：
 *   - 游戏脚本都是 IIFE，只挂到 window.ZG / window.WUBI_* 上，没有 DOM 依赖；
 *   - 因此先伪造 localStorage（Map 实现），再令 globalThis.window = globalThis；
 *   - 加载顺序即 index.html 的依赖顺序；Dict.init() 在 load() 末尾调用，
 *     因为 Progress.init() 的成就检查会调用 ZG.Dict.rankOf()。
 *
 * 注意：Progress 模块的 demo 标志是闭包内的一次性开关，init() 不会重置它。
 * freshProgress() 通过重新执行 js/core/progress.js 拿到全新的闭包状态。
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");

function abs(rel) {
  return path.join(ROOT, rel.split("/").join(path.sep));
}

const PATHS = {
  root: ROOT,
  chars: abs("data/wubi86-chars.js"),
  words: abs("data/wubi86-words.js"),
  roots: abs("js/data/roots.js"),
  lessons: abs("js/data/lessons.js"),
  util: abs("js/core/util.js"),
  dict: abs("js/core/dict.js"),
  levels: abs("js/core/levels.js"),
  progress: abs("js/core/progress.js"),
  engine: abs("js/core/engine.js"),
  audio: abs("js/core/audio.js"),
  decompositions: abs("js/data/decompositions.js"),
  passages: abs("js/data/passages.js"),
  buildReport: abs("data/build-report.json")
};

/** 依赖顺序；前 8 个必须有，audio 不参与测试。 */
const SCRIPTS = [
  "chars",
  "words",
  "roots",
  "lessons",
  "util",
  "dict",
  "levels",
  "progress",
  "engine"
];

/** 只读 localStorage 语义的 Map 实现（Node 端没有 DOM Storage）。 */
class LocalStorageStub {
  constructor() {
    this._map = new Map();
  }
  get length() {
    return this._map.size;
  }
  key(index) {
    const keys = Array.from(this._map.keys());
    return index >= 0 && index < keys.length ? keys[index] : null;
  }
  getItem(key) {
    key = String(key);
    return this._map.has(key) ? this._map.get(key) : null;
  }
  setItem(key, value) {
    this._map.set(String(key), String(value));
  }
  removeItem(key) {
    this._map.delete(String(key));
  }
  clear() {
    this._map.clear();
  }
}

const storage = new LocalStorageStub();

// 游戏脚本里出现 window / localStorage 的裸引用，必须挂到 globalThis 上。
function ensureGlobals() {
  if (globalThis.window !== globalThis) globalThis.window = globalThis;
  if (!globalThis.localStorage) globalThis.localStorage = storage;
}

ensureGlobals();

const loaded = new Set();

function runFile(name) {
  const filename = PATHS[name];
  if (!filename) throw new Error("harness: 未知脚本 key: " + name);
  if (!fs.existsSync(filename)) throw new Error("harness: 脚本不存在: " + filename);
  vm.runInThisContext(fs.readFileSync(filename, "utf8"), { filename: filename });
}

/** 按依赖顺序加载全部核心脚本（幂等），并初始化 Dict。 */
function load() {
  ensureGlobals();
  for (const name of SCRIPTS) {
    if (loaded.has(name)) continue;
    runFile(name);
    loaded.add(name);
  }
  const ZG = globalThis.ZG;
  if (ZG && ZG.Dict && ZG.Dict.state && !ZG.Dict.state.ready) ZG.Dict.init();
  return ZG;
}

/**
 * 重新执行某个脚本，得到全新的模块闭包（用于重置 Progress 的 demo 标志）。
 * 只推荐 reload("progress") / reload("dict")。
 */
function reload(name) {
  ensureGlobals();
  runFile(name);
  loaded.add(name);
  const ZG = globalThis.ZG;
  if (name === "dict" && ZG && ZG.Dict && !ZG.Dict.state.ready) ZG.Dict.init();
  return ZG;
}

/** 加载可选数据脚本（decompositions / passages），不存在则返回 false。 */
function loadScript(name) {
  const filename = PATHS[name];
  if (!filename || !fs.existsSync(filename)) return false;
  runFile(name);
  loaded.add(name);
  return true;
}

/**
 * 干净的进度状态：清空 localStorage，重载 progress.js（重置 demo 标志），
 * 然后 Progress.init()。Dict 已由 load() 初始化。
 * @param {object} [opts] 传给 Progress.init 的参数（例如 {demo:true}）
 */
function freshProgress(opts) {
  load();
  ensureGlobals();
  globalThis.localStorage.clear();
  reload("progress");
  const ZG = globalThis.ZG;
  if (ZG.Dict && !ZG.Dict.state.ready) ZG.Dict.init();
  return ZG.Progress.init(opts || {});
}

function hasFile(nameOrRel) {
  const target = PATHS[nameOrRel] || abs(nameOrRel);
  return fs.existsSync(target);
}

const STORAGE_KEY = "zg.v1";
const BACKUP_KEY = "zg.v1.bak";

module.exports = {
  ROOT,
  PATHS,
  FILES: PATHS,
  SCRIPTS,
  STORAGE_KEY,
  BACKUP_KEY,
  storage,
  load,
  reload,
  loadScript,
  freshProgress,
  hasFile
};
