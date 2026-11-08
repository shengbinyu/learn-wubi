/* 字根工坊 · 工坊首页 */
(function () {
  var ZG = window.ZG = window.ZG || {};
  var U = ZG.Util;
  var UI = ZG.UI;
  var h = U.el;

  function firstUnfinished() {
    var defs = ZG.Levels.defs();
    var stars = ZG.Progress.get().stars;
    for (var i = 0; i < defs.length; i++) {
      if (!stars[defs[i].id]) return defs[i];
    }
    return defs[defs.length - 1];
  }

  function continueTarget() {
    var state = ZG.Progress.get();
    var last = state.lastLevel ? ZG.Levels.get(state.lastLevel) : null;
    if (last && (state.stars[last.id] || 0) < 3) return last;
    return firstUnfinished();
  }

  function render(root) {
    var stats = ZG.Progress.stats();
    var state = ZG.Progress.get();
    var target = continueTarget();
    var nextDecor = ZG.Progress.decorDefs.filter(function (d) { return state.decor.indexOf(d.id) === -1; })[0];

    var heroActions = h("div", { class: "hero-actions" },
      UI.button("继续 · " + target.id + " " + target.title, { kind: "primary", onClick: function () { location.hash = "#/play/" + target.id; } }),
      UI.button("去沙盒", { kind: "ghost", onClick: function () { location.hash = "#/sandbox"; } })
    );

    var hero = h("section", { class: "dash-hero" },
      h("div", { class: "hero-copy" },
        h("p", { class: "eyebrow" }, U.fmtDateCN(new Date()) + " · " + (stats.streak ? "连续开坊 " + stats.streak + " 天" : "第一天开坊")),
        h("h1", {}, state.flags.onboarded ? "今日开坊" : "先认二十五个键"),
        h("p", { class: "hero-lead" }, state.flags.onboarded
          ? "把上一次没排完的字排完。先求准，再求快；纸上的字不会催你。"
          : "五笔不是拼音。把字拆成字根，每个字根住在一个键上；二十五个键，五句口诀。"),
        heroActions
      ),
      h("div", { class: "hero-mark" },
        h("div", { class: "hero-rub", "aria-hidden": "true" },
          h("span", { class: "rub-char" }, target.kind === "quizRoot" ? "根" : "字"),
          h("span", { class: "rub-caption" }, "第 " + target.id + " 关 · " + target.title)
        ),
        h("div", { class: "hero-progress" },
          h("span", {}, "卷轴 " + stats.levelsDone + " / " + stats.levelsTotal),
          UI.progressBar(stats.stars, stats.levelsTotal * 3)
        )
      )
    );

    var dailyCard = UI.panel("每日一练", h("div", { class: "daily-card" },
      h("div", { class: "daily-main" },
        h("b", {}, stats.dailyDone ? "今日已开坊" : "十二个字，温故知新"),
        h("span", { class: "muted" }, stats.dailyDone ? "明天再来，火不灭。" : (stats.due ? "有 " + stats.due + " 个字到期，可一起复习。" : "从最近练过的字里抽。"))
      ),
      UI.button(stats.dailyDone ? "再练一遍" : "开始", {
        kind: stats.dailyDone ? "ghost" : "seal",
        onClick: function () { location.hash = "#/review?daily=1"; }
      })
    ), { className: "dash-daily" });

    var dueCard = UI.panel("复习", h("div", { class: "review-teaser" },
      h("div", { class: "teaser-num" }, String(stats.due)),
      h("div", { class: "teaser-copy" },
        h("b", {}, stats.due ? "个字到期" : "暂时没有到期"),
        h("span", { class: "muted" }, stats.due ? "趁墨未干，再过一遍。" : ("下次到期：" + UI.nextDueText(ZG.Progress.nextDueAt())))
      ),
      UI.button(stats.due ? "去复习" : "看字帖", {
        kind: stats.due ? "primary" : "ghost",
        onClick: function () { location.hash = stats.due ? "#/review" : "#/sandbox"; }
      })
    ), { className: "dash-review" });

    var statsStrip = h("div", { class: "stat-strip" },
      UI.stat("已认字", String(stats.learnedChars), { sub: "累计 " + stats.totalCharsTyped + " 次" }),
      UI.stat("已掌握", String(stats.mastered), { sub: "复习盒 5" }),
      UI.stat("首试正确", UI.pct(stats.accuracy), { sub: stats.totalSeen ? "共 " + stats.totalSeen + " 次" : "还没开始" }),
      UI.stat("最高连击", String(stats.bestCombo), { sub: "一次打对" })
    );

    var decor = h("div", { class: "decor-shelf" });
    ZG.Progress.decorDefs.forEach(function (d) {
      var owned = state.decor.indexOf(d.id) !== -1;
      decor.appendChild(h("div", { class: "decor-item" + (owned ? " is-owned" : ""), title: d.desc },
        h("span", { class: "decor-seal" }, d.seal),
        h("span", { class: "decor-name" }, d.name),
        h("small", {}, owned ? "已置" : d.at + " 星")
      ));
    });
    var decorPanel = UI.panel("工坊摆设", decor, {
      extra: nextDecor
        ? h("span", { class: "panel-extra" }, "还差 " + Math.max(0, nextDecor.at - stats.stars) + " 星 · " + nextDecor.name)
        : h("span", { class: "panel-extra" }, "已置满")
    });

    var recent = h("div", { class: "recent-wall" });
    if (state.recent.length) {
      state.recent.forEach(function (r) {
        recent.appendChild(UI.CharCard.render(r.text, { compact: true, clickable: true, mastery: r.box, onClick: function () { location.hash = "#/sandbox?ch=" + encodeURIComponent(r.text); } }));
      });
    } else {
      recent.appendChild(UI.empty("还没有拓印的字。去沙盒敲一个「明」试试。", {
        seal: "印",
        action: UI.button("去沙盒", { kind: "ghost", onClick: function () { location.hash = "#/sandbox"; } })
      }));
    }

    var lower = h("div", { class: "dash-grid" },
      h("div", { class: "dash-col" }, dailyCard, dueCard, statsStrip),
      h("div", { class: "dash-col" }, decorPanel,
        UI.panel("最近的字", recent, {
          extra: h("a", { class: "panel-link", href: "#/sandbox" }, "去沙盒")
        })
      )
    );

    var page = h("div", { class: "page page-dashboard" },
      UI.pageHead({
        seal: "坊", title: "字根工坊", sub: "五笔 86 · 把字拆开，再装回键位",
        actions: [
          h("a", { class: "btn btn-ghost", href: "#/campaign" }, "看卷轴"),
          h("a", { class: "btn btn-seal", href: "#/sandbox" }, "开沙盒")
        ]
      }),
      hero,
      lower
    );

    UI.mount(root, page);
    UI.setAside(h("div", { class: "aside-stack" },
      UI.panel("五区", UI.zonesLegend()),
      UI.panel("码表", h("div", { class: "meta-list" },
        h("div", {}, h("span", {}, "单字"), h("b", {}, String(ZG.Dict.meta().charCount))),
        h("div", {}, h("span", {}, "词组"), h("b", {}, String(ZG.Dict.meta().wordCount))),
        h("div", {}, h("span", {}, "二级简码池"), h("b", {}, String(ZG.Dict.pools().c2.length)))
      )),
      UI.panel("小笺", h("div", { class: "note-card" },
        h("p", {}, "简码打完要按空格；四码会自动上屏。"),
        h("p", {}, "打错了不要紧，退一格，重新排。")
      ))
    ));
  }

  UI.Dashboard = { render: render };
})();
