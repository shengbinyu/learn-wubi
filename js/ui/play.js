/* 字根工坊 · 关卡运行时 */
(function () {
  var ZG = window.ZG = window.ZG || {};
  var U = ZG.Util;
  var UI = ZG.UI;
  var h = U.el;

  var S = null;

  function cleanup() {
    if (!S) return;
    if (S.detach) S.detach();
    if (S.timer) clearTimeout(S.timer);
    S = null;
  }

  function refreshTop() { if (ZG.App && ZG.App.refreshTop) ZG.App.refreshTop(); }

  function toastAchievements() {
    var gained = [];
    try { gained = ZG.Progress.checkAchievements() || []; } catch (e) { gained = []; }
    gained.forEach(function (a) { UI.toast("成就 · " + a.title, "seal", 3200); });
  }

  function parseId(params) {
    if (params && params.id) return params.id;
    var m = /^#\/play\/(.+)$/.exec(window.location.hash);
    return m ? decodeURIComponent(m[1]) : "";
  }

  function render(root, params) {
    cleanup();
    var id = parseId(params);
    var def = ZG.Levels.get(id) || ZG.Levels.defs()[0];
    if (!def) {
      UI.mount(root, UI.empty("没有找到这一关。", { action: UI.linkButton("回卷轴", "#/campaign", { kind: "primary" }) }));
      return;
    }
    S = {
      def: def, items: ZG.Levels.expand(def), idx: 0, done: 0, firstTry: 0, ms: 0,
      total: 0, mode: "intro", finished: false, started: false, timer: null,
      engine: null, keyboard: null, detach: null, stageHost: null, topHost: null,
      visited: {}, totalErrors: 0, combo: 0, itemHadError: false, itemStart: 0,
      missed: [], passage: null, streamIdx: 0, idcStroke: "横", idcStructure: "左右"
    };
    renderIntro(root);
    if (ZG.App && ZG.App.setCleanup) ZG.App.setCleanup(cleanup);
  }

  function renderIntro(root) {
    var def = S.def;
    var best = ZG.Progress.get().stars[def.id] || 0;
    var targets = def.kind === "passage" ? "一段短文" : def.kind === "tour" ? "二十五键" : def.kind === "idcTutorial" ? "十五格" : (def.count || S.items.length) + " 个目标";
    var body = h("div", { class: "play-intro" },
      h("div", { class: "play-intro-seal seal" }, def.chapter),
      h("div", { class: "play-intro-body" },
        h("p", { class: "play-kicker" }, "第 " + def.id + " 关 · " + targets),
        h("h2", {}, def.title),
        h("p", { class: "play-sub" }, def.subtitle),
        h("p", { class: "play-intro-text" }, def.intro),
        h("div", { class: "play-rule" }, h("b", {}, "打法"), h("span", {}, def.rule)),
        h("div", { class: "play-meta" },
          h("span", {}, "最佳 " + "★".repeat(best) + "☆".repeat(3 - best)),
          h("span", {}, "XP +" + (def.xp || 20)),
          h("span", {}, "可重练")
        ),
        h("div", { class: "play-intro-actions" },
          UI.button("开始", { kind: "primary", onClick: start }),
          UI.linkButton("回卷轴", "#/campaign", { kind: "ghost" })
        )
      )
    );

    var page = h("div", { class: "page page-play" },
      UI.pageHead({ seal: def.chapter, title: def.title, sub: def.id + " · " + def.subtitle, actions: [UI.linkButton("回卷轴", "#/campaign", { kind: "ghost" })] }),
      body
    );
    UI.mount(root, page);
    fillAside();
  }

  function start() {
    if (!S || S.started) return;
    S.started = true;
    S.startedAt = Date.now();
    if (S.def.kind === "passage") {
      var text = (S.items[0] && S.items[0].text) || "";
      S.passage = Array.from(text).filter(function (ch) { return ZG.Dict.has(ch); });
      S.total = S.passage.length;
    } else if (S.def.kind === "tour" || S.def.kind === "idcTutorial") {
      S.total = 0;
    } else {
      S.total = S.items.length;
    }
    buildShell();
    bindKeyboard();
    if (S.def.kind === "tour") { S.mode = "tour"; renderTour(); }
    else if (S.def.kind === "idcTutorial") { S.mode = "idc"; renderIdc(); }
    else if (S.def.kind === "passage") { S.mode = "passage"; nextPassageChar(); }
    else if (S.def.kind === "code") { S.mode = "code"; renderCodeItem(); }
    else { S.mode = "quiz"; renderQuizItem(); }
    updateTop();
  }

  function buildShell() {
    var def = S.def;
    S.topHost = h("div", { class: "play-top" });
    S.stageHost = h("div", { class: "play-stage-host" });
    var keyboardHost = h("div", { class: "play-keyboard keyboard-wrap" });
    var page = h("div", { class: "page page-play" },
      UI.pageHead({
        seal: def.chapter, title: def.title, sub: def.id + " · " + def.subtitle,
        actions: [UI.button("退出", { kind: "ghost", onClick: function () { window.location.hash = "#/campaign"; } })]
      }),
      S.topHost,
      S.stageHost,
      keyboardHost
    );
    UI.mount(document.querySelector("#screen"), page);
    S.keyboard = UI.Keyboard.create({ onVirtual: handleVirtual });
    keyboardHost.appendChild(S.keyboard.root);
    updateTop();
    fillAside();
  }

  function bindKeyboard() {
    S.detach = UI.Keyboard.attachTyping({
      onLetter: handleLetter,
      onSpace: function () { if (S && S.engine) S.engine.space(); },
      onBackspace: function () { if (S && S.engine) S.engine.backspace(); },
      onEscape: function () { if (S && S.engine) S.engine.backspace(); }
    });
  }

  function handleVirtual(k) { handleLetter(k); }

  function handleLetter(k) {
    if (!S || S.finished) return;
    if (S.mode === "quiz") answerQuiz(k);
    else if (S.mode === "tour") visitKey(k);
    else if (S.engine) S.engine.press(k);
  }

  function updateTop() {
    if (!S || !S.topHost) return;
    UI.clear(S.topHost);
    var pctDone = S.total > 0 ? S.done / S.total : 0;
    S.topHost.appendChild(h("div", { class: "play-top-main" },
      h("div", { class: "play-top-kicker" }, S.def.id + " · " + S.def.title),
      h("div", { class: "play-top-count" }, S.total > 0 ? S.done + " / " + S.total : (S.def.kind === "tour" ? "二十五键导览" : "识别码讲堂")),
      h("div", { class: "play-top-stats" },
        h("span", {}, "连击 " + S.combo),
        h("span", {}, "误键 " + S.totalErrors)
      )
    ));
    S.topHost.appendChild(h("div", { class: "play-progress" },
      UI.progressBar(pctDone * 100, 100),
      h("span", { class: "play-progress-label" }, Math.round(pctDone * 100) + "%")
    ));
  }

  /* ---------- 小测 ---------- */

  function renderQuizItem() {
    if (!S || S.finished) return;
    if (S.idx >= S.items.length) { finish(); return; }
    var item = S.items[S.idx];
    S.itemStart = Date.now();
    S.itemHadError = false;
    S.quizLocked = false;
    S.combo = 0;
    UI.clear(S.stageHost);
    var isZone = S.def.kind === "quizZone";
    var kicker = isZone ? "第 " + (S.idx + 1) + " 题 · 区位" : "第 " + (S.idx + 1) + " 题 · 字根";
    var main = item.prompt;
    S.quizFeedback = h("div", { class: "quiz-feedback" });
    S.stageHost.appendChild(h("div", { class: "play-prompt" },
      h("div", { class: "prompt-kicker" }, kicker),
      h("div", { class: "prompt-main " + UI.zoneClass(item.zoneName) }, main),
      h("div", { class: "prompt-sub" }, isZone ? "按对应的字母键" : "它住在哪个键上？按那个字母")
    ));
    S.stageHost.appendChild(S.quizFeedback);
    if (S.keyboard) {
      S.keyboard.setEnabled(true);
      S.keyboard.clearHint();
    }
    updateTop();
    fillAside();
  }

  function answerQuiz(k) {
    if (!S || S.finished || S.quizLocked || !/^[a-y]$/.test(k)) return;
    var item = S.items[S.idx];
    if (!item) return;
    if (k === item.answer) {
      S.quizLocked = true;
      var ms = Date.now() - S.itemStart;
      ZG.Progress.recordKey(k, true, ms);
      S.done += 1;
      S.ms += ms;
      if (!S.itemHadError) { S.firstTry += 1; S.combo += 1; }
      else { S.missed.push({ text: item.prompt, code: item.answer }); }
      if (S.keyboard) S.keyboard.flash(k, "ok");
      ZG.Audio.play("ok");
      if (S.quizFeedback) {
        UI.clear(S.quizFeedback);
        S.quizFeedback.className = "quiz-feedback is-ok";
        S.quizFeedback.appendChild(h("b", {}, "对 · " + k.toUpperCase() + " " + UI.keyName(item.answer)));
        S.quizFeedback.appendChild(h("span", {}, item.mnemonic || ""));
      }
      updateTop();
      S.timer = setTimeout(function () {
        if (!S || S.finished) return;
        S.idx += 1;
        if (S.idx >= S.items.length) finish(); else renderQuizItem();
      }, 520);
    } else {
      S.totalErrors += 1;
      S.combo = 0;
      S.itemHadError = true;
      ZG.Progress.recordKey(k, false, 0);
      ZG.Audio.play("error");
      if (S.keyboard) S.keyboard.flash(k, "bad");
      if (S.quizFeedback) {
        UI.clear(S.quizFeedback);
        S.quizFeedback.className = "quiz-feedback is-bad";
        S.quizFeedback.appendChild(h("b", {}, "不对。"));
        if (S.itemHadError) S.quizFeedback.appendChild(h("span", {}, (item.zoneName || "") + "区口诀：" + (item.mnemonic || "")));
      }
      updateTop();
    }
  }

  /* ---------- 编码练习 ---------- */

  function renderCodeItem() {
    if (!S || S.finished) return;
    if (S.idx >= S.items.length) { finish(); return; }
    var item = S.items[S.idx];
    S.itemStart = Date.now();
    S.itemHadError = false;
    S.combo = 0;
    var text = item.text;
    S.engine = ZG.Engine.create({
      text: text,
      kind: ZG.Dict.isWord(text) ? "word" : "char",
      codes: item.codes,
      strictLen: item.strictLen || 0,
      autoSpace: false
    });
    bindCodeEngine(S.engine);
    UI.clear(S.stageHost);
    var row = h("div", { class: "sandbox-char-row" });
    row.appendChild(UI.CharCard.render(text, { codes: item.codes }));
    var facts = h("div", { class: "sandbox-facts" },
      h("div", { class: "fact-line" }, h("span", {}, "目标"), h("b", {}, item.tag || "编码")),
      h("div", { class: "fact-line" }, h("span", {}, "全码"), h("code", { class: "inline-code" }, item.full || ZG.Dict.fullCode(text) || "—")),
      S.def.pool === "idc" ? h("div", { class: "fact-line" }, h("span", {}, "识别码"), h("code", { class: "inline-code" }, (item.idcKey || "").toUpperCase() + " · " + item.stroke + " · " + item.structure)) : null
    );
    row.appendChild(facts);
    S.stageHost.appendChild(row);
    S.stickHost = h("div", { class: "stick-host" });
    S.hintHost = h("div", { class: "hint-host" });
    S.actionHost = h("div", { class: "sandbox-actions" });
    S.stageHost.appendChild(h("div", { class: "compose-label" }, h("span", {}, "排版夹"), h("small", {}, "第 " + (S.idx + 1) + " / " + S.total + " 字")));
    S.stageHost.appendChild(S.stickHost);
    S.stageHost.appendChild(S.hintHost);
    S.stageHost.appendChild(S.actionHost);
    updateCodeUI();
    updateTop();
    if (S.keyboard) S.keyboard.setEnabled(true);
  }

  function bindCodeEngine(eng) {
    eng.on("update", function () { if (S && S.engine === eng) updateCodeUI(); });
    eng.on("error", function (data) {
      if (!S || S.engine !== eng) return;
      S.totalErrors += 1;
      S.itemHadError = true;
      S.combo = 0;
      ZG.Progress.recordKey(data.key, false, 0);
      ZG.Audio.play("error");
      if (S.keyboard && data.key && /^[a-y]$/.test(data.key)) S.keyboard.flash(data.key, "bad");
      updateCodeUI();
    });
    eng.on("reveal", function (data) {
      if (!S || S.engine !== eng) return;
      ZG.Audio.play("page");
      UI.toast("编码：" + data.code + (data.full && data.full !== data.code ? "（全码 " + data.full + "）" : ""), "info", 3000);
      updateCodeUI();
    });
    eng.on("complete", function (res) {
      if (!S || S.engine !== eng) return;
      completeCodeItem(res);
    });
  }

  function updateCodeUI() {
    if (!S || !S.engine) return;
    var item = S.items[S.idx];
    var eng = S.engine;
    var hint = UI.CharCard.hintFor(item.text, eng.state.buffer, item.strictLen || 0);
    var code = hint.code || (item.codes && item.codes[0]) || "";
    if (S.stickHost) {
      UI.clear(S.stickHost);
      S.stickHost.appendChild(UI.CharCard.stick(code, eng.state.buffer, {
        showSpace: (item.strictLen || code.length) < 4 && !eng.state.done,
        done: eng.state.done
      }));
    }
    if (S.hintHost) {
      UI.clear(S.hintHost);
      if (S.itemHadError && !eng.state.done) {
        S.hintHost.appendChild(h("p", { class: "hint-error" }, "这一键不在编码里；看提示，再试一次。"));
      }
      if (settingsHints() && !eng.state.done) S.hintHost.appendChild(UI.CharCard.hintLine(item.text, eng.state.buffer, item.strictLen || 0));
    }
    if (S.keyboard) {
      if (settingsHints() && !eng.state.done && hint.key !== " ") S.keyboard.setHint(hint.key);
      else S.keyboard.clearHint();
    }
    if (S.actionHost) {
      UI.clear(S.actionHost);
      if (!eng.state.done) {
        S.actionHost.appendChild(UI.button("看答案", { kind: "seal", onClick: function () { if (S && S.engine) S.engine.reveal(); } }));
        S.actionHost.appendChild(UI.button("清空", { kind: "ghost", onClick: function () { if (S && S.engine) { S.engine.reset(); S.itemHadError = false; updateCodeUI(); } } }));
      }
    }
    if (eng.state.done) {
      var card = S.stageHost.querySelector(".char-card");
      if (card) card.classList.add("is-printed");
    }
  }

  function completeCodeItem(res) {
    var item = S.items[S.idx];
    ZG.Progress.record(item.text, ZG.Dict.isWord(item.text) ? "word" : "char", res.firstTry, res.ms);
    S.done += 1;
    S.ms += res.ms;
    if (res.firstTry) { S.firstTry += 1; S.combo += 1; } else { S.missed.push({ text: item.text, code: res.usedCode || (item.codes && item.codes[0]) || "" }); }
    if (res.firstTry) ZG.Audio.play("ok"); else ZG.Audio.play("page");
    updateCodeUI();
    updateTop();
    refreshTop();
    S.timer = setTimeout(function () {
      if (!S || S.finished) return;
      S.idx += 1;
      if (S.idx >= S.total) finish(); else renderCodeItem();
    }, 280);
  }

  /* ---------- 跟打 ---------- */

  function nextPassageChar() {
    if (!S || S.finished) return;
    if (!S.passage || !S.passage.length) { finish(); return; }
    if (S.streamIdx >= S.passage.length) { finish(); return; }
    var text = S.passage[S.streamIdx];
    S.itemStart = Date.now();
    S.engine = ZG.Engine.create({ text: text, kind: "char", codes: ZG.Dict.codesOf(text), strictLen: 0, autoSpace: false });
    bindPassageEngine(S.engine);
    UI.clear(S.stageHost);
    S.streamLine = h("div", { class: "stream-line" });
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
    S.actionHost.appendChild(UI.button("看答案", { kind: "seal", onClick: function () { if (S && S.engine) S.engine.reveal(); } }));
    buildPassageLine();
    updatePassageUI();
    updateTop();
    if (S.keyboard) S.keyboard.setEnabled(true);
  }

  function bindPassageEngine(eng) {
    eng.on("update", function () { if (S && S.engine === eng) updatePassageUI(); });
    eng.on("error", function (data) {
      if (!S || S.engine !== eng) return;
      S.totalErrors += 1;
      S.itemHadError = true;
      S.combo = 0;
      ZG.Progress.recordKey(data.key, false, 0);
      ZG.Audio.play("error");
      if (S.keyboard && data.key && /^[a-y]$/.test(data.key)) S.keyboard.flash(data.key, "bad");
      updatePassageUI();
    });
    eng.on("reveal", function (data) {
      if (!S || S.engine !== eng) return;
      ZG.Audio.play("page");
      UI.toast("编码：" + data.code, "info", 2200);
      updatePassageUI();
    });
    eng.on("complete", function (res) {
      if (!S || S.engine !== eng) return;
      var text = S.passage[S.streamIdx];
      ZG.Progress.record(text, "char", res.firstTry, res.ms);
      S.done += 1;
      S.ms += res.ms;
      if (res.firstTry) { S.firstTry += 1; S.combo += 1; } else { S.missed.push({ text: text, code: res.usedCode || "" }); }
      if (res.firstTry) ZG.Audio.play("ok");
      refreshTop();
      S.streamIdx += 1;
      updateTop();
      if (S.streamIdx >= S.passage.length) {
        finish();
      } else {
        S.timer = setTimeout(function () { if (S && S.mode === "passage") nextPassageChar(); }, 100);
      }
    });
  }

  function buildPassageLine() {
    if (!S || !S.streamLine) return;
    UI.clear(S.streamLine);
    var start = Math.max(0, S.streamIdx - 12);
    var end = Math.min(S.passage.length, S.streamIdx + 24);
    if (start > 0) S.streamLine.appendChild(h("span", { class: "stream-ellipsis" }, "…"));
    for (var i = start; i < end; i++) {
      S.streamLine.appendChild(h("span", {
        class: "stream-char" + (i < S.streamIdx ? " is-done" : i === S.streamIdx ? " is-current" : ""),
        "data-i": String(i)
      }, S.passage[i]));
    }
    if (end < S.passage.length) S.streamLine.appendChild(h("span", { class: "stream-ellipsis" }, "…"));
  }

  function updatePassageUI() {
    if (!S || !S.engine) return;
    var text = S.passage[S.streamIdx] || "";
    var eng = S.engine;
    var hint = UI.CharCard.hintFor(text, eng.state.buffer, 0);
    if (S.streamLine) {
      Array.prototype.forEach.call(S.streamLine.querySelectorAll(".stream-char"), function (n) {
        var i = Number(n.getAttribute("data-i"));
        n.classList.toggle("is-done", i < S.streamIdx);
        n.classList.toggle("is-current", i === S.streamIdx);
      });
    }
    if (S.stickHost) {
      UI.clear(S.stickHost);
      S.stickHost.appendChild(UI.CharCard.stick(hint.code || "", eng.state.buffer, { showSpace: (hint.code || "").length < 4, done: eng.state.done }));
    }
    if (S.hintHost) {
      UI.clear(S.hintHost);
      if (S.itemHadError) S.hintHost.appendChild(h("p", { class: "hint-error" }, "这一键不在编码里。"));
      if (settingsHints() && !eng.state.done) S.hintHost.appendChild(UI.CharCard.hintLine(text, eng.state.buffer, 0));
    }
    if (S.keyboard) {
      if (settingsHints() && !eng.state.done && hint.key !== " ") S.keyboard.setHint(hint.key); else S.keyboard.clearHint();
    }
  }

  /* ---------- 导览 ---------- */

  function renderTour() {
    if (!S) return;
    UI.clear(S.stageHost);
    S.visited = S.visited || {};
    var grid = h("div", { class: "key-atlas-grid" });
    (ZG_ROOTS.zones || []).forEach(function (z) {
      var keys = String(z.keys || "").split("");
      var zone = h("section", { class: "atlas-zone " + UI.zoneClass(z.name) },
        h("header", { class: "atlas-head" }, h("b", {}, z.name + "区"), h("span", {}, keys.join(" ")))
      );
      var row = h("div", { class: "atlas-row" });
      keys.forEach(function (letter) {
        var k = ZG_ROOTS.byKey[letter];
        if (!k) return;
        row.appendChild(h("button", {
          class: "atlas-card tour-key", type: "button", "data-key": letter,
          onClick: function () { visitKey(letter); }
        }, h("span", { class: "atlas-key" }, letter.toUpperCase()), h("span", { class: "atlas-name" }, k.name), h("small", {}, k.pos + " 位")));
      });
      zone.appendChild(row);
      grid.appendChild(zone);
    });
    S.tourDetail = h("div", { class: "note-card tour-detail" }, h("p", { class: "muted" }, "点一个键，或者直接按字母。"));
    S.tourCount = h("span", { class: "tour-count" }, "已看 0 / 25");
    S.stageHost.appendChild(h("div", { class: "tour-head" },
      h("div", {}, h("h2", {}, "二十五键 · 五区"), h("p", { class: "muted" }, "认全五个区。看够五个键就能完成导览，也可以全部看完。")),
      S.tourCount
    ));
    S.stageHost.appendChild(grid);
    S.stageHost.appendChild(S.tourDetail);
    S.stageHost.appendChild(h("div", { class: "play-intro-actions" },
      UI.button("完成导览", { kind: "primary", onClick: finishTour }),
      UI.button("回卷轴", { kind: "ghost", onClick: function () { window.location.hash = "#/campaign"; } })
    ));
    if (S.keyboard) S.keyboard.setEnabled(true);
    updateTop();
  }

  function visitKey(k) {
    if (!S || S.finished) return;
    var key = ZG_ROOTS.byKey[k];
    if (!key) return;
    S.visited[k] = true;
    if (S.keyboard) S.keyboard.flash(k, "ok");
    ZG.Audio.play("type");
    var cards = S.stageHost.querySelectorAll(".tour-key");
    Array.prototype.forEach.call(cards, function (n) {
      n.classList.toggle("is-visited", !!S.visited[n.getAttribute("data-key")]);
    });
    var count = Object.keys(S.visited).length;
    if (S.tourCount) S.tourCount.textContent = "已看 " + count + " / 25";
    if (S.tourDetail) {
      UI.clear(S.tourDetail);
      S.tourDetail.appendChild(h("div", { class: "tour-detail-head" },
        h("span", { class: "atlas-key " + UI.zoneClass(key.zoneName) }, key.key.toUpperCase()),
        h("div", {}, h("b", {}, key.name), h("small", {}, key.zoneName + "区 · 第 " + key.pos + " 位"))
      ));
      S.tourDetail.appendChild(h("p", { class: "tour-mnemonic" }, key.mnemonic));
      S.tourDetail.appendChild(h("p", { class: "muted" }, "字根：" + (key.roots || []).join(" · ")));
      S.tourDetail.appendChild(h("p", { class: "muted" }, "例字：" + (key.examples || []).join(" ")));
    }
    updateTop();
  }

  function finishTour() {
    if (!S) return;
    if (Object.keys(S.visited || {}).length < 5) {
      UI.toast("至少看五个键，再完成导览。", "info");
      return;
    }
    finish();
  }

  /* ---------- 识别码讲堂 ---------- */

  function renderIdc() {
    if (!S) return;
    UI.clear(S.stageHost);
    var strokes = ["横", "竖", "撇", "捺", "折"];
    var structures = ["左右", "上下", "杂合"];
    var selectStroke = h("select", { class: "select-input", "aria-label": "末笔" },
      strokes.map(function (s) { return h("option", { value: s }, s); })
    );
    var selectStruct = h("select", { class: "select-input", "aria-label": "字型" },
      structures.map(function (s) { return h("option", { value: s }, s); })
    );
    var result = h("div", { class: "idc-result" });
    function update() {
      S.idcStroke = selectStroke.value;
      S.idcStructure = selectStruct.value;
      var letter = ZG.Levels.IDC_MATRIX[S.idcStroke][S.idcStructure];
      UI.clear(result);
      result.appendChild(h("span", { class: "idc-result-kicker" }, "识别码"));
      result.appendChild(h("b", { class: "idc-letter" }, letter.toUpperCase()));
      result.appendChild(h("span", { class: "idc-explain" }, S.idcStroke + "区 · " + S.idcStructure + "型 → " + letter.toUpperCase() + " 键"));
    }
    selectStroke.addEventListener("change", update);
    selectStruct.addEventListener("change", update);

    var matrix = h("div", { class: "idc-matrix" },
      h("div", { class: "idc-row idc-head-row" }, h("span", {}, "末笔 \\ 字型"), structures.map(function (s) { return h("span", {}, s); })),
      strokes.map(function (s) {
        return h("div", { class: "idc-row" }, h("b", {}, s), structures.map(function (st) {
          return h("span", { class: "idc-cell" }, (ZG.Levels.IDC_MATRIX[s][st] || "").toUpperCase());
        }));
      })
    );

    var examples = h("div", { class: "idc-examples" },
      ZG.Levels.IDC_EXAMPLES.map(function (x) {
        return h("div", { class: "idc-example" },
          h("span", { class: "idc-ex-char" }, x.text),
          h("span", { class: "idc-ex-meta" }, x.stroke + " · " + x.structure),
          h("code", { class: "inline-code" }, x.full)
        );
      })
    );

    S.stageHost.appendChild(h("div", { class: "idc-teach" },
      h("div", { class: "idc-copy" },
        h("h2", {}, "末笔定区，字型定位"),
        h("p", {}, "字根不足四码时，用末笔识别码补最后一码。先看最后一笔的笔画定区（横竖撇捺折），再看字型定位置（左右、上下、杂合）。"),
        h("p", { class: "muted" }, "例：只 = 口 + 八，末笔捺，上下型 → U。"),
        h("div", { class: "idc-calc" },
          h("label", {}, "末笔", selectStroke),
          h("label", {}, "字型", selectStruct),
          result
        )
      ),
      matrix
    ));
    S.stageHost.appendChild(h("h3", { class: "subhead" }, "八个例字"));
    S.stageHost.appendChild(examples);
    S.stageHost.appendChild(h("div", { class: "play-intro-actions" },
      UI.button("完成讲堂", { kind: "primary", onClick: finish }),
      UI.linkButton("去识别码练习", "#/play/4-7", { kind: "ghost" })
    ));
    if (S.keyboard) S.keyboard.setEnabled(false);
    update();
    updateTop();
  }

  /* ---------- 结算 ---------- */

  function finish() {
    if (!S || S.finished) return;
    S.finished = true;
    if (S.detach) { S.detach(); S.detach = null; }
    if (S.timer) { clearTimeout(S.timer); S.timer = null; }
    var def = S.def;
    var isMeta = def.kind === "tour" || def.kind === "idcTutorial";
    var total = S.total;
    var stars = isMeta ? 1 : ZG.Levels.stars({ correct: S.firstTry, total: total, ms: S.ms }, def);
    if (stars > 0) {
      ZG.Progress.markLevel(def.id, stars);
      ZG.Progress.addXp(def.xp || 20);
    }
    if (total > 0 && S.firstTry === total) ZG.Progress.bump("perfectLevels");
    if (total > 0 && S.totalErrors === 0) ZG.Progress.bump("flawless");
    toastAchievements();
    refreshTop();
    if (S.keyboard) S.keyboard.setEnabled(false);
    renderResult(stars, isMeta);
    fillAside("result");
  }

  function renderResult(stars, isMeta) {
    var def = S.def;
    var acc = S.total > 0 ? S.firstTry / S.total : 0;
    var speed = S.ms > 0 ? S.done / (S.ms / 60000) : 0;
    var next = ZG.Levels.next(def.id);
    if (S.timer) { clearTimeout(S.timer); S.timer = null; }
    UI.clear(S.stageHost);
    S.stageHost.appendChild(h("div", { class: "result-card" },
      h("div", { class: "result-seal" }, stars > 0 ? "印" : "再"),
      h("div", { class: "result-title" }, stars > 0 ? (isMeta ? "完成" : "过关") : "再练一次"),
      h("div", { class: "result-stars" }, UI.starsEl(stars), h("span", { class: "result-score" }, stars + " / 3")),
      h("div", { class: "result-stats" },
        UI.stat("首试正确", isMeta ? "—" : UI.pct(acc), { sub: S.firstTry + " / " + S.total }),
        UI.stat("用时", (S.ms / 1000).toFixed(1), { sub: "秒" }),
        UI.stat("速度", isMeta ? "—" : speed.toFixed(1), { sub: "字 / 分" }),
        UI.stat("误键", S.totalErrors, { sub: "次" })
      ),
      S.missed.length ? h("div", { class: "result-errors" },
        h("h3", {}, "错过的字"),
        h("div", { class: "error-list" }, S.missed.slice(0, 12).map(function (x) {
          return h("button", {
            class: "error-chip", type: "button", title: "去沙盒再练",
            onClick: function () { window.location.hash = "#/sandbox?ch=" + encodeURIComponent(x.text); }
          }, h("b", {}, x.text), h("small", {}, x.code || ""));
        }))
      ) : null,
      h("div", { class: "result-actions" },
        UI.button("再练一次", { kind: stars > 0 ? "ghost" : "primary", onClick: restart }),
        next ? UI.button("下一关 · " + next.title, { kind: "primary", onClick: function () { window.location.hash = "#/play/" + next.id; } }) : UI.button("回卷轴", { kind: "primary", onClick: function () { window.location.hash = "#/campaign"; } }),
        UI.linkButton("回卷轴", "#/campaign", { kind: "ghost" })
      )
    ));
  }

  function restart() {
    if (!S) return;
    var id = S.def.id;
    cleanup();
    render(document.querySelector("#screen"), { id: id });
    if (S) start();
  }

  /* ---------- 工具 ---------- */

  function settingsHints() {
    return ZG.Progress.get().settings.hints !== false;
  }

  function fillAside(mode) {
    if (!S) return;
    var wrap = h("div", { class: "aside-stack" });
    var def = S.def;
    if (mode === "result" || S.finished) {
      wrap.appendChild(UI.panel("这一关", h("div", { class: "aside-stats" },
        h("p", {}, def.id + " · " + def.title),
        h("p", {}, "首试 " + S.firstTry + " / " + S.total + " · 误键 " + S.totalErrors)
      )));
    } else {
      wrap.appendChild(UI.panel("规则", h("p", { class: "muted" }, def.rule)));
      wrap.appendChild(UI.panel("提示", h("div", { class: "aside-stats" },
        h("p", {}, "简码按空格；四码自动上屏。"),
        h("p", {}, "打错不中断，连击会断。"),
        h("p", { class: "muted" }, "看答案计错，但仍可继续完成。")
      )));
    }
    UI.setAside(wrap);
  }

  ZG.UI.Play = { render: render, cleanup: cleanup };
})();
