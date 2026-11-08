/* 字根工坊 · 卷轴 / 闯关目录 */
(function () {
  var ZG = window.ZG = window.ZG || {};
  var U = ZG.Util;
  var UI = ZG.UI;
  var h = U.el;

  function levelStars(id) { return ZG.Progress.get().stars[id] || 0; }

  function currentId() {
    var defs = ZG.Levels.defs();
    var last = ZG.Progress.get().lastLevel;
    if (last) {
      var i = defs.findIndex(function (d) { return d.id === last; });
      if (i >= 0 && i < defs.length - 1) return defs[i + 1].id;
    }
    for (var j = 0; j < defs.length; j++) {
      if (levelStars(defs[j].id) === 0) return defs[j].id;
    }
    return defs.length ? defs[defs.length - 1].id : "0-1";
  }

  function render(root) {
    var defs = ZG.Levels.defs();
    var chapters = ZG.Levels.chapters();
    var nextId = currentId();
    var starsMap = ZG.Progress.get().stars || {};
    var totalStars = ZG.Levels.totalStars();
    var cleared = defs.filter(function (d) { return (starsMap[d.id] || 0) > 0; }).length;
    var nextDef = ZG.Levels.get(nextId);

    var summary = h("div", { class: "campaign-summary" },
      UI.stat("通关", cleared + " / " + defs.length, { sub: "关" }),
      UI.stat("总星", totalStars, { sub: "满星 " + defs.length * 3 }),
      UI.stat("下一关", nextDef ? nextDef.title : "—", { sub: nextDef ? nextDef.id : "" }),
      h("div", { class: "campaign-progress" },
        UI.progressBar(cleared, defs.length),
        h("p", { class: "muted" }, "不硬锁关：想跳着练也行，卷轴只给推荐顺序。")
      )
    );

    var campaign = h("div", { class: "campaign" }, summary);

    chapters.forEach(function (ch) {
      var list = defs.filter(function (d) { return d.chapterIndex === ch.index || d.chapter === ch.id; });
      var chStars = list.reduce(function (n, d) { return n + (starsMap[d.id] || 0); }, 0);
      var chDone = list.filter(function (d) { return (starsMap[d.id] || 0) > 0; }).length;
      var chapter = h("section", { class: "chapter" + (ch.id === (nextDef && nextDef.chapter) ? " is-current" : "") },
        h("header", { class: "chapter-head" },
          h("div", { class: "chapter-seal seal" }, ch.seal || ch.id),
          h("div", { class: "chapter-title-wrap" },
            h("h2", { class: "chapter-title" }, ch.title),
            h("p", { class: "chapter-sub" }, ch.sub)
          ),
          h("div", { class: "chapter-meta" },
            h("span", {}, chDone + " / " + list.length + " 关"),
            h("span", { class: "chapter-stars" }, "★ " + chStars + " / " + list.length * 3)
          )
        ),
        h("div", { class: "level-grid" }, list.map(function (d) { return medal(d, nextId); }))
      );
      campaign.appendChild(chapter);
    });

    campaign.appendChild(h("p", { class: "campaign-foot muted" },
      "星级只看首试正确率与节奏：1★ 完成，2★ 准确 92% 且 3 秒内，3★ 准确 98% 且 2 秒内。跟打按字/分。"
    ));

    var page = h("div", { class: "page page-campaign" },
      UI.pageHead({
        seal: "卷", title: "卷轴", sub: "序 + 六卷 · 三十三关",
        actions: [
          nextDef ? UI.button("继续 · " + nextDef.title, { kind: "primary", onClick: function () { go(nextId); } }) : null,
          UI.linkButton("自由沙盒", "#/sandbox", { kind: "ghost" })
        ]
      }),
      campaign
    );
    UI.mount(root, page);
    fillAside(nextDef, nextId);
    if (ZG.App && ZG.App.setCleanup) ZG.App.setCleanup(null);
  }

  function medal(def, nextId) {
    var stars = levelStars(def.id);
    var isNext = def.id === nextId;
    var done = stars > 0;
    var cls = "level-medal" + (done ? " is-done" : "") + (isNext ? " is-current is-next" : "");
    var label = h("button", {
      class: cls, type: "button",
      title: def.title + " · " + def.subtitle,
      "aria-label": def.id + " " + def.title + "，星级 " + stars + " / 3",
      onClick: function () { go(def.id); }
    },
      h("span", { class: "medal-top" },
        h("span", { class: "medal-id" }, def.id),
        h("span", { class: "medal-badge" }, def.kind === "passage" ? "跟打" : def.kind === "idcTutorial" ? "讲堂" : def.kind === "tour" ? "导览" : def.kind === "quizZone" || def.kind === "quizRoot" || def.kind === "keyIntro" ? "小测" : "四码")
      ),
      h("span", { class: "medal-title" }, def.title),
      h("span", { class: "medal-sub" }, def.subtitle),
      h("span", { class: "medal-stars" }, UI.starsEl(stars), isNext ? h("em", { class: "medal-next" }, "继续") : null)
    );
    return label;
  }

  function go(id) { window.location.hash = "#/play/" + id; }

  function fillAside(nextDef, nextId) {
    var wrap = h("div", { class: "aside-stack" });
    if (nextDef) {
      wrap.appendChild(UI.panel("下一关",
        h("div", { class: "aside-next" },
          h("div", { class: "aside-next-id" }, nextId),
          h("h3", {}, nextDef.title),
          h("p", { class: "muted" }, nextDef.subtitle),
          h("p", {}, nextDef.intro),
          UI.button("开始", { kind: "primary", onClick: function () { go(nextId); } })
        )
      ));
    }
    wrap.appendChild(UI.panel("怎么玩", h("div", { class: "aside-stats" },
      h("p", {}, "每关 8~16 个目标，打完结算。"),
      h("p", {}, "简码按空格，全码自动上屏。"),
      h("p", { class: "muted" }, "打错不中断；两次错误后会给正确键提示。")
    )));
    wrap.appendChild(UI.panel("卷末", h("p", { class: "muted" }, "卷六是短文跟打。通关后回沙盒，把学过的字继续练熟。")));
    UI.setAside(wrap);
  }

  ZG.UI.Campaign = { render: render };
})();
