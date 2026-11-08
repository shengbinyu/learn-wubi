/* 字根工坊 · 复习（SRS） */
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

  function isDaily(params) {
    if (params && (params.daily === "1" || params.daily === true)) return true;
    return /[?&]daily=1/.test(window.location.hash);
  }

  function pickDaily(due) {
    var items = due.slice(0, 12);
    if (items.length >= 12) return U.shuffle(items);
    var seen = {};
    items.forEach(function (x) { seen[x.text] = true; });
    var recent = ZG.Progress.get().recent || [];
    recent.forEach(function (r) {
      if (items.length >= 12 || seen[r.text]) return;
      if (!ZG.Dict.has(r.text)) return;
      seen[r.text] = true;
      items.push({ text: r.text, kind: "char", codes: ZG.Dict.codesOf(r.text), box: r.box || 1, due: Date.now() });
    });
    var pool = ZG.Dict.pools().c2;
    var shuffled = U.shuffle(pool);
    for (var i = 0; i < shuffled.length && items.length < 12; i++) {
      if (seen[shuffled[i]]) continue;
      seen[shuffled[i]] = true;
      items.push({ text: shuffled[i], kind: "char", codes: ZG.Dict.codesOf(shuffled[i]), box: 1, due: Date.now() });
    }
    return U.shuffle(items);
  }

  function render(root, params) {
    cleanup();
    var daily = isDaily(params);
    var due = ZG.Progress.due(60);
    var stats = ZG.Progress.stats();
    S = { daily: daily, due: due, session: false, items: [], idx: 0, done: 0, firstTry: 0, ms: 0, missed: [], finished: false };

    var startItems = daily ? pickDaily(due) : due.slice(0, 12);
    var queue = h("div", { class: "due-list" });
    (due.length ? due.slice(0, 20) : []).forEach(function (item) {
      queue.appendChild(h("button", {
        class: "due-item", type: "button", title: "去沙盒看「" + item.text + "」",
        onClick: function () { window.location.hash = "#/sandbox?ch=" + encodeURIComponent(item.text); }
      },
        h("span", { class: "due-char" }, item.text),
        h("span", { class: "due-meta" }, h("b", {}, "盒 " + item.box), h("small", {}, "到期")),
        h("code", { class: "inline-code" }, (item.codes && item.codes[0]) || "")
      ));
    });
    if (!due.length) queue.appendChild(h("p", { class: "muted" }, "没有到期的字。去沙盒打几个新字，它们会自动进入复习。"));

    var body = h("div", { class: "review" },
      h("div", { class: "review-stats" },
        UI.stat("到期", due.length, { sub: "字 / 词" }),
        UI.stat("已掌握", stats.mastered, { sub: "盒 5" }),
        UI.stat("连续", stats.streak, { sub: "天" }),
        UI.stat("下次", UI.nextDueText(ZG.Progress.nextDueAt()), {})
      ),
      h("div", { class: "review-grid" },
        UI.panel("复习队列", queue, { className: "review-queue" }),
        h("div", { class: "review-card panel" },
          h("div", { class: "panel-body" },
            h("div", { class: "review-seal seal" }, daily ? "每" : "复"),
            h("h2", {}, daily ? "每日一练" : "按盒复习"),
            h("p", { class: "muted" }, daily ? "每天一组，十二个字；完成后记连续天数。" : "到期就复习。答对升一盒，答错回第一盒。"),
            h("div", { class: "review-boxes" },
              h("span", {}, "10 分钟"), h("span", {}, "1 天"), h("span", {}, "3 天"), h("span", {}, "7 天"), h("span", {}, "21 天")
            ),
            h("p", { class: "review-count" }, "这一组 " + startItems.length + " 个"),
            UI.button(startItems.length ? (daily ? "开始每日一练" : "开始复习") : "去沙盒练新字", {
              kind: "primary",
              onClick: function () {
                if (!startItems.length) { window.location.hash = "#/sandbox"; return; }
                startSession(startItems, daily);
              }
            })
          )
        )
      )
    );

    var page = h("div", { class: "page page-review" },
      UI.pageHead({
        seal: daily ? "每" : "复",
        title: daily ? "每日一练" : "复习",
        sub: daily ? "十二个字 · 保持手感" : "间隔重复 · 把字留在手里",
        actions: [
          UI.linkButton("自由沙盒", "#/sandbox", { kind: "ghost" }),
          UI.linkButton("回工坊", "#/", { kind: "ghost" })
        ]
      }),
      body
    );
    UI.mount(root, page);
    fillAside();
    S.startItems = startItems;
    if (ZG.App && ZG.App.setCleanup) ZG.App.setCleanup(cleanup);
  }

  function startSession(items, daily) {
    if (!items || !items.length) return;
    S.session = true;
    S.daily = !!daily;
    S.items = items.slice(0, 12);
    S.idx = 0;
    S.done = 0;
    S.firstTry = 0;
    S.ms = 0;
    S.missed = [];
    S.finished = false;
    buildSession();
    renderReviewItem();
  }

  function buildSession() {
    var top = h("div", { class: "review-bar" });
    var stage = h("div", { class: "play-stage-host" });
    var keyboardHost = h("div", { class: "keyboard-wrap" });
    var page = h("div", { class: "page page-review" },
      UI.pageHead({
        seal: S.daily ? "每" : "复",
        title: S.daily ? "每日一练" : "复习",
        sub: "第 " + Math.min(S.idx + 1, S.items.length) + " / " + S.items.length + " 个",
        actions: [UI.button("结束", { kind: "ghost", onClick: function () { finishSession(false); } })]
      }),
      top, stage, keyboardHost
    );
    UI.mount(document.querySelector("#screen"), page);
    S.topHost = top;
    S.stageHost = stage;
    S.keyboard = UI.Keyboard.create({ onVirtual: function (k) { if (S.engine) S.engine.press(k); } });
    keyboardHost.appendChild(S.keyboard.root);
    S.detach = UI.Keyboard.attachTyping({
      onLetter: function (k) { if (S && S.engine) S.engine.press(k); },
      onSpace: function () { if (S && S.engine) S.engine.space(); },
      onBackspace: function () { if (S && S.engine) S.engine.backspace(); },
      onEscape: function () { if (S && S.engine) S.engine.backspace(); }
    });
    updateTop();
  }

  function updateTop() {
    if (!S || !S.topHost) return;
    UI.clear(S.topHost);
    S.topHost.appendChild(h("div", { class: "review-bar-main" },
      h("span", {}, "第 " + Math.min(S.idx + 1, S.items.length) + " / " + S.items.length + " 个"),
      h("span", {}, "首试 " + S.firstTry)
    ));
    S.topHost.appendChild(UI.progressBar(S.done, S.items.length, { className: "review-progress" }));
  }

  function renderReviewItem() {
    if (!S || S.finished) return;
    if (S.idx >= S.items.length) { finishSession(true); return; }
    var item = S.items[S.idx];
    S.engine = ZG.Engine.create({
      text: item.text,
      kind: item.kind === "word" ? "word" : "char",
      codes: item.codes && item.codes.length ? item.codes : ZG.Dict.codesOf(item.text),
      strictLen: 0,
      autoSpace: false
    });
    var eng = S.engine;
    eng.on("update", function () { if (S && S.engine === eng) updateReviewUI(); });
    eng.on("error", function (data) {
      if (!S || S.engine !== eng) return;
      ZG.Progress.recordKey(data.key, false, 0);
      ZG.Audio.play("error");
      if (S.keyboard && data.key) S.keyboard.flash(data.key, "bad");
      updateReviewUI();
    });
    eng.on("reveal", function () {
      if (!S || S.engine !== eng) return;
      ZG.Audio.play("page");
      updateReviewUI();
    });
    eng.on("complete", function (res) {
      if (!S || S.engine !== eng) return;
      ZG.Progress.record(item.text, item.kind === "word" ? "word" : "char", res.firstTry, res.ms);
      S.done += 1;
      S.ms += res.ms;
      if (res.firstTry) S.firstTry += 1;
      else S.missed.push({ text: item.text, code: res.usedCode || (item.codes && item.codes[0]) || "" });
      ZG.Audio.play(res.firstTry ? "ok" : "page");
      updateTop();
      S.idx += 1;
      if (S.idx >= S.items.length) {
        finishSession(true);
      } else {
        S.timer = setTimeout(function () { if (S && S.session) renderReviewItem(); }, 180);
      }
    });

    UI.clear(S.stageHost);
    var row = h("div", { class: "sandbox-char-row" });
    row.appendChild(UI.CharCard.render(item.text, { codes: item.codes || ZG.Dict.codesOf(item.text) }));
    var box = S.done + 1;
    row.appendChild(h("div", { class: "sandbox-facts" },
      h("div", { class: "fact-line" }, h("span", {}, "盒"), h("b", {}, "第 " + (item.box || 1) + " 盒")),
      h("div", { class: "fact-line" }, h("span", {}, "编码"), UI.codeChips(item.codes || ZG.Dict.codesOf(item.text), { text: item.text }))
    ));
    S.stageHost.appendChild(row);
    S.stickHost = h("div", { class: "stick-host" });
    S.hintHost = h("div", { class: "hint-host" });
    S.actionHost = h("div", { class: "sandbox-actions" });
    S.stageHost.appendChild(S.stickHost);
    S.stageHost.appendChild(S.hintHost);
    S.stageHost.appendChild(S.actionHost);
    S.actionHost.appendChild(UI.button("看答案", { kind: "seal", onClick: function () { if (S && S.engine) S.engine.reveal(); } }));
    S.actionHost.appendChild(UI.button("跳过", { kind: "ghost", onClick: function () { if (S && S.engine) S.engine.reveal(); } }));
    updateReviewUI();
    updateTop();
    if (S.keyboard) S.keyboard.setEnabled(true);
  }

  function updateReviewUI() {
    if (!S || !S.engine) return;
    var item = S.items[S.idx];
    if (!item) return;
    var eng = S.engine;
    var hint = UI.CharCard.hintFor(item.text, eng.state.buffer, 0);
    if (S.stickHost) {
      UI.clear(S.stickHost);
      S.stickHost.appendChild(UI.CharCard.stick(hint.code || (item.codes && item.codes[0]) || "", eng.state.buffer, { showSpace: eng.state.buffer.length < 4, done: eng.state.done }));
    }
    if (S.hintHost) {
      UI.clear(S.hintHost);
      if (ZG.Progress.get().settings.hints && !eng.state.done) S.hintHost.appendChild(UI.CharCard.hintLine(item.text, eng.state.buffer, 0));
    }
    if (S.keyboard) {
      if (ZG.Progress.get().settings.hints && !eng.state.done && hint.key !== " ") S.keyboard.setHint(hint.key);
      else S.keyboard.clearHint();
    }
    if (eng.state.done) {
      var card = S.stageHost.querySelector(".char-card");
      if (card) card.classList.add("is-printed");
    }
  }

  function finishSession(completed) {
    if (!S || S.finished) return;
    var wasDaily = !!S.daily;
    S.finished = true;
    if (S.detach) { S.detach(); S.detach = null; }
    if (S.timer) { clearTimeout(S.timer); S.timer = null; }
    var correct = S.firstTry;
    var total = S.items.length;
    if (S.daily && completed && S.done >= total) {
      var newly = ZG.Progress.completeDaily();
      if (newly) UI.toast("今日开坊 · 连续 " + ZG.Progress.get().daily.streak + " 天", "seal", 3000);
    }
    ZG.Progress.addXp(Math.round(correct * 8));
    var gained = ZG.Progress.checkAchievements() || [];
    gained.forEach(function (a) { UI.toast("成就 · " + a.title, "seal", 3200); });
    refreshTop();
    if (S.keyboard) S.keyboard.setEnabled(false);
    var top = document.querySelector(".page-review .play-top, .page-review .review-bar");
    if (top) top.style.display = "none";
    UI.clear(S.stageHost);
    S.stageHost.appendChild(h("div", { class: "result-card" },
      h("div", { class: "result-seal" }, completed ? "印" : "止"),
      h("div", { class: "result-title" }, completed ? "这一组复习完了" : "先到这里"),
      h("div", { class: "result-stats" },
        UI.stat("完成", S.done + " / " + total, { sub: "个" }),
        UI.stat("首试", UI.pct(total ? correct / total : 0), { sub: correct + " / " + total }),
        UI.stat("用时", (S.ms / 1000).toFixed(1), { sub: "秒" })
      ),
      S.missed.length ? h("div", { class: "result-errors" },
        h("h3", {}, "还要再看一眼"),
        h("div", { class: "error-list" }, S.missed.slice(0, 12).map(function (x) {
          return h("button", { class: "error-chip", type: "button", onClick: function () { window.location.hash = "#/sandbox?ch=" + encodeURIComponent(x.text); } },
            h("b", {}, x.text), h("small", {}, x.code || ""));
        }))
      ) : null,
      h("div", { class: "result-actions" },
        UI.button("再来一组", { kind: "primary", onClick: function () { cleanup(); render(document.querySelector("#screen"), { daily: wasDaily ? "1" : "" }); } }),
        UI.linkButton("回工坊", "#/", { kind: "ghost" }),
        UI.linkButton("沙盒", "#/sandbox", { kind: "ghost" })
      )
    ));
    fillAside("result");
  }

  function fillAside(mode) {
    var wrap = h("div", { class: "aside-stack" });
    if (mode === "result") {
      wrap.appendChild(UI.panel("复习", h("p", { class: "muted" }, "答对升一盒，答错回第一盒。盒 5 视为已掌握。")));
    } else {
      wrap.appendChild(UI.panel("间隔", h("div", { class: "aside-stats" },
        h("p", {}, "10 分钟 → 1 天 → 3 天 → 7 天 → 21 天"),
        h("p", { class: "muted" }, "不追速度，先让编码在手里过一遍。")
      )));
      wrap.appendChild(UI.panel("今日", h("div", { class: "aside-stats" },
        h("p", {}, "连续 " + ZG.Progress.stats().streak + " 天"),
        h("p", {}, "已完成 " + (ZG.Progress.stats().dailyDone ? "是" : "否")),
        h("p", { class: "muted" }, "每日一练完成才计连续。")
      )));
    }
    UI.setAside(wrap);
  }

  ZG.UI.Review = { render: render, cleanup: cleanup };
})();
