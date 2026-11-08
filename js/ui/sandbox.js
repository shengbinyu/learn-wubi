/* 字根工坊 · 沙盒 / 拆字台 */
(function () {
  var ZG = window.ZG = window.ZG || {};
  var U = ZG.Util;
  var UI = ZG.UI;
  var h = U.el;

  var S = null;

  function settings() { return ZG.Progress.get().settings; }

  function cleanup() {
    if (!S) return;
    if (S.detach) S.detach();
    if (S.timer) clearTimeout(S.timer);
    S = null;
  }

  function refreshTop() { if (ZG.App && ZG.App.refreshTop) ZG.App.refreshTop(); }

  function newAchievementToast() {
    var gained = ZG.Progress.checkAchievements();
    gained.forEach(function (a) { UI.toast("成就 · " + a.title, "seal", 3200); });
  }

  function render(root, params) {
    cleanup();
    var initial = (params && params.ch) || "明";
    if (!ZG.Dict.has(initial)) initial = "明";
    S = { stageHost: null, keyboard: null, engine: null, mode: "char", text: initial, combo: 0, timer: null };

    var searchInput = h("input", {
      class: "text-input", id: "sandboxSearch", type: "text", placeholder: "输入汉字/词组，回车开练",
      autocomplete: "off", spellcheck: "false", "aria-label": "查找汉字或词组"
    });
    searchInput.addEventListener("keydown", function (ev) { if (ev.key === "Enter") { ev.preventDefault(); search(); } });

    var poolSelect = h("select", { class: "select-input", id: "poolSelect", "aria-label": "随机字池" },
      h("option", { value: "c2" }, "常用 · 二级"),
      h("option", { value: "c3" }, "三级字"),
      h("option", { value: "all" }, "全部单字")
    );

    var left = h("div", { class: "sandbox-col sandbox-left" },
      UI.panel("找字", h("div", { class: "search-block" },
        h("div", { class: "search-row" }, searchInput, UI.button("查", { kind: "seal", onClick: search })),
        h("div", { class: "quick-row" }, ["明", "好", "国", "远", "你", "中"].map(function (ch) {
          return h("button", { class: "quick-char", type: "button", onClick: function () { setChar(ch); } }, ch);
        }))
      )),
      UI.panel("玩法", h("div", { class: "mode-list" },
        UI.button("随机一字", { kind: "ghost", onClick: randomChar }),
        UI.button("粘贴跟打", { kind: "ghost", onClick: startPaste }),
        UI.button("拼字台", { kind: "ghost", onClick: startCompose }),
        UI.button("字帖墙", { kind: "ghost", onClick: showWall })
      )),
      UI.panel("随机字池", h("div", { class: "inline-row" }, poolSelect)),
      UI.panel("最近拓印", h("div", { class: "recent-mini", id: "recentMini" }))
    );

    var stageHead = h("div", { class: "sandbox-stage-head" });
    S.stageHost = h("div", { class: "sandbox-stage-host" });
    var keyboardHost = h("div", { class: "keyboard-wrap" });
    var center = h("div", { class: "sandbox-col sandbox-center" },
      stageHead,
      S.stageHost,
      keyboardHost
    );

    var grid = h("div", { class: "sandbox-grid" }, left, center);
    var page = h("div", { class: "page page-sandbox" },
      UI.pageHead({
        seal: "沙", title: "拆字台", sub: "自由练字 · 查码 · 跟打 · 拼字",
        actions: [
          UI.button("随机一字", { kind: "ghost", onClick: randomChar }),
          UI.button("看答案", { kind: "seal", onClick: reveal })
        ]
      }),
      grid
    );

    UI.mount(root, page);

    S.keyboard = UI.Keyboard.create({ onVirtual: handleLetter });
    keyboardHost.appendChild(S.keyboard.root);

    S.detach = UI.Keyboard.attachTyping({
      onLetter: handleLetter,
      onSpace: function () { if (S.engine) S.engine.space(); },
      onBackspace: function () { if (S.engine) S.engine.backspace(); },
      onEscape: function () { if (S.engine) S.engine.reset(); }
    });

    renderRecentMini();
    setChar(initial);
    if (ZG.App && ZG.App.setCleanup) ZG.App.setCleanup(cleanup);
  }

  function renderRecentMini() {
    var box = document.querySelector("#recentMini");
    if (!box) return;
    UI.clear(box);
    var recent = ZG.Progress.get().recent;
    if (!recent.length) {
      box.appendChild(h("p", { class: "muted" }, "还没有拓印的字。"));
      return;
    }
    recent.slice(0, 8).forEach(function (r) {
      box.appendChild(h("button", {
        class: "mini-char", type: "button", title: "再练「" + r.text + "」",
        onClick: function () { setChar(r.text); }
      }, r.text));
    });
  }

  function setHead(title, sub, actions) {
    var head = document.querySelector(".sandbox-stage-head");
    if (!head) return;
    UI.clear(head);
    head.appendChild(h("div", { class: "stage-title" },
      h("span", { class: "stage-kicker" }, sub || ""),
      h("h2", {}, title || "")
    ));
    var act = h("div", { class: "stage-actions" });
    (actions || []).forEach(function (a) { if (a) act.appendChild(a); });
    head.appendChild(act);
  }

  function handleLetter(k) {
    if (!S || !S.engine) return;
    S.engine.press(k);
    if (S.keyboard) S.keyboard.flash(k, "ok");
  }

  function search() {
    var input = document.querySelector("#sandboxSearch");
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;
    if (ZG.Dict.has(text)) {
      if (text.length === 1 || ZG.Dict.isWord(text)) setChar(text);
      else startStream(text);
      return;
    }
    if (/^[\u3400-\u9fff]+$/.test(text)) {
      var known = Array.from(text).filter(function (ch) { return ZG.Dict.has(ch); });
      if (known.length >= 2) { startStream(text); return; }
    }
    UI.toast("词库未收录「" + text + "」；试试单字或常用词组。", "error");
  }

  function randomText() {
    var sel = document.querySelector("#poolSelect");
    var mode = sel ? sel.value : "c2";
    var pool;
    if (mode === "c3") pool = ZG.Dict.pools().c3;
    else if (mode === "all") pool = Object.keys(ZG.Dict.state.chars);
    else pool = ZG.Dict.pools().c2;
    if (!pool || !pool.length) pool = Object.keys(ZG.Dict.state.chars);
    var ch = pool[Math.floor(Math.random() * pool.length)];
    return ch;
  }

  function randomChar() {
    if (!S) return;
    setChar(randomText());
  }

  function setChar(text, opts) {
    if (!S) return;
    if (S.timer) { clearTimeout(S.timer); S.timer = null; }
    S.mode = "char";
    S.text = text;
    S.combo = 0;
    S.lastError = "";
    S.engine = ZG.Engine.create({
      text: text,
      kind: ZG.Dict.isWord(text) ? "word" : "char",
      codes: ZG.Dict.codesOf(text),
      strictLen: 0,
      autoSpace: !!settings().autoSpace
    });
    bindCharEngine(S.engine);
    setHead("单字 · " + text, "自由练习", [
      UI.button("再打一次", { kind: "ghost", onClick: function () { if (S.engine) { S.engine.reset(); S.combo = 0; updateChar(); } } }),
      UI.button("随机", { kind: "ghost", onClick: randomChar })
    ]);
    renderCharStage();
    fillAside();
    if (S.keyboard) S.keyboard.setEnabled(true);
    if (opts && opts.focusSearch) {
      var input = document.querySelector("#sandboxSearch");
      if (input) input.focus();
    }
  }

  function bindCharEngine(eng) {
    eng.on("update", function () { if (S && S.engine === eng) updateChar(); });
    eng.on("error", function (data) {
      if (!S || S.engine !== eng) return;
      S.combo = 0;
      S.lastError = data.message;
      ZG.Audio.play("error");
      if (S.keyboard && data.key && /^[a-y]$/.test(data.key)) S.keyboard.flash(data.key, "bad");
      updateChar();
    });
    eng.on("reveal", function (data) {
      if (!S || S.engine !== eng) return;
      S.combo = 0;
      ZG.Audio.play("page");
      UI.toast("编码：" + data.code + (data.full !== data.code ? "（全码 " + data.full + "）" : ""), "info", 3200);
      updateChar();
    });
    eng.on("complete", function (res) {
      if (!S || S.engine !== eng) return;
      completeChar(res);
    });
  }

  function renderCharStage() {
    if (!S || !S.stageHost) return;
    var text = S.text;
    UI.clear(S.stageHost);
    var row = h("div", { class: "sandbox-char-row" });
    var card = UI.CharCard.render(text, { codes: ZG.Dict.codesOf(text) });
    row.appendChild(card);
    S.stageHost.appendChild(row);

    S.stickHost = h("div", { class: "stick-host" });
    S.hintHost = h("div", { class: "hint-host" });
    S.actionHost = h("div", { class: "sandbox-actions" });
    S.stageHost.appendChild(S.hintHost);
    S.stageHost.appendChild(S.stickHost);
    S.stageHost.appendChild(S.actionHost);
    updateChar();
  }

  function updateChar() {
    if (!S || !S.stageHost || !S.engine) return;
    var eng = S.engine;
    var text = S.text;
    var hint = UI.CharCard.hintFor(text, eng.state.buffer, 0);
    var code = hint.code || ZG.Dict.preferredCode(text) || "";
    if (S.stickHost) {
      UI.clear(S.stickHost);
      S.stickHost.appendChild(UI.CharCard.stick(code, eng.state.buffer, {
        showSpace: code.length < 4 && !eng.state.done,
        done: eng.state.done
      }));
    }
    if (S.hintHost) {
      UI.clear(S.hintHost);
      if (S.lastError) S.hintHost.appendChild(h("p", { class: "hint-error" }, S.lastError));
      if (settings().hints && !eng.state.done) {
        S.hintHost.appendChild(UI.CharCard.hintLine(text, eng.state.buffer, 0));
      } else if (eng.state.done) {
        S.hintHost.appendChild(h("p", { class: "hint-done" }, "已上屏 · 用时 " + (eng.result ? (eng.result.ms / 1000).toFixed(1) + "s" : "—")));
      } else {
        S.hintHost.appendChild(h("p", { class: "muted" }, "提示已关；可在设置里打开。"));
      }
    }
    if (S.keyboard) {
      if (settings().hints && !eng.state.done && hint.key !== " ") S.keyboard.setHint(hint.key);
      else S.keyboard.clearHint();
    }
    if (S.actionHost) {
      UI.clear(S.actionHost);
      if (eng.state.done) {
        S.actionHost.appendChild(UI.button("再打一次", { kind: "primary", onClick: function () { eng.reset(); S.combo = 0; S.lastError = ""; updateChar(); } }));
        S.actionHost.appendChild(UI.button("下一个", { kind: "ghost", onClick: randomChar }));
      } else {
        S.actionHost.appendChild(UI.button("看答案", { kind: "seal", onClick: reveal }));
        S.actionHost.appendChild(UI.button("清空", { kind: "ghost", onClick: function () { eng.reset(); S.combo = 0; S.lastError = ""; updateChar(); } }));
      }
    }
    if (eng.state.done) {
      var card = S.stageHost.querySelector(".char-card");
      if (card) card.classList.add("is-printed");
    }
  }

  function completeChar(res) {
    if (!S) return;
    var text = S.text;
    ZG.Progress.record(text, ZG.Dict.isWord(text) ? "word" : "char", res.firstTry, res.ms);
    var st = ZG.Progress.get();
    if (res.firstTry) {
      S.combo += 1;
      var best = st.totals.bestCombo || 0;
      if (S.combo > best) ZG.Progress.bump("bestCombo", S.combo - best);
    } else {
      S.combo = 0;
    }
    var xp = Math.round(10 * Math.min(2, 1 + Math.max(0, S.combo - 1) * 0.06));
    ZG.Progress.addXp(xp);
    ZG.Audio.play("ok");
    UI.toast("拓印 · " + text + "  " + res.usedCode + (res.firstTry ? " · 一次就对" : ""), res.firstTry ? "ok" : "info");
    newAchievementToast();
    refreshTop();
    renderRecentMini();
    fillAside();
    updateChar();
  }

  function reveal() {
    if (!S || !S.engine) return;
    if (S.engine.state.done) return;
    S.engine.reveal();
  }

  /* ---------- 跟打 ---------- */

  function startPaste() {
    if (!S) return;
    if (S.timer) { clearTimeout(S.timer); S.timer = null; }
    S.mode = "paste";
    S.engine = null;
    setHead("粘贴跟打", "整段文字 · 逐字过", []);
    UI.clear(S.stageHost);
    var ta = h("textarea", { class: "textarea-input", rows: "6", placeholder: "粘贴一段中文（最多 120 字），标点会跳过。", "aria-label": "粘贴文本" });
    var start = UI.button("开始跟打", {
      kind: "primary",
      onClick: function () { startStream(ta.value); }
    });
    S.stageHost.appendChild(h("div", { class: "paste-panel" },
      h("p", { class: "muted" }, "适合把正在读的一段话拿来练。遇到词库未收录的字会自动跳过。"),
      ta, h("div", { class: "paste-actions" }, start)
    ));
    if (S.keyboard) S.keyboard.setEnabled(false);
    fillAside("paste");
    setTimeout(function () { try { ta.focus(); } catch (e) { /* ignore */ } }, 60);
  }

  function startStream(text) {
    if (!S) return;
    if (S.timer) { clearTimeout(S.timer); S.timer = null; }
    var chars = Array.from(text || "").filter(function (ch) { return ZG.Dict.has(ch); });
    if (chars.length < 1) { UI.toast("这段话没有可练的字。", "error"); return; }
    if (chars.length > 120) chars = chars.slice(0, 120);
    S.mode = "stream";
    S.stream = { chars: chars, idx: 0, firstTry: 0, ms: 0, done: 0, started: Date.now(), source: text };
    setHead("跟打", "逐字过 · " + chars.length + " 字", [
      UI.button("结束", { kind: "ghost", onClick: function () { showWall(); } })
    ]);
    if (S.keyboard) S.keyboard.setEnabled(true);
    nextStreamChar();
  }

  function nextStreamChar() {
    if (!S || !S.stream) return;
    var st = S.stream;
    if (st.idx >= st.chars.length) { showStreamResult(); return; }
    var text = st.chars[st.idx];
    S.text = text;
    S.engine = ZG.Engine.create({
      text: text,
      kind: "char",
      codes: ZG.Dict.codesOf(text),
      strictLen: 0,
      autoSpace: !!settings().autoSpace
    });
    var eng = S.engine;
    eng.on("update", function () { if (S && S.engine === eng) updateStream(); });
    eng.on("error", function (data) {
      if (!S || S.engine !== eng) return;
      S.lastError = data.message;
      ZG.Audio.play("error");
      if (S.keyboard && data.key && /^[a-y]$/.test(data.key)) S.keyboard.flash(data.key, "bad");
      updateStream();
    });
    eng.on("reveal", function (data) {
      if (!S || S.engine !== eng) return;
      ZG.Audio.play("page");
      UI.toast("编码：" + data.code, "info", 2000);
      updateStream();
    });
    eng.on("complete", function (res) {
      if (!S || S.engine !== eng) return;
      ZG.Progress.record(text, "char", res.firstTry, res.ms);
      st.firstTry += res.firstTry ? 1 : 0;
      st.ms += res.ms;
      st.done += 1;
      ZG.Progress.addXp(res.firstTry ? 10 : 6);
      if (res.firstTry) ZG.Audio.play("ok");
      refreshTop();
      st.idx += 1;
      if (st.idx >= st.chars.length) {
        showStreamResult();
      } else {
        S.timer = setTimeout(function () { if (S && S.mode === "stream") nextStreamChar(); }, 120);
      }
    });
    renderStreamStage();
  }

  function renderStreamStage() {
    if (!S || !S.stream || !S.stageHost) return;
    var st = S.stream;
    var text = st.chars[st.idx];
    UI.clear(S.stageHost);
    S.streamMeta = h("div", { class: "stream-meta" });
    S.streamLine = h("div", { class: "stream-line" });
    S.stageHost.appendChild(S.streamMeta);
    S.stageHost.appendChild(S.streamLine);
    var row = h("div", { class: "sandbox-char-row" });
    row.appendChild(UI.CharCard.render(text, { codes: ZG.Dict.codesOf(text) }));
    S.stageHost.appendChild(row);
    S.stickHost = h("div", { class: "stick-host" });
    S.hintHost = h("div", { class: "hint-host" });
    S.actionHost = h("div", { class: "sandbox-actions" });
    S.stageHost.appendChild(S.stickHost);
    S.stageHost.appendChild(S.hintHost);
    S.stageHost.appendChild(S.actionHost);
    S.actionHost.appendChild(UI.button("看答案", { kind: "seal", onClick: reveal }));
    S.actionHost.appendChild(UI.button("结束", { kind: "ghost", onClick: function () { showStreamResult(); } }));
    buildStreamLine();
    updateStream();
  }

  function buildStreamLine() {
    if (!S || !S.stream || !S.streamLine) return;
    var st = S.stream;
    UI.clear(S.streamLine);
    var start = Math.max(0, st.idx - 12);
    var end = Math.min(st.chars.length, st.idx + 24);
    if (start > 0) S.streamLine.appendChild(h("span", { class: "stream-ellipsis" }, "…"));
    for (var i = start; i < end; i++) {
      S.streamLine.appendChild(h("span", {
        class: "stream-char" + (i < st.idx ? " is-done" : i === st.idx ? " is-current" : ""),
        "data-i": String(i)
      }, st.chars[i]));
    }
    if (end < st.chars.length) S.streamLine.appendChild(h("span", { class: "stream-ellipsis" }, "…"));
  }

  function updateStream() {
    if (!S || !S.stream || !S.engine) return;
    var st = S.stream;
    var eng = S.engine;
    var text = st.chars[st.idx] || "";
    var hint = UI.CharCard.hintFor(text, eng.state.buffer, 0);
    var code = hint.code || "";
    if (S.streamMeta) {
      UI.clear(S.streamMeta);
      S.streamMeta.appendChild(h("span", { class: "meta-strong" }, "第 " + Math.min(st.idx + 1, st.chars.length) + " / " + st.chars.length + " 字"));
      S.streamMeta.appendChild(h("span", {}, "首试 " + st.firstTry + " · 已过 " + st.done));
      S.streamMeta.appendChild(UI.progressBar(st.idx, st.chars.length, { className: "stream-progress" }));
    }
    if (S.streamLine) {
      Array.prototype.forEach.call(S.streamLine.querySelectorAll(".stream-char"), function (n) {
        var i = Number(n.getAttribute("data-i"));
        n.classList.toggle("is-done", i < st.idx);
        n.classList.toggle("is-current", i === st.idx);
      });
    }
    if (S.stickHost) {
      UI.clear(S.stickHost);
      S.stickHost.appendChild(UI.CharCard.stick(code, eng.state.buffer, { showSpace: code.length < 4, done: eng.state.done }));
    }
    if (S.hintHost) {
      UI.clear(S.hintHost);
      if (S.lastError) S.hintHost.appendChild(h("p", { class: "hint-error" }, S.lastError));
      if (settings().hints) S.hintHost.appendChild(UI.CharCard.hintLine(text, eng.state.buffer, 0));
    }
    if (S.keyboard) {
      if (settings().hints && hint.key !== " ") S.keyboard.setHint(hint.key); else S.keyboard.clearHint();
    }
    if (eng.state.done) {
      var card = S.stageHost.querySelector(".char-card");
      if (card) card.classList.add("is-printed");
    }
  }

  function showStreamResult() {
    if (!S) return;
    if (S.timer) { clearTimeout(S.timer); S.timer = null; }
    var st = S.stream;
    if (!st) { showWall(); return; }
    var total = st.chars.length;
    var done = st.done || st.idx;
    var acc = done ? st.firstTry / done : 0;
    var speed = st.ms > 0 ? done / (st.ms / 60000) : 0;
    S.mode = "result";
    S.engine = null;
    setHead("这一段打完了", "跟打结果", []);
    UI.clear(S.stageHost);
    var result = h("div", { class: "result-card" },
      h("div", { class: "result-seal" }, "印"),
      h("h2", {}, "共 " + done + " 字"),
      h("div", { class: "result-stats" },
        UI.stat("首试正确", UI.pct(acc), { sub: st.firstTry + " / " + done }),
        UI.stat("速度", speed.toFixed(1), { sub: "字 / 分" }),
        UI.stat("用时", (st.ms / 1000).toFixed(1), { sub: "秒" })
      ),
      h("div", { class: "result-actions" },
        UI.button("再打一遍", { kind: "primary", onClick: function () { startStream(st.source); } }),
        UI.button("换一段", { kind: "ghost", onClick: startPaste }),
        UI.button("回字帖墙", { kind: "ghost", onClick: showWall })
      )
    );
    S.stageHost.appendChild(result);
    if (S.keyboard) S.keyboard.setEnabled(false);
    newAchievementToast();
    fillAside("result");
  }

  /* ---------- 拼字台 ---------- */

  function startCompose() {
    if (!S) return;
    if (S.timer) { clearTimeout(S.timer); S.timer = null; }
    var keys = Object.keys(window.ZG_DECOMPOSITIONS || {});
    if (!keys.length) {
      UI.toast("精选拆解还没载入，先用单字练习。", "error");
      return;
    }
    S.mode = "compose";
    S.engine = null;
    var text = keys[Math.floor(Math.random() * keys.length)];
    S.compose = { text: text, entry: window.ZG_DECOMPOSITIONS[text], selected: [], started: Date.now(), wrong: false };
    setHead("拼字台", "按字根顺序点选", [
      UI.button("换一个字", { kind: "ghost", onClick: startCompose })
    ]);
    if (S.keyboard) S.keyboard.setEnabled(false);
    renderCompose();
    fillAside("compose");
  }

  function renderCompose() {
    if (!S || !S.compose || !S.stageHost) return;
    var c = S.compose;
    UI.clear(S.stageHost);
    var entry = c.entry;
    var row = h("div", { class: "sandbox-char-row" });
    row.appendChild(UI.CharCard.render(c.text, { codes: [] }));
    row.appendChild(h("div", { class: "sandbox-facts" },
      h("p", { class: "fact-note" }, entry.note || "把这个字拆成字根，按顺序点选。"),
      h("div", { class: "fact-line" }, h("span", {}, "全码"), h("code", { class: "inline-code" }, entry.full || ZG.Dict.fullCode(c.text) || "—")),
      h("p", { class: "muted" }, "只需点字根；识别码在单字练习里练。")
    ));
    S.stageHost.appendChild(row);

    var selected = h("div", { class: "compose-selected" });
    (entry.roots || []).forEach(function (r, i) {
      var v = c.selected[i];
      selected.appendChild(h("span", { class: "compose-slot" + (v ? " is-filled" : "") },
        v ? v.root : "·", h("small", {}, v ? v.key.toUpperCase() : String(i + 1))
      ));
    });
    S.stageHost.appendChild(h("div", { class: "compose-label" }, h("span", {}, "已选字根"), h("small", {}, "按顺序")));
    S.stageHost.appendChild(selected);

    var chips = h("div", { class: "compose-chips" });
    var correct = (entry.roots || []).map(function (r) { return { root: r[0], key: r[1] }; });
    var distractors = [];
    var allKeys = ZG_ROOTS.keys;
    var guard = 0;
    while (distractors.length < 4 && guard < 80) {
      guard += 1;
      var k = allKeys[Math.floor(Math.random() * allKeys.length)];
      var roots = k.roots || [];
      if (!roots.length) continue;
      var root = roots[Math.floor(Math.random() * roots.length)];
      if (correct.some(function (x) { return x.root === root && x.key === k.key; })) continue;
      if (distractors.some(function (x) { return x.root === root; })) continue;
      distractors.push({ root: root, key: k.key });
    }
    var choices = U.shuffle(correct.concat(distractors));
    choices.forEach(function (ch) {
      chips.appendChild(h("button", {
        class: "compose-chip " + UI.zoneClass((ZG_ROOTS.byKey[ch.key] || {}).zoneName),
        type: "button",
        onClick: function () { composePick(ch); }
      }, h("b", {}, ch.root), h("small", {}, UI.keyName(ch.key)) ));
    });
    S.stageHost.appendChild(h("div", { class: "compose-label" }, h("span", {}, "字根盘"), h("small", {}, "点选，错了会弹回")));
    S.stageHost.appendChild(chips);
    if (c.wrong) {
      S.stageHost.appendChild(h("p", { class: "hint-error" }, "顺序不对，重新来。"));
    }
  }

  function composePick(ch) {
    if (!S || !S.compose) return;
    var c = S.compose;
    var roots = c.entry.roots || [];
    c.selected.push({ root: ch.root, key: ch.key });
    var i = c.selected.length - 1;
    if (roots[i][1] !== ch.key) {
      c.wrong = true;
      ZG.Audio.play("error");
      setTimeout(function () { if (S && S.compose === c) { c.selected = []; c.wrong = false; renderCompose(); } }, 480);
      renderCompose();
      return;
    }
    ZG.Audio.play("type");
    if (c.selected.length === roots.length) {
      c.wrong = false;
      var ms = Date.now() - c.started;
      ZG.Progress.record(c.text, "char", true, ms);
      ZG.Progress.bump("tray");
      ZG.Progress.addXp(15);
      ZG.Progress.bump("bestCombo", 1);
      newAchievementToast();
      refreshTop();
      ZG.Audio.play("seal");
      UI.toast("拼成「" + c.text + "」· 收入字帖墙", "ok");
      setTimeout(function () { if (S && S.mode === "compose") startCompose(); }, 750);
    }
    renderCompose();
  }

  /* ---------- 字帖墙 ---------- */

  function showWall() {
    if (!S) return;
    if (S.timer) { clearTimeout(S.timer); S.timer = null; }
    S.mode = "wall";
    S.engine = null;
    setHead("字帖墙", "最近拓印的字", []);
    UI.clear(S.stageHost);
    var recent = ZG.Progress.get().recent;
    if (!recent.length) {
      S.stageHost.appendChild(UI.empty("墙上还是空的。去敲一个「明」。", { seal: "印", action: UI.button("随机一字", { kind: "primary", onClick: randomChar }) }));
    } else {
      var wall = h("div", { class: "wall-grid" });
      recent.forEach(function (r) {
        wall.appendChild(UI.CharCard.render(r.text, {
          compact: true, mastery: r.box, clickable: true,
          onClick: function () { setChar(r.text); }
        }));
      });
      S.stageHost.appendChild(wall);
    }
    if (S.keyboard) S.keyboard.setEnabled(false);
    fillAside("wall");
  }

  /* ---------- 右栏 ---------- */

  function fillAside(mode) {
    if (!S) return;
    mode = mode || S.mode;
    var wrap = h("div", { class: "aside-stack" });
    if (mode === "char" && S.text) {
      var text = S.text;
      var e = ZG.Progress.get().chars[text];
      wrap.appendChild(UI.panel("拆解", UI.CharCard.decomp(text)));
      wrap.appendChild(UI.panel("编码", h("div", { class: "aside-codes" },
        UI.codeChips(ZG.Dict.codesOf(text), { text: text }),
        h("div", { class: "fact-line" }, h("span", {}, "全码"), h("code", { class: "inline-code" }, ZG.Dict.fullCode(text) || "—")),
        h("div", { class: "fact-line" }, h("span", {}, "掌握"), h("span", {}, e ? "复习盒 " + e.box : "尚未记录"))
      )));
    } else if (mode === "stream" && S.stream) {
      var st = S.stream;
      wrap.appendChild(UI.panel("跟打", h("div", { class: "aside-stats" },
        h("p", {}, "当前第 " + Math.min(st.idx + 1, st.chars.length) + " 字，共 " + st.chars.length + " 字。"),
        h("p", { class: "muted" }, "标点与未收录字会自动跳过。"),
        h("p", {}, "首试 " + st.firstTry + " · 已过 " + st.done)
      )));
      wrap.appendChild(UI.panel("小笺", h("p", { class: "muted" }, "跟打不追速度，先把每个字拆对。")));
    } else if (mode === "compose" && S.compose) {
      wrap.appendChild(UI.panel("拼字", h("div", { class: "aside-stats" },
        h("p", {}, "按字根顺序点选。选错一个字根会弹回重来。"),
        h("p", { class: "muted" }, "拼成后计入「拼字二十」成就。")
      )));
    } else if (mode === "paste") {
      wrap.appendChild(UI.panel("跟打", h("p", { class: "muted" }, "粘贴一段 120 字以内的中文，逐字练。")));
    } else {
      wrap.appendChild(UI.panel("字帖墙", h("p", { class: "muted" }, "最近 12 个拓印的字，点一下就能再练。")));
    }
    UI.setAside(wrap);
  }

  ZG.UI.Sandbox = { render: render, cleanup: cleanup };
})();
