/* 字根工坊 · 编码输入状态机 */
(function () {
  var ZG = window.ZG = window.ZG || {};

  function create(opts) {
    opts = opts || {};
    var codes = (opts.codes || []).filter(function (c) { return typeof c === "string" && /^[a-y]{1,4}$/.test(c); });
    if (!codes.length) codes = ["a"];
    var strictLen = opts.strictLen || 0;
    var autoSpace = !!opts.autoSpace;
    var allowed = strictLen > 0 ? codes.filter(function (c) { return c.length === strictLen; }) : codes;
    if (!allowed.length) allowed = codes;

    var listeners = {};
    var state = {
      text: opts.text || "",
      kind: opts.kind || "char",
      codes: codes,
      allowed: allowed,
      strictLen: strictLen,
      autoSpace: autoSpace,
      buffer: "",
      errors: 0,
      firstTry: true,
      revealed: false,
      startedAt: 0,
      done: false,
      result: null
    };

    function on(ev, fn) {
      (listeners[ev] = listeners[ev] || []).push(fn);
      return function () { listeners[ev] = (listeners[ev] || []).filter(function (f) { return f !== fn; }); };
    }

    function emit(ev, data) {
      (listeners[ev] || []).forEach(function (fn) { try { fn(data); } catch (e) { /* isolate UI */ } });
    }

    function now() { return Date.now(); }
    function start() { if (!state.startedAt) state.startedAt = now(); }
    function prefixPossible(buf) {
      return state.codes.some(function (c) { return c.slice(0, buf.length) === buf; });
    }
    function exact(buf) {
      return state.allowed.filter(function (c) { return c === buf; });
    }
    function maxLen() {
      return state.allowed.reduce(function (n, c) { return Math.max(n, c.length); }, 0);
    }
    function chooseCode() {
      if (!state.buffer) return state.allowed[0];
      var starts = state.allowed.filter(function (c) { return c.slice(0, state.buffer.length) === state.buffer; });
      if (!starts.length) return state.allowed[0];
      starts.sort(function (a, b) { return a.length - b.length || (a < b ? -1 : 1); });
      return starts[0];
    }

    function fail(message, key) {
      state.errors += 1;
      state.firstTry = false;
      emit("error", { message: message, count: state.errors, key: key || "" });
    }

    function complete(code) {
      state.done = true;
      state.startedAt = state.startedAt || now();
      state.result = {
        ok: true,
        firstTry: state.firstTry && !state.revealed && state.errors === 0,
        revealed: state.revealed,
        errors: state.errors,
        ms: Math.max(0, now() - state.startedAt),
        usedCode: code,
        text: state.text,
        kind: state.kind
      };
      emit("complete", state.result);
    }

    function press(key) {
      if (state.done) return;
      if (!/^[a-y]$/.test(key)) return;
      start();
      if (strictLen > 0 && state.buffer.length >= strictLen) {
        fail("已经是 " + strictLen + " 码，按空格上屏。", key);
        return;
      }
      if (state.buffer.length >= 4) {
        fail("最多四码，按空格或退格。", key);
        return;
      }
      var candidate = state.buffer + key;
      if (!prefixPossible(candidate)) {
        fail("这个键不在当前编码里。", key);
        return;
      }
      state.buffer = candidate;
      emit("update", snapshot());
      var done = exact(state.buffer);
      if (done.length) {
        if (state.buffer.length === 4) { complete(state.buffer); return; }
        if (autoSpace && strictLen === 0) { complete(state.buffer); return; }
      }
      if (state.buffer.length === 4) {
        fail("四码已满，按空格或退格。", key);
      }
    }

    function space() {
      if (state.done) return;
      start();
      if (!state.buffer) { fail("先敲字根，再按空格。", " "); return; }
      if (strictLen > 0 && state.buffer.length !== strictLen) {
        fail("本关需要 " + strictLen + " 码，现在 " + state.buffer.length + " 码。", " ");
        return;
      }
      var done = exact(state.buffer);
      if (done.length) { complete(done[0]); return; }
      fail("编码还没打全，看看提示。", " ");
    }

    function backspace() {
      if (state.done) return;
      if (!state.buffer) return;
      state.buffer = state.buffer.slice(0, -1);
      emit("update", snapshot());
    }

    function reveal() {
      if (state.done) return;
      state.revealed = true;
      state.firstTry = false;
      state.buffer = "";
      var code = chooseCode();
      emit("reveal", { code: code, full: state.codes.slice().sort(function (a, b) { return b.length - a.length; })[0] });
      emit("update", snapshot());
    }

    function reset() {
      state.buffer = "";
      state.errors = 0;
      state.firstTry = true;
      state.revealed = false;
      state.startedAt = 0;
      state.done = false;
      state.result = null;
      emit("update", snapshot());
    }

    function snapshot() {
      return {
        buffer: state.buffer,
        errors: state.errors,
        firstTry: state.firstTry,
        revealed: state.revealed,
        done: state.done,
        startedAt: state.startedAt
      };
    }

    function hint() {
      var code = chooseCode();
      if (state.buffer.length >= code.length) return " ";
      return code[state.buffer.length];
    }

    return {
      state: state,
      on: on,
      press: press,
      space: space,
      backspace: backspace,
      reveal: reveal,
      reset: reset,
      hint: hint,
      chooseCode: chooseCode,
      maxLen: maxLen
    };
  }

  ZG.Engine = { create: create };
})();
