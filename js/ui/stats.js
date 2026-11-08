/* 字根工坊 · 统计 */
(function () {
  var ZG = window.ZG = window.ZG || {};
  var U = ZG.Util;
  var UI = ZG.UI;
  var h = U.el;

  function cleanup() { /* no listeners */ }

  function heatLevel(n) {
    if (!n) return 0;
    if (n <= 2) return 1;
    if (n <= 5) return 2;
    if (n <= 9) return 3;
    return 4;
  }

  function buildHeatmap(days) {
    days = days || {};
    var wrap = h("div", { class: "heatmap-wrap" });
    var grid = h("div", { class: "heatmap", role: "img", "aria-label": "最近十二周练习热力图" });
    for (var i = 83; i >= 0; i--) {
      var key = U.dateKeyOffset(-i);
      var n = days[key] || 0;
      grid.appendChild(h("div", {
        class: "heat-cell heat-lv-" + heatLevel(n),
        title: U.fmtDateCN(key) + " · " + n + " 个",
        "data-count": n
      }));
    }
    wrap.appendChild(grid);
    var legend = h("div", { class: "heat-legend" },
      h("span", {}, "少"),
      [0, 1, 2, 3, 4].map(function (lv) { return h("i", { class: "heat-cell heat-lv-" + lv }); }),
      h("span", {}, "多")
    );
    wrap.appendChild(legend);
    return wrap;
  }

  function buildAchievements() {
    var earned = ZG.Progress.get().achievements || {};
    var wall = h("div", { class: "achievement-wall" });
    (ZG.Progress.achievementDefs || []).forEach(function (a) {
      var has = !!earned[a.id];
      wall.appendChild(h("div", { class: "ach-card" + (has ? " is-earned" : " is-locked"), title: a.desc },
        h("div", { class: "ach-seal" }, a.seal || "印"),
        h("b", {}, a.title),
        h("p", {}, a.desc),
        has ? h("small", {}, "已得") : h("small", { class: "muted" }, "未得")
      ));
    });
    return wall;
  }

  function buildChapterProgress() {
    var list = h("div", { class: "chapter-progress" });
    var chapters = window.ZG_CHAPTERS || [];
    var defs = window.ZG_LESSON_DEFS || [];
    var stars = ZG.Progress.get().stars || {};
    chapters.forEach(function (ch) {
      var levels = defs.filter(function (d) { return d.chapter === ch.id; });
      var got = levels.reduce(function (n, d) { return n + (stars[d.id] || 0); }, 0);
      var max = levels.length * 3;
      list.appendChild(h("div", { class: "chapter-row" },
        h("span", { class: "chapter-seal seal" }, ch.seal || ch.id),
        h("div", { class: "chapter-main" },
          h("div", { class: "chapter-line" }, h("b", {}, ch.title), h("small", {}, levels.length + " 关")),
          UI.progressBar(got, max, { className: "chapter-bar" })
        ),
        h("span", { class: "chapter-stars" }, got + " / " + max)
      ));
    });
    return list;
  }

  function render(root, params) {
    var st = ZG.Progress.stats();
    var state = ZG.Progress.get();
    var page = h("div", { class: "page page-stats" },
      UI.pageHead({
        seal: "统", title: "统计", sub: "看得见的进步 · 也在字外",
        actions: [
          UI.linkButton("设置", "#/settings", { kind: "ghost" }),
          UI.linkButton("回工坊", "#/", { kind: "ghost" })
        ]
      }),
      h("div", { class: "stats-grid" },
        UI.stat("经验", U.fmtNum(st.xp), { sub: "XP" }),
        UI.stat("首试正确率", UI.pct(st.accuracy), { sub: st.totalOk + " / " + st.totalSeen }),
        UI.stat("打字速度", st.avgSpeed ? st.avgSpeed.toFixed(1) : "—", { sub: "字 / 分" }),
        UI.stat("已掌握", st.mastered, { sub: "盒 5" }),
        UI.stat("学过", st.learnedChars + st.learnedWords, { sub: "字 + 词" }),
        UI.stat("通关", st.levelsDone + " / " + st.levelsTotal, { sub: "关" }),
        UI.stat("最高连击", st.bestCombo, { sub: "个" }),
        UI.stat("连续", st.streak, { sub: "天" })
      ),
      h("div", { class: "stats-columns" },
        UI.panel("十二周", buildHeatmap(st.days), { className: "stats-panel" }),
        UI.panel("卷轴", buildChapterProgress(), { className: "stats-panel" })
      ),
      UI.panel("成就墙", buildAchievements(), { className: "stats-panel" }),
      state.wrongQueue && state.wrongQueue.length ? UI.panel("待再看", h("div", { class: "result-rows" },
        state.wrongQueue.slice(0, 8).map(function (w) {
          return h("button", { class: "error-chip", type: "button", onClick: function () { window.location.hash = "#/sandbox?ch=" + encodeURIComponent(w.text); } },
            h("b", {}, w.text), h("small", {}, w.code || ""), h("span", { class: "muted" }, w.kind === "word" ? "词" : "字")
          );
        })
      ), { className: "stats-panel" }) : null
    );
    UI.mount(root, page);
    fillAside(st, state);
    if (ZG.App && ZG.App.setCleanup) ZG.App.setCleanup(cleanup);
  }

  function fillAside(st, state) {
    var wrap = h("div", { class: "aside-stack" });
    var decor = h("div", { class: "decor-shelf" });
    (ZG.Progress.decorDefs || []).forEach(function (d) {
      var has = state.decor.indexOf(d.id) !== -1;
      decor.appendChild(h("div", { class: "decor-item" + (has ? " is-owned" : ""), title: d.desc },
        h("span", { class: "decor-seal seal" }, d.seal || "物"),
        h("small", {}, d.name)
      ));
    });
    wrap.appendChild(UI.panel("工坊摆设", decor, { className: "aside-panel" }));
    wrap.appendChild(UI.panel("今日", h("div", { class: "aside-stats" },
      h("p", {}, "今日 " + st.todayCount + " 个"),
      h("p", {}, "最长连续 " + st.bestStreak + " 天"),
      h("p", {}, "待复习 " + st.due + " 个")
    ), { className: "aside-panel" }));
    wrap.appendChild(UI.panel("说明", h("p", { class: "muted" }, "正确率按每个字的首试计；重打不会抹掉错字记录。" ), { className: "aside-panel" }));
    UI.setAside(wrap);
  }

  ZG.UI.Stats = { render: render, cleanup: cleanup };
})();
