/* 字根工坊 · 基础工具 */
(function () {
  var ZG = window.ZG = window.ZG || {};
  var U = ZG.Util = {};

  U.$ = function (sel, root) { return (root || document).querySelector(sel); };
  U.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  U.el = function (tag, attrs) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k === "text") node.textContent = v;
      else if (k === "dataset") Object.keys(v).forEach(function (d) { node.dataset[d] = v[d]; });
      else if (k.slice(0, 2) === "on" && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v === true) node.setAttribute(k, "");
      else node.setAttribute(k, String(v));
    });
    for (var i = 2; i < arguments.length; i++) append(node, arguments[i]);
    return node;
  };

  function append(node, child) {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) { child.forEach(function (c) { append(node, c); }); return; }
    node.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  U.append = append;

  U.escape = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  U.clamp = function (n, lo, hi) { return Math.max(lo, Math.min(hi, n)); };
  U.pad2 = function (n) { return n < 10 ? "0" + n : String(n); };

  U.hash = function (str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  };

  U.mulberry32 = function (seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  U.shuffle = function (arr, rng) {
    var out = arr.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  };

  U.sample = function (arr, n, rng) {
    return U.shuffle(arr, rng).slice(0, Math.min(n, arr.length));
  };

  U.todayKey = function (d) {
    d = d || new Date();
    return d.getFullYear() + "-" + U.pad2(d.getMonth() + 1) + "-" + U.pad2(d.getDate());
  };

  U.dateKeyOffset = function (offset, base) {
    var d = base ? new Date(base) : new Date();
    d.setDate(d.getDate() + offset);
    return U.todayKey(d);
  };

  U.fmtDateCN = function (key) {
    if (!key) return "";
    if (key instanceof Date) key = U.todayKey(key);
    var p = String(key).split("-");
    return p[0] + "年" + parseInt(p[1], 10) + "月" + parseInt(p[2], 10) + "日";
  };

  U.fmtClock = function (ms) {
    ms = Math.max(0, ms || 0);
    var s = Math.floor(ms / 1000);
    var m = Math.floor(s / 60);
    s = s % 60;
    return m + ":" + U.pad2(s);
  };

  U.fmtSpeed = function (chars, ms) {
    if (!ms || ms < 500) return "—";
    return (chars / (ms / 60000)).toFixed(1);
  };

  U.fmtNum = function (n) {
    return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  U.debounce = function (fn, wait) {
    var t = null;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  };

  U.raf = function (fn) { return window.requestAnimationFrame ? requestAnimationFrame(fn) : setTimeout(fn, 16); };

  U.isChineseChar = function (ch) { return /^[\u4e00-\u9fff]$/.test(ch); };
  U.isPunct = function (ch) { return /^[\s\u3000-\u303f\uff00-\uffef，。！？；：、“”‘’（）《》…—·]$/.test(ch); };

  U.prefersReducedMotion = function () {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  };

  U.storage = (function () {
    var ok = false;
    try { localStorage.setItem("__zg_probe", "1"); localStorage.removeItem("__zg_probe"); ok = true; } catch (e) { ok = false; }
    return ok ? window.localStorage : null;
  })();

  U.uid = function (prefix) { return (prefix || "id") + "-" + Math.random().toString(36).slice(2, 8); };
})();
